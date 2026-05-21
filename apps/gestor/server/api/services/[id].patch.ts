import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin, mapService } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'id obrigatório' });

  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  const admin = await createSupabaseAdmin(event);

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;
  if (body.durationMinutes !== undefined) patch.duration_minutes = body.durationMinutes;
  if (body.basePriceCents !== undefined) patch.base_price_cents = body.basePriceCents;
  if (body.resourceId !== undefined) patch.resource_id = body.resourceId;
  if (body.active !== undefined) patch.active = body.active;

  const { data, error } = await admin
    .from('services')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select()
    .single();

  if (error || !data) throw createError({ statusCode: 404, message: 'Serviço não encontrado' });
  return mapService(data);
});
