import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const admin = await createSupabaseAdmin(event);
  const { data, error } = await admin
    .from('blocks')
    .select('id, resource_id, starts_at, ends_at, reason, resources(name)')
    .eq('tenant_id', tenant.id);

  if (error) throw createError({ statusCode: 500, message: error.message });

  return {
    blocks: (data || []).map((b: any) => ({
      id: b.id,
      resourceId: b.resource_id,
      resourceName: b.resources?.name || 'Todas as quadras',
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      reason: b.reason,
    })),
  };
});
