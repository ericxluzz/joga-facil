import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin, mapBlock } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  if (!body.startsAt || !body.endsAt) {
    throw createError({ statusCode: 400, message: 'startsAt e endsAt obrigatórios' });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('blocks')
    .insert({
      tenant_id: tenant.id,
      resource_id: body.resourceId || null,
      starts_at: new Date(body.startsAt).toISOString(),
      ends_at: new Date(body.endsAt).toISOString(),
      reason: body.reason || null,
    })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });
  return mapBlock(data!);
});
