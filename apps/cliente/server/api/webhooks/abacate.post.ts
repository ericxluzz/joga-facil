// POST /api/webhooks/abacate — recebe notificações do AbacatePay
// Idempotência via tabela webhook_events (PK composta provider+external_id).
import { db } from '@agendaslim/db/client';
import { webhookEvents, payments, bookings } from '@agendaslim/db/schema';
import { eq, and } from 'drizzle-orm';
import { mapAbacateStatus } from '../../utils/abacate';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // AbacatePay envia algo como:
  // { event: 'billing.paid' | 'billing.expired' | ..., data: { id, status, ... } }
  const eventId: string | undefined = body?.event_id || body?.id || body?.data?.id;
  const eventType: string = body?.event || body?.type || 'unknown';
  const externalChargeId: string | undefined =
    body?.data?.id || body?.data?.charge_id || body?.id;

  if (!externalChargeId) {
    throw createError({ statusCode: 400, message: 'payload sem charge id' });
  }

  // Idempotência: tenta inserir; se já existe, retorna 200 sem reprocessar
  try {
    await db.insert(webhookEvents).values({
      provider: 'abacatepay',
      externalId: eventId || `${externalChargeId}:${eventType}:${Date.now()}`,
      eventType,
      payload: body,
    });
  } catch (err: any) {
    // Conflict primary key = já processado
    if (err?.code === '23505') {
      return { ok: true, idempotent: true };
    }
    throw err;
  }

  // Localiza payment pelo providerPaymentId
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.providerPaymentId, externalChargeId))
    .limit(1);

  if (!payment) {
    // Marca evento como processado mas avisa
    await db
      .update(webhookEvents)
      .set({ processedAt: new Date(), error: 'payment_not_found' })
      .where(
        and(
          eq(webhookEvents.provider, 'abacatepay'),
          eq(webhookEvents.externalId, eventId || `${externalChargeId}:${eventType}`),
        ),
      );
    return { ok: true, warning: 'payment_not_found' };
  }

  const abacateStatus = body?.data?.status || body?.status;
  const newStatus = abacateStatus ? mapAbacateStatus(abacateStatus) : payment.status;
  const now = new Date();

  // Atualiza payment
  const updates: any = { status: newStatus, updatedAt: now, rawPayload: body };
  if (newStatus === 'paid') updates.paidAt = now;

  await db
    .update(payments)
    .set(updates)
    .where(eq(payments.providerPaymentId, externalChargeId));

  // Atualiza booking
  if (newStatus === 'paid') {
    await db
      .update(bookings)
      .set({ status: 'confirmed', confirmedAt: now, updatedAt: now })
      .where(eq(bookings.id, payment.bookingId));
  } else if (newStatus === 'expired' || newStatus === 'failed') {
    await db
      .update(bookings)
      .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
      .where(eq(bookings.id, payment.bookingId));
  }

  // Marca evento como processado
  await db
    .update(webhookEvents)
    .set({ processedAt: now })
    .where(
      and(
        eq(webhookEvents.provider, 'abacatepay'),
        eq(webhookEvents.externalId, eventId || `${externalChargeId}:${eventType}`),
      ),
    );

  return { ok: true, status: newStatus };
});
