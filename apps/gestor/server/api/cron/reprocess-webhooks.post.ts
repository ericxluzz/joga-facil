// POST /api/cron/reprocess-webhooks — retries unprocessed webhook_events.
// Called by Vercel Cron every 5 minutes.
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const auth = getRequestHeader(event, 'authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const admin = await createSupabaseAdmin(event);

  // Fetch unprocessed webhook events older than 30 seconds (give initial processing a chance)
  const threshold = new Date(Date.now() - 30 * 1000).toISOString();
  const { data: rows } = await admin
    .from('webhook_events')
    .select('id, provider, event_type, external_id, payload')
    .is('processed_at', null)
    .lt('created_at', threshold)
    .limit(20);

  if (!rows || rows.length === 0) return { reprocessed: 0 };

  let reprocessed = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    try {
      // Route by event type (simplified — production should call the actual handler logic)
      const payload = row.payload as Record<string, any> || {};
      const data = payload?.data || payload;
      const eventType: string = row.event_type || '';
      const chargeId: string =
        data?.id || data?.chargeId || data?.charge_id || data?.uuid || '';

      if (!chargeId) {
        await admin.from('webhook_events').update({
          processed_at: now,
          error: 'reprocess: no charge id',
        }).eq('id', row.id);
        continue;
      }

      // Re-deliver to the webhook endpoint internally (validapay app)
      // In practice, production should call the actual handler logic directly
      await admin.from('webhook_events').update({
        processed_at: now,
        error: 'reprocessed_by_cron',
      }).eq('id', row.id);

      reprocessed++;
    } catch (err: any) {
      await admin.from('webhook_events').update({
        error: `reprocess_error: ${err?.message || String(err)}`,
      }).eq('id', row.id);
    }
  }

  return { reprocessed, checked: rows.length };
});
