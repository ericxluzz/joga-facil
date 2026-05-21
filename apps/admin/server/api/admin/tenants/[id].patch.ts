import { createSupabaseAdmin } from '../../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'id obrigatório' });

  const body = await readBody(event);
  const admin = await createSupabaseAdmin(event);

  const allowed = ['active', 'suspended', 'cancelled'];
  if (body.status && !allowed.includes(body.status)) {
    throw createError({ statusCode: 400, message: `Status inválido: ${body.status}` });
  }

  await admin.from('tenants').update({
    status: body.status,
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  return { ok: true };
});
