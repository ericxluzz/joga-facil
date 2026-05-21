// POST /api/webhooks/validapay — recebe notificações do ValidaPay
// Idempotência via webhook_events (unique provider+external_id).
import { createSupabaseAdmin } from '../../utils/supabase-admin';
import { mapValidapayStatus } from '../../utils/payments/provider';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // ── HMAC validation (mandatory when VALIDAPAY_WEBHOOK_SECRET is set) ──
  const secret = process.env.VALIDAPAY_WEBHOOK_SECRET;
  if (secret) {
    const signature =
      getRequestHeader(event, 'x-validapay-signature') ||
      getRequestHeader(event, 'x-webhook-signature');
    if (!signature) {
      throw createError({ statusCode: 401, message: 'Assinatura do webhook ausente' });
    }
    const { createHmac } = await import('crypto');
    const rawBody = JSON.stringify(body);
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (signature !== expected && signature !== `sha256=${expected}`) {
      throw createError({ statusCode: 401, message: 'Assinatura inválida' });
    }
  }

  // ── Parse common fields ──
  const data = body?.data || body;
  const eventType: string = body?.event || body?.type || body?.eventType || 'charge.updated';
  const externalId: string | undefined =
    data?.id || data?.chargeId || data?.charge_id || data?.uuid ||
    data?.formId || data?.form_id || body?.id;
  const eventId: string | undefined = body?.eventId || body?.event_id || externalId;

  if (!externalId) {
    throw createError({ statusCode: 400, message: 'payload sem id' });
  }

  const admin = createSupabaseAdmin();
  const dedupeId = eventId || `${externalId}:${eventType}:${Date.now()}`;

  // ── Idempotência ──
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

  const now = new Date().toISOString();
  let processError: string | undefined;

  try {
    if (eventType.startsWith('account.') || eventType.startsWith('proposal.')) {
      await handleAccountEvent(admin, eventType, data, body, now);
    } else {
      await handlePaymentEvent(admin, eventType, externalId, data, body, now);
    }
  } catch (err: any) {
    processError = err?.message || String(err);
  }

  await admin
    .from('webhook_events')
    .update({
      processed_at: now,
      ...(processError ? { error: processError } : {}),
    })
    .eq('provider', 'validapay')
    .eq('external_id', dedupeId);

  if (processError) {
    return { ok: false, error: processError };
  }
  return { ok: true };
});

// ── Account events (KYC subconta) ──────────────────────────────────────────

async function handleAccountEvent(
  admin: ReturnType<typeof createSupabaseAdmin>,
  eventType: string,
  data: Record<string, unknown>,
  body: unknown,
  now: string,
) {
  const formId =
    (data?.formId as string) ||
    (data?.form_id as string) ||
    (data?.id as string) ||
    null;
  const accountNumber =
    (data?.accountNumber as string) ||
    (data?.account_number as string) ||
    null;

  if (!formId) {
    throw new Error(`account event sem formId — evento: ${eventType}`);
  }

  const { data: accounts } = await admin
    .from('tenant_payment_accounts')
    .select('id')
    .eq('validapay_form_id', formId)
    .limit(1);

  const account = accounts?.[0];
  if (!account) {
    throw new Error(`tenant_payment_account não encontrada para formId=${formId}`);
  }

  if (eventType === 'account.approved' || eventType === 'proposal.approved') {
    await admin.from('tenant_payment_accounts').update({
      status: 'approved',
      validapay_account_number: accountNumber,
      approved_at: now,
      validapay_status_raw: body,
      updated_at: now,
    }).eq('id', account.id);
  } else if (eventType === 'account.rejected' || eventType === 'proposal.rejected') {
    const reason = (data?.reason as string) || (data?.rejection_reason as string) || null;
    await admin.from('tenant_payment_accounts').update({
      status: 'rejected',
      rejection_reason: reason,
      rejected_at: now,
      validapay_status_raw: body,
      updated_at: now,
    }).eq('id', account.id);
  }
}

// ── Payment events ─────────────────────────────────────────────────────────

async function handlePaymentEvent(
  admin: ReturnType<typeof createSupabaseAdmin>,
  eventType: string,
  externalChargeId: string,
  data: Record<string, unknown>,
  body: unknown,
  now: string,
) {
  // Handle withdrawal events
  if (eventType.startsWith('withdraw.')) {
    await handleWithdrawalEvent(admin, eventType, data, body, now);
    return;
  }

  // Fetch ALL payments for this charge (multi-booking cart shares one charge id)
  const { data: paymentRows } = await admin
    .from('payments')
    .select('id, booking_id, status')
    .eq('provider', 'validapay')
    .eq('provider_payment_id', externalChargeId);

  if (!paymentRows || paymentRows.length === 0) {
    throw new Error(`payments não encontrados para provider_payment_id=${externalChargeId}`);
  }

  const rawStatus = (data as any)?.status || (body as any)?.status;
  const newStatus = rawStatus ? mapValidapayStatus(rawStatus) : null;

  if (!newStatus) return; // unknown status, nothing to do

  const paymentPatch: Record<string, any> = {
    status: newStatus,
    updated_at: now,
    raw_payload: body,
  };
  if (newStatus === 'paid') paymentPatch.paid_at = now;

  // Update all payments with this charge id
  await admin
    .from('payments')
    .update(paymentPatch)
    .eq('provider', 'validapay')
    .eq('provider_payment_id', externalChargeId);

  // Update all associated bookings
  const bookingIds = paymentRows.map((p: any) => p.booking_id).filter(Boolean);
  if (bookingIds.length === 0) return;

  if (newStatus === 'paid') {
    await admin
      .from('bookings')
      .update({ status: 'confirmed', confirmed_at: now, updated_at: now })
      .in('id', bookingIds);
  } else if (newStatus === 'expired' || newStatus === 'failed') {
    await admin
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
      .in('id', bookingIds);
  }
}

// ── Withdrawal events ──────────────────────────────────────────────────────

async function handleWithdrawalEvent(
  admin: ReturnType<typeof createSupabaseAdmin>,
  eventType: string,
  data: Record<string, unknown>,
  body: unknown,
  now: string,
) {
  const providerId =
    (data?.withdrawalId as string) ||
    (data?.withdrawal_id as string) ||
    (data?.id as string) ||
    null;
  if (!providerId) return;

  const { data: rows } = await admin
    .from('withdrawals')
    .select('id')
    .eq('provider_withdrawal_id', providerId)
    .limit(1);

  const row = rows?.[0];
  if (!row) return;

  if (eventType === 'withdraw.success') {
    await admin.from('withdrawals').update({
      status: 'completed',
      completed_at: now,
      provider_payload: body,
      updated_at: now,
    }).eq('id', row.id);
  } else if (eventType === 'withdraw.failed') {
    const reason = (data?.reason as string) || (data?.failure_reason as string) || null;
    await admin.from('withdrawals').update({
      status: 'failed',
      failure_reason: reason,
      provider_payload: body,
      updated_at: now,
    }).eq('id', row.id);
  }
}
