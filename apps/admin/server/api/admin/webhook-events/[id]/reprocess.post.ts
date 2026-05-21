// POST /api/admin/webhook-events/:id/reprocess — manually re-trigger webhook processing.
import { createSupabaseAdmin } from '../../../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'id obrigatório' });

  const admin = await createSupabaseAdmin(event);

  const { data: row } = await admin
    .from('webhook_events')
    .select('*')
    .eq('id', id)
    .single();

  if (!row) throw createError({ statusCode: 404, message: 'Webhook event não encontrado' });

  // Reset processed_at so the reprocess-webhooks cron picks it up
  await admin.from('webhook_events')
    .update({ processed_at: null, error: null })
    .eq('id', id);

  return { ok: true, id };
});
