// POST /api/webhooks/validapay — recebe notificações do ValidaPay
// Idempotência via webhook_events (unique provider+external_id).
import { createSupabaseAdmin } from '../../utils/supabase-admin';
import { mapValidapayStatus } from '../../utils/payments/provider';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validação HMAC opcional (quando VALIDAPAY_WEBHOOK_SECRET configurado)
  const secret = process.env.VALIDAPAY_WEBHOOK_SECRET;
  if (secret) {
    const signature = getRequestHeader(event, 'x-validapay-signature') ||
                      getRequestHeader(event, 'x-webhook-signature');
    if (!signature) {
      throw createError({ statusCode: 401, message: 'Assinatura do webhook ausente' });
    }
    // Verificação HMAC-SHA256
    const { createHmac } = await import('crypto');
    const rawBody = JSON.stringify(body);
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (signature !== expected && signature !== `sha256=${expected}`) {
      throw createError({ statusCode: 401, message: 'Assinatura inválida' });
    }
  }

  // Extrai identificadores do payload
  const data = body?.data || body;
  const eventType: string = body?.event || body?.type || body?.eventType || 'charge.updated';
  const externalChargeId: string | undefined =
    data?.id || data?.chargeId || data?.charge_id || data?.uuid || body?.id;
  const eventId: string | undefined = body?.eventId || body?.event_id || externalChargeId;

  if (!externalChargeId) {
    throw createError({ statusCode: 400, message: 'payload sem charge id' });
  }

  const admin = createSupabaseAdmin();
  const dedupeId = eventId || `${externalChargeId}:${eventType}:${Date.now()}`;

  // Idempotência
  const { error: insertError } = await admin.from('webhook_events').insert({
    provider: 'validapay',
    external_id: dedupeId,
    event_type: eventType,
    payload: body,
  });

  if (insertError) {
    if (insertError.code === '23505') return { ok: true, idempotent: true };
    throw createError({ statusCode: 500, message: insertError.message });
  }

  // Localiza payment
  const { data: payments } = await admin
    .from('payments')
    .select('*')
    .eq('provider', 'validapay')
    .eq('provider_payment_id', externalChargeId)
    .limit(1);

  const payment = payments?.[0];
  if (!payment) {
    await admin
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString(), error: 'payment_not_found' })
      .eq('provider', 'validapay')
      .eq('external_id', dedupeId);
    return { ok: true, warning: 'payment_not_found' };
  }

  const rawStatus = data?.status || body?.status;
  const newStatus = rawStatus ? mapValidapayStatus(rawStatus) : payment.status;
  const now = new Date().toISOString();

  const paymentPatch: Record<string, any> = { status: newStatus, updated_at: now, raw_payload: body };
  if (newStatus === 'paid') paymentPatch.paid_at = now;

  await admin
    .from('payments')
    .update(paymentPatch)
    .eq('provider', 'validapay')
    .eq('provider_payment_id', externalChargeId);

  if (newStatus === 'paid') {
    await admin.from('bookings').update({ status: 'confirmed', confirmed_at: now, updated_at: now }).eq('id', payment.booking_id);
  } else if (newStatus === 'expired' || newStatus === 'failed') {
    await admin.from('bookings').update({ status: 'cancelled', cancelled_at: now, updated_at: now }).eq('id', payment.booking_id);
  }

  await admin
    .from('webhook_events')
    .update({ processed_at: now })
    .eq('provider', 'validapay')
    .eq('external_id', dedupeId);

  return { ok: true, status: newStatus };
});
