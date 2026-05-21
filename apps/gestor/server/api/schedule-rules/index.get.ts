import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const admin = await createSupabaseAdmin(event);
  const query = getQuery(event);

  let q = admin
    .from('schedule_rules')
    .select('id, resource_id, weekday, start_time, end_time, price_modifier, active, resources(name)')
    .eq('tenant_id', tenant.id);

  if (query.resourceId) {
    q = q.eq('resource_id', query.resourceId as string);
  }

  const { data, error } = await q;
  if (error) throw createError({ statusCode: 500, message: error.message });

  return {
    rules: (data || []).map((r: any) => ({
      id: r.id,
      resourceId: r.resource_id,
      resourceName: r.resources?.name ?? '',
      weekday: r.weekday,
      startTime: r.start_time,
      endTime: r.end_time,
      priceModifier: parseFloat(r.price_modifier),
      active: r.active,
    })),
  };
});
