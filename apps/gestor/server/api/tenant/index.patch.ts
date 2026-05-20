import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin, mapTenant } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const tenant = await getActiveTenant(event);

  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const admin = createSupabaseAdmin();
  const mergedSettings = { ...tenant.settings, ...(body.settings || {}) };

  const { data: updated, error } = await admin
    .from('tenants')
    .update({
      name: body.name ?? tenant.name,
      slug: body.slug ?? tenant.slug,
      photo_url: body.photoUrl !== undefined ? body.photoUrl : tenant.photoUrl,
      address: body.address !== undefined ? body.address : tenant.address,
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenant.id)
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });
  return mapTenant(updated!);
});
