import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin, mapScheduleRule } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  if (!body.resourceId || body.weekday === undefined || !body.startTime || !body.endTime) {
    throw createError({
      statusCode: 400,
      message: 'resourceId, weekday, startTime, endTime obrigatórios',
    });
  }

  const admin = await createSupabaseAdmin(event);
  const { data, error } = await admin
    .from('schedule_rules')
    .insert({
      tenant_id: tenant.id,
      resource_id: body.resourceId,
      weekday: body.weekday,
      start_time: body.startTime,
      end_time: body.endTime,
      price_modifier: String(body.priceModifier ?? 1.0),
    })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });
  return mapScheduleRule(data!);
});
