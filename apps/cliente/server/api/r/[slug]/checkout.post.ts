import { db } from '@agendaslim/db/client';
import { bookings, tenants, payments } from '@agendaslim/db/schema';
import { eq, inArray } from 'drizzle-orm';

// POST /api/r/[slug]/checkout — gera PIX (ou marca pra aprovar)
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  const body = await readBody(event);

  if (!slug || !body.bookingIds || body.bookingIds.length === 0) {
    throw createError({ statusCode: 400, message: 'Parâmetros obrigatórios ausentes' });
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const method = body.method || 'pix_upfront';

  if (method === 'pix_upfront') {
    const totalCents = body.totalCents || 10000;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const [newPayment] = await db
      .insert(payments)
      .values({
        bookingId: body.bookingIds[0],
        provider: 'abacatepay',
        providerPaymentId: `ap-${Date.now()}`,
        status: 'pending',
        amountCents: totalCents,
        pixQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020126360014BR.GOV.BCB.PIX0114agendaslim@example52040000530398654041.005802BR5925AGENDA SLIM PAGAMENTOS6009SAO PAULO62070503***6304ABCD',
        pixCopiaCola: '00020126360014BR.GOV.BCB.PIX0114agendaslim@example52040000530398654041.005802BR5925AGENDA SLIM PAGAMENTOS6009SAO PAULO62070503***6304ABCD',
        expiresAt,
      })
      .returning();

    await db
      .update(bookings)
      .set({
        paymentMethod: 'pix_upfront',
        updatedAt: new Date(),
      })
      .where(inArray(bookings.id, body.bookingIds));

    return {
      method: 'pix_upfront',
      paymentId: newPayment.id,
      pixQrCode: newPayment.pixQrCode,
      pixCopiaCola: newPayment.pixCopiaCola,
      expiresAt: expiresAt.toISOString(),
      slug,
    };
  } else {
    // pay_on_site
    const status = tenant.settings.requireRegistration ? 'pending_approval' : 'confirmed';

    await db
      .update(bookings)
      .set({
        status,
        paymentMethod: 'pay_on_site',
        confirmedAt: status === 'confirmed' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(inArray(bookings.id, body.bookingIds));

    return {
      method: 'pay_on_site',
      bookingIds: body.bookingIds,
      status,
      slug,
    };
  }
});
