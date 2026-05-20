import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin, mapResource } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  if (!body.name) throw createError({ statusCode: 400, message: 'name é obrigatório' });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('resources')
    .insert({
      tenant_id: tenant.id,
      name: body.name,
      type: body.type || tenant.type,
      photo_url: body.photoUrl ?? null,
    })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });
  return mapResource(data!);
});
