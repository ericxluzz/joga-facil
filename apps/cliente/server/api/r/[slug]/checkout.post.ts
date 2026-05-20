// POST /api/r/[slug]/checkout
//   - pix_upfront: cobra 100% online + taxa da plataforma
//   - deposit_plus_on_site: cobra sinal online + taxa; restante fica para a chegada
import { getTenantBySlug } from '../../../utils/tenant';
import { createSupabaseAdmin, mapBooking } from '../../../utils/supabase-admin';
import {
  calculateCheckoutAmounts,
  getPaymentProvider,
  getProviderAccountId,
  normalizeCheckoutMethod,
} from '../../../utils/payments/checkout';
import { createProviderPixCharge } from '../../../utils/payments/provider';

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  if (!slug) throw createError({ statusCode: 400, message: 'slug obrigatorio' });

  const tenant = await getTenantBySlug(slug);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento nao encontrado' });

  const body = await readBody(event);
  const bookingIds: string[] = body.bookingIds || (body.holdId ? [body.holdId] : []);
  if (bookingIds.length === 0) {
    throw createError({ statusCode: 400, message: 'bookingIds obrigatorios' });
  }

  const admin = createSupabaseAdmin();
  const now = new Date();
  const method = normalizeCheckoutMethod(body.method);

  const { data: targetBookingRows, error: fetchError } = await admin
    .from('bookings')
    .select('*')
    .eq('tenant_id', tenant.id)
    .in('id', bookingIds);

  if (fetchError) throw createError({ statusCode: 500, message: fetchError.message });
  const targetBookings = (targetBookingRows || []).map(mapBooking);

  if (targetBookings.length !== bookingIds.length) {
    throw createError({ statusCode: 404, message: 'Reservas nao encontradas' });
  }
  if (targetBookings.some((b) => b.status !== 'hold')) {
    throw createError({ statusCode: 409, message: 'Reserva nao esta mais aguardando pagamento' });
  }
  if (targetBookings.some((b) => b.expiresAt && b.expiresAt < now)) {
    throw createError({ statusCode: 410, message: 'O tempo do carrinho expirou. Selecione novamente.' });
  }

  const totalCents = targetBookings.reduce((sum, b) => sum + b.totalCents, 0);
  const customer = targetBookings[0]!;
  const settings = tenant.settings || {};
  const amounts = calculateCheckoutAmounts(totalCents, targetBookings.length, method, settings);
  const provider = getPaymentProvider(settings);
  const providerAccountId = getProviderAccountId(provider, settings);

  if (provider === 'validapay' && !providerAccountId) {
    throw createError({
      statusCode: 409,
      message: 'Conta ValidaPay do estabelecimento ainda nao configurada.',
    });
  }

  const charge = await createProviderPixCharge({
    provider,
    providerAccountId,
    amountCents: amounts.dueNowCents,
    sellerAmountCents: amounts.sellerAmountCents,
    platformFeeCents: amounts.platformFeeCents,
    dueOnSiteCents: amounts.dueOnSiteCents,
    expiresInSeconds: 15 * 60,
    description:
      method === 'deposit_plus_on_site'
        ? `${tenant.name} - sinal de reserva + taxa`
        : `${tenant.name} - ${bookingIds.length} reserva${bookingIds.length > 1 ? 's' : ''}`,
    customer: {
      name: customer.customerName,
      phone: customer.customerPhone,
      email: customer.customerEmail || undefined,
    },
    metadata: {
      tenantId: tenant.id,
      slug: tenant.slug,
      bookingIds: bookingIds.join(','),
      method,
      totalCents,
      sellerAmountCents: amounts.sellerAmountCents,
      platformFeeCents: amounts.platformFeeCents,
      dueOnSiteCents: amounts.dueOnSiteCents,
    },
  });

  // Atualiza paymentMethod em cada booking
  await admin
    .from('bookings')
    .update({ payment_method: method, updated_at: now.toISOString() })
    .eq('tenant_id', tenant.id)
    .in('id', bookingIds);

  // Insere payments
  const feeBase = Math.floor(amounts.platformFeeCents / targetBookings.length);
  let feeRemainder = amounts.platformFeeCents - feeBase * targetBookings.length;
  const depositMultiplier = method === 'deposit_plus_on_site' ? amounts.depositPercentage / 100 : 1;

  const paymentsToInsert = targetBookings.map((booking) => {
    const platformFeeCents = feeBase + (feeRemainder-- > 0 ? 1 : 0);
    const sellerAmountCents = Math.round(booking.totalCents * depositMultiplier);
    return {
      booking_id: booking.id,
      provider: charge.provider,
      provider_payment_id: charge.providerPaymentId,
      provider_account_id: charge.providerAccountId,
      amount_cents: sellerAmountCents + platformFeeCents,
      seller_amount_cents: sellerAmountCents,
      platform_fee_cents: platformFeeCents,
      due_on_site_cents: Math.max(booking.totalCents - sellerAmountCents, 0),
      status: charge.status,
      pix_qr_code: charge.pixQrCode ?? null,
      pix_copia_cola: charge.pixCopiaCola ?? null,
      expires_at: charge.expiresAt?.toISOString() ?? null,
      raw_payload: charge.rawPayload,
    };
  });

  await admin.from('payments').insert(paymentsToInsert);

  return {
    method,
    provider,
    paymentId: charge.providerPaymentId,
    bookingIds,
    pixQrCode: charge.pixQrCode,
    pixCopiaCola: charge.pixCopiaCola,
    amountCents: charge.amountCents,
    totalCents: amounts.totalCents,
    sellerAmountCents: amounts.sellerAmountCents,
    platformFeeCents: amounts.platformFeeCents,
    dueOnSiteCents: amounts.dueOnSiteCents,
    expiresAt: charge.expiresAt?.toISOString() ?? null,
    slug,
  };
});
