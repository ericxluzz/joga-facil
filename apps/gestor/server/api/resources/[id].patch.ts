import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin, mapResource } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'id obrigatório' });

  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  const admin = createSupabaseAdmin();

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.type !== undefined) patch.type = body.type;
  if (body.photoUrl !== undefined) patch.photo_url = body.photoUrl;
  if (body.active !== undefined) patch.active = body.active;

  const { data, error } = await admin
    .from('resources')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select()
    .single();

  if (error || !data) throw createError({ statusCode: 404, message: 'Quadra não encontrada' });
  return mapResource(data);
});
