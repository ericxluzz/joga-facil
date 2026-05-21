import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const admin = await createSupabaseAdmin(event);
  const query = getQuery(event);

  let q = admin
    .from('webhook_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (query.unprocessed === '1') {
    q = q.is('processed_at', null);
  }

  const { data: rows } = await q;

  return {
    events: (rows || []).map((r: any) => ({
      id: r.id,
      provider: r.provider,
      eventType: r.event_type,
      externalId: r.external_id,
      processedAt: r.processed_at,
      error: r.error,
      createdAt: r.created_at,
    })),
  };
});
