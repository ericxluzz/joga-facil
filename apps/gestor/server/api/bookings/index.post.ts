import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin, mapBooking } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  if (!body.customerName || !body.resourceId || !body.startTime || !body.endTime || !body.date) {
    throw createError({ statusCode: 400, statusMessage: 'Faltam campos obrigatórios' });
  }

  const admin = await createSupabaseAdmin(event);

  // Busca ou cria service padrão
  const { data: existingServices } = await admin
    .from('services')
    .select('id')
    .eq('tenant_id', tenant.id)
    .limit(1);

  let serviceId: string;
  if (existingServices?.[0]) {
    serviceId = existingServices[0].id;
  } else {
    const { data: newSvc, error: svcError } = await admin
      .from('services')
      .insert({
        tenant_id: tenant.id,
        name: 'Reserva Manual',
        duration_minutes: 60,
        base_price_cents: 10000,
        active: true,
      })
      .select('id')
      .single();
    if (svcError) throw createError({ statusCode: 500, message: svcError.message });
    serviceId = newSvc!.id;
  }

  const { data: newBooking, error } = await admin
    .from('bookings')
    .insert({
      tenant_id: tenant.id,
      resource_id: body.resourceId,
      service_id: serviceId,
      customer_name: body.customerName,
      customer_phone: body.customerPhone || '',
      starts_at: new Date(`${body.date}T${body.startTime}:00`).toISOString(),
      ends_at: new Date(`${body.date}T${body.endTime}:00`).toISOString(),
      total_cents: body.priceCents || 10000,
      status: body.status || 'confirmed',
      payment_method: 'pay_on_site',
    })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });
  return { success: true, booking: mapBooking(newBooking!) };
});
