import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const admin = createSupabaseAdmin();
  const query = getQuery(event);

  let q = admin
    .from('bookings')
    .select('id, resource_id, customer_name, customer_phone, starts_at, ends_at, status, total_cents, resources(name)')
    .eq('tenant_id', tenant.id)
    .order('starts_at');

  if (query.date) {
    // Filter by date using gte/lte on starts_at
    const dateStr = query.date as string;
    q = q
      .gte('starts_at', `${dateStr}T00:00:00`)
      .lte('starts_at', `${dateStr}T23:59:59`);
  }

  if (query.status) {
    q = q.eq('status', query.status as string);
  }

  const { data: result, error } = await q;
  if (error) throw createError({ statusCode: 500, message: error.message });

  const mapped = (result || []).map((b: any) => {
    const startsAt = new Date(b.starts_at);
    const endsAt = new Date(b.ends_at);
    return {
      id: b.id,
      resourceId: b.resource_id,
      resourceName: b.resources?.name ?? '',
      customerName: b.customer_name,
      customerPhone: b.customer_phone,
      date: startsAt.toISOString().substring(0, 10),
      startTime: startsAt.toISOString().substring(11, 16),
      endTime: endsAt.toISOString().substring(11, 16),
      status: b.status,
      priceCents: b.total_cents,
    };
  });

  return { bookings: mapped };
});
