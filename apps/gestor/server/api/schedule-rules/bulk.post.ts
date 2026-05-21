import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin, mapScheduleRule } from '../../utils/supabase-admin';

// POST /api/schedule-rules/bulk — substitui todas as regras de um recurso
export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const body = await readBody(event);
  const { resourceId, rules } = body as { resourceId: string; rules: any[] };

  if (!resourceId) {
    throw createError({ statusCode: 400, message: 'resourceId é obrigatório' });
  }

  const admin = await createSupabaseAdmin(event);

  // Delete existing rules for this resource
  await admin.from('schedule_rules').delete().eq('resource_id', resourceId);

  const payload = (rules || []).flatMap((r: any) => {
    const weekdaysList = Array.isArray(r.weekdays)
      ? r.weekdays
      : r.weekday !== undefined
      ? [r.weekday]
      : [];
    return weekdaysList.map((weekday: number) => ({
      tenant_id: tenant.id,
      resource_id: resourceId,
      weekday,
      start_time: r.startTime,
      end_time: r.endTime,
      price_modifier: String(r.priceModifier || 1.0),
      active: r.active !== undefined ? r.active : true,
    }));
  });

  let inserted: any[] = [];
  if (payload.length > 0) {
    const { data, error } = await admin.from('schedule_rules').insert(payload).select();
    if (error) throw createError({ statusCode: 500, message: error.message });
    inserted = data || [];
  }

  return {
    resourceId,
    count: inserted.length,
    rules: inserted.map(mapScheduleRule),
  };
});
