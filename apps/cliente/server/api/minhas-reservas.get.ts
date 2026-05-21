// GET /api/minhas-reservas?phone=51999999999
// Retorna reservas do cliente pelo número de WhatsApp (sem login)
import { createSupabaseAdmin } from '../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const phone = String(query.phone || '').replace(/\D/g, '');

  if (!phone || phone.length < 10) {
    throw createError({ statusCode: 400, message: 'Número de WhatsApp inválido' });
  }

  const admin = createSupabaseAdmin();

  const { data, error } = await admin
    .from('bookings')
    .select(`
      id,
      starts_at,
      ends_at,
      status,
      total_cents,
      payment_method,
      customer_name,
      resource_id,
      tenant_id,
      tenants!inner ( name, slug ),
      resources ( name, type )
    `)
    .eq('customer_phone', phone)
    .not('status', 'in', '("hold","expired")')
    .order('starts_at', { ascending: false })
    .limit(50);

  if (error) throw createError({ statusCode: 500, message: error.message });

  return (data || []).map((b: any) => ({
    id: b.id,
    tenantName: b.tenants?.name ?? '',
    tenantSlug: b.tenants?.slug ?? '',
    resourceName: b.resources?.name ?? '',
    resourceType: b.resources?.type ?? '',
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    status: b.status,
    totalCents: b.total_cents,
    paymentMethod: b.payment_method,
    customerName: b.customer_name,
  }));
});
