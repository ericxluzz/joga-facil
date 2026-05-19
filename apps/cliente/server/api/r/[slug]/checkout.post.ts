// POST /api/r/[slug]/checkout — finaliza reserva
//   - pix_upfront: cria cobrança AbacatePay e retorna QR + copia-cola
//   - pay_on_site: marca como pending_approval, notifica gestor
import { getTenantBySlug } from '../../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { bookings, payments } from '@agendaslim/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { createPixCharge } from '../../../utils/abacate';

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  if (!slug) throw createError({ statusCode: 400, message: 'slug obrigatório' });

  const tenant = await getTenantBySlug(slug);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  const bookingIds: string[] = body.bookingIds || (body.holdId ? [body.holdId] : []);
  if (bookingIds.length === 0) {
    throw createError({ statusCode: 400, message: 'bookingIds obrigatórios' });
  }

  const targetBookings = await db
    .select()
    .from(bookings)
    .where(inArray(bookings.id, bookingIds));
  if (targetBookings.length === 0) {
    throw createError({ statusCode: 404, message: 'Reservas não encontradas' });
  }

  const totalCents = targetBookings.reduce((sum, b) => sum + b.totalCents, 0);
  const customer = targetBookings[0]!;

  // --- Modo pay_on_site: só marca como pending_approval ---
  if (body.method === 'pay_on_site') {
    const settings = (tenant.settings as any) || {};
    const timeoutMin = settings.payOnSiteTimeoutMinutes ?? 60;
    const expiresAt = new Date(Date.now() + timeoutMin * 60 * 1000);

    await db
      .update(bookings)
      .set({
        status: 'pending_approval',
        paymentMethod: 'pay_on_site',
        expiresAt,
        updatedAt: new Date(),
      })
      .where(inArray(bookings.id, bookingIds));

    return {
      method: 'pay_on_site',
      bookingIds,
      status: 'pending_approval',
      expiresAt: expiresAt.toISOString(),
      slug,
    };
  }

  // --- Modo pix_upfront: chama AbacatePay (server-side) ---
  const charge = await createPixCharge({
    amount: totalCents,
    expiresIn: 15 * 60,
    description: `${tenant.name} — ${bookingIds.length} reserva${bookingIds.length > 1 ? 's' : ''}`,
    customer: {
      name: customer.customerName,
      cellphone: customer.customerPhone.replace(/\D/g, ''),
      email: customer.customerEmail || undefined,
    },
    metadata: {
      tenantId: tenant.id,
      bookingIds: bookingIds.join(','),
    },
  });

  // Cria 1 payment por booking (split proporcional simples — no MVP, todos com mesmo provider_id)
  const expiresAt = new Date(charge.expiresAt);
  await db.insert(payments).values(
    targetBookings.map((b) => ({
      bookingId: b.id,
      provider: 'abacatepay',
      providerPaymentId: charge.id,
      amountCents: b.totalCents,
      status: 'pending' as const,
      pixQrCode: charge.brCodeBase64,
      pixCopiaCola: charge.brCode,
      expiresAt,
      rawPayload: charge as any,
    })),
  );

  return {
    method: 'pix_upfront',
    paymentId: charge.id,
    bookingIds,
    pixQrCode: charge.brCodeBase64,
    pixCopiaCola: charge.brCode,
    amount: charge.amount,
    expiresAt: charge.expiresAt,
    slug,
  };
});
