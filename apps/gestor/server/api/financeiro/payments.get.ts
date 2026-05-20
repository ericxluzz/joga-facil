import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const admin = createSupabaseAdmin();
  const query = getQuery(event);
  const status = query.status as string | undefined;

  let q = admin
    .from('payments')
    .select('id, booking_id, amount_cents, status, created_at, paid_at, bookings!inner(customer_name, payment_method, tenant_id, resources(name))')
    .eq('bookings.tenant_id', tenant.id)
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw createError({ statusCode: 500, message: error.message });

  const list = (data || []).map((p: any) => ({
    id: p.id,
    bookingId: p.booking_id,
    customerName: p.bookings?.customer_name ?? '',
    resourceName: p.bookings?.resources?.name ?? '',
    amountCents: p.amount_cents,
    status: p.status,
    method: p.bookings?.payment_method === 'pix_upfront' ? 'PIX' : 'Na chegada',
    date: new Date(p.created_at).toISOString().substring(0, 10),
    paidAt: p.paid_at ? new Date(p.paid_at).toISOString() : null,
  }));

  return { payments: list, total: list.length };
});
