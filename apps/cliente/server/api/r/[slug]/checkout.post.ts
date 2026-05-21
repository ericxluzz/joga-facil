// POST /api/r/[slug]/checkout
//   - pix_upfront: cobra 100% online + taxa da plataforma
//   - deposit_plus_on_site: cobra sinal online + taxa; restante fica para a chegada
import { getTenantBySlug } from '../../../utils/tenant';
import { createSupabaseAdmin, mapBooking } from '../../../utils/supabase-admin';
import { calculateCheckoutAmounts, normalizeCheckoutMethod } from '@agendaslim/core';
import { getValidapayAccountNumber } from '../../../utils/payments/checkout';
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

  // Bookings fetch e account lookup rodam em paralelo — ambos independentes entre si
  const [{ data: targetBookingRows, error: fetchError }, providerAccountId] = await Promise.all([
    admin
      .from('bookings')
      .select('id, tenant_id, resource_id, service_id, customer_id, customer_name, customer_phone, customer_email, starts_at, ends_at, total_cents, status, payment_method, expires_at, customer_notes, created_at, updated_at, confirmed_at, cancelled_at')
      .eq('tenant_id', tenant.id)
      .in('id', bookingIds),
    getValidapayAccountNumber(tenant.id, admin),
  ]);

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
  const settings = tenant.settings || {};
  let amounts;
  try {
    amounts = calculateCheckoutAmounts(totalCents, targetBookings.length, method, settings, {
      platformFeeCents: process.env.PLATFORM_FEE_CENTS,
      depositPercentage: process.env.DEPOSIT_PERCENTAGE,
    });
  } catch (err: any) {
    throw createError({ statusCode: 422, message: err?.message || 'Valor insuficiente para cobrar taxa da plataforma.' });
  }

  // Dev: PIX simulado (integral ou sinal 50% + restante na chegada)
  if (process.env.MOCK_PAYMENTS === '1') {
    const mockPaymentId = `mock_${crypto.randomUUID()}`;
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const mockCopiaCola = '00020126580014BR.GOV.BCB.PIX0136MOCK-PAYMENT-DEV';
    const depositMultiplier = method === 'deposit_plus_on_site' ? amounts.depositPercentage / 100 : 1;

    await admin
      .from('bookings')
      .update({ payment_method: method, updated_at: now.toISOString() })
      .eq('tenant_id', tenant.id)
      .in('id', bookingIds);

    const feeBase = Math.floor(amounts.platformFeeCents / targetBookings.length);
    let feeRemainder = amounts.platformFeeCents - feeBase * targetBookings.length;
    const paymentsToInsert = targetBookings.map((booking) => {
      const platformFeeCents = feeBase + (feeRemainder-- > 0 ? 1 : 0);
      const sellerAmountCents = Math.round(booking.totalCents * depositMultiplier);
      return {
        booking_id: booking.id,
        provider: 'validapay',
        provider_payment_id: mockPaymentId,
        provider_account_id: null,
        amount_cents: sellerAmountCents + platformFeeCents,
        seller_amount_cents: sellerAmountCents,
        platform_fee_cents: platformFeeCents,
        due_on_site_cents: Math.max(booking.totalCents - sellerAmountCents, 0),
        status: 'pending',
        pix_qr_code: null,
        pix_copia_cola: mockCopiaCola,
        expires_at: expiresAt.toISOString(),
        raw_payload: { mock: true, method },
      };
    });
    await admin.from('payments').insert(paymentsToInsert);

    return {
      method,
      provider: 'validapay',
      paymentId: mockPaymentId,
      bookingIds,
      pixQrCode: null,
      pixCopiaCola: mockCopiaCola,
      amountCents: amounts.dueNowCents,
      totalCents: amounts.totalCents,
      sellerAmountCents: amounts.sellerAmountCents,
      platformFeeCents: amounts.platformFeeCents,
      dueOnSiteCents: amounts.dueOnSiteCents,
      expiresAt: expiresAt.toISOString(),
      slug,
    };
  }

  if (!providerAccountId) {
    throw createError({
      statusCode: 409,
      message: 'Pagamento online indisponível — a conta do estabelecimento não foi aprovada.',
    });
  }

  const charge = await createProviderPixCharge({
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
      name: targetBookings[0]!.customerName,
      phone: targetBookings[0]!.customerPhone,
      email: targetBookings[0]!.customerEmail || undefined,
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

  // Insere um payment por booking, distribuindo a taxa igualmente
  const feeBase = Math.floor(amounts.platformFeeCents / targetBookings.length);
  let feeRemainder = amounts.platformFeeCents - feeBase * targetBookings.length;
  const depositMultiplier = method === 'deposit_plus_on_site' ? amounts.depositPercentage / 100 : 1;

  const paymentsToInsert = targetBookings.map((booking) => {
    const platformFeeCents = feeBase + (feeRemainder-- > 0 ? 1 : 0);
    const sellerAmountCents = Math.round(booking.totalCents * depositMultiplier);
    return {
      booking_id: booking.id,
      provider: 'validapay',
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
    provider: 'validapay',
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
