import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin, mapResource } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const admin = await createSupabaseAdmin(event);
  const { data, error } = await admin.from('resources').select('*').eq('tenant_id', tenant.id);
  if (error) throw createError({ statusCode: 500, message: error.message });

  return { resources: (data || []).map(mapResource) };
});
