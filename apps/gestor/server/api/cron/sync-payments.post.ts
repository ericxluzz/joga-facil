// POST /api/cron/sync-payments — Queries ValidaPay for payments stuck in 'pending'.
// Called by Vercel Cron every 5 minutes.
import { createSupabaseAdmin } from '../../utils/supabase-admin';
import { getValidapayChargeStatus } from '../../utils/payments/provider-server';

export default defineEventHandler(async (event) => {
  const auth = getRequestHeader(event, 'authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const admin = await createSupabaseAdmin(event);
  const threshold = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { data: stalePayments } = await admin
    .from('payments')
    .select('id, booking_id, provider_payment_id')
    .eq('provider', 'validapay')
    .eq('status', 'pending')
    .lt('created_at', threshold)
    .limit(50);

  if (!stalePayments || stalePayments.length === 0) {
    return { synced: 0 };
  }

  let updated = 0;
  const now = new Date().toISOString();

  for (const payment of stalePayments) {
    if (!payment.provider_payment_id) continue;
    const charge = await getValidapayChargeStatus(payment.provider_payment_id);
    if (!charge || charge.status === 'pending') continue;

    // Update payment
    const paymentPatch: Record<string, any> = {
      status: charge.status,
      updated_at: now,
      raw_payload: charge.rawPayload,
    };
    if (charge.status === 'paid') paymentPatch.paid_at = now;

    await admin
      .from('payments')
      .update(paymentPatch)
      .eq('id', payment.id);

    // Update booking
    if (charge.status === 'paid') {
      await admin.from('bookings').update({
        status: 'confirmed',
        confirmed_at: now,
        updated_at: now,
      }).eq('id', payment.booking_id);
    } else if (charge.status === 'expired' || charge.status === 'failed') {
      await admin.from('bookings').update({
        status: 'cancelled',
        cancelled_at: now,
        updated_at: now,
      }).eq('id', payment.booking_id);
    }

    updated++;
  }

  return { synced: updated, checked: stalePayments.length };
});
