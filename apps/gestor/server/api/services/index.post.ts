import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin, mapService } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  if (!body.name || !body.durationMinutes || body.basePriceCents === undefined) {
    throw createError({ statusCode: 400, message: 'name, durationMinutes e basePriceCents são obrigatórios' });
  }

  const admin = await createSupabaseAdmin(event);
  const { data, error } = await admin
    .from('services')
    .insert({
      tenant_id: tenant.id,
      resource_id: body.resourceId || null,
      name: body.name,
      description: body.description || null,
      duration_minutes: body.durationMinutes,
      base_price_cents: body.basePriceCents,
    })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });
  return mapService(data!);
});
