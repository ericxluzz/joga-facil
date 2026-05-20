import { createSupabaseAdmin, mapPayment } from '../supabase-admin';
import type { PaymentProviderName } from './types';

type PaymentStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';

export async function findPaymentByPublicId(id: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('payments')
    .select('*')
    .or(`provider_payment_id.eq.${id},id.eq.${id}`)
    .limit(1)
    .single();
  return data ? mapPayment(data) : null;
}

export async function applyProviderPaymentStatus(args: {
  provider: PaymentProviderName;
  providerPaymentId: string;
  status: PaymentStatus;
  rawPayload?: unknown;
  paidAt?: Date | null;
}) {
  const admin = createSupabaseAdmin();
  const now = new Date();

  const { data: rows } = await admin
    .from('payments')
    .select('booking_id')
    .eq('provider', args.provider)
    .eq('provider_payment_id', args.providerPaymentId);

  if (!rows || rows.length === 0) return { matched: false, bookingIds: [] as string[] };

  const bookingIds = rows.map((r: any) => r.booking_id as string);

  const paymentPatch: Record<string, any> = {
    status: args.status,
    updated_at: now.toISOString(),
  };
  if (args.rawPayload !== undefined) paymentPatch.raw_payload = args.rawPayload;
  if (args.status === 'paid') paymentPatch.paid_at = (args.paidAt ?? now).toISOString();

  await admin
    .from('payments')
    .update(paymentPatch)
    .eq('provider', args.provider)
    .eq('provider_payment_id', args.providerPaymentId);

  if (args.status === 'paid') {
    await admin
      .from('bookings')
      .update({
        status: 'confirmed',
        confirmed_at: (args.paidAt ?? now).toISOString(),
        updated_at: now.toISOString(),
      })
      .in('id', bookingIds);
  } else if (args.status === 'expired' || args.status === 'failed') {
    await admin
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .in('id', bookingIds);
  }

  return { matched: true, bookingIds };
}

export async function recordPaymentWebhook(args: {
  provider: PaymentProviderName;
  eventId: string;
  eventType: string;
  payload: unknown;
}) {
  const admin = createSupabaseAdmin();
  const { error } = await admin.from('webhook_events').insert({
    provider: args.provider,
    external_id: args.eventId,
    event_type: args.eventType,
    payload: args.payload,
  });

  if (error) {
    if (error.code === '23505') return { idempotent: true };
    throw new Error(error.message);
  }
  return { idempotent: false };
}

export async function markPaymentWebhookProcessed(args: {
  provider: PaymentProviderName;
  eventId: string;
  error?: string;
}) {
  const admin = createSupabaseAdmin();
  await admin
    .from('webhook_events')
    .update({ processed_at: new Date().toISOString(), error: args.error ?? null })
    .eq('provider', args.provider)
    .eq('external_id', args.eventId);
}
