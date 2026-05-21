// POST /api/cron/expire-holds — cancels expired hold/pending_approval bookings.
// Called by Vercel Cron every minute.
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  // Protect: only allow Vercel Cron (Authorization header) or internal calls
  const auth = getRequestHeader(event, 'authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const admin = await createSupabaseAdmin(event);
  const now = new Date().toISOString();

  // Fetch expired holds
  const { data: expiredBookings, error } = await admin
    .from('bookings')
    .select('id')
    .in('status', ['hold', 'pending_approval'])
    .lt('expires_at', now);

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  if (!expiredBookings || expiredBookings.length === 0) {
    return { expired: 0 };
  }

  const ids = expiredBookings.map((b: any) => b.id as string);

  // Cancel bookings
  await admin
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
    .in('id', ids);

  // Expire associated payments (still pending/waiting)
  await admin
    .from('payments')
    .update({ status: 'expired', updated_at: now })
    .in('booking_id', ids)
    .in('status', ['pending', 'waiting_payment']);

  return { expired: ids.length, bookingIds: ids };
});
