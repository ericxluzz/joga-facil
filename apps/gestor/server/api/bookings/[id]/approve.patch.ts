import { createSupabaseAdmin, mapBooking } from '../../../utils/supabase-admin';
import { getActiveTenant } from '../../../utils/tenant';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'ID obrigatório' });

  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 401, message: 'Não autorizado' });

  const admin = await createSupabaseAdmin(event);
  const { data, error } = await admin
    .from('bookings')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select()
    .single();

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Reserva não encontrada' });
  }

  return { success: true, booking: mapBooking(data) };
});
