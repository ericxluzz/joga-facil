import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

// GET /api/financeiro/export?from=YYYY-MM-DD&to=YYYY-MM-DD — exporta CSV
export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const admin = createSupabaseAdmin();
  const query = getQuery(event);
  const fromStr = (query.from as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const toStr = (query.to as string) || new Date().toISOString().substring(0, 10);

  const { data, error } = await admin
    .from('payments')
    .select('id, created_at, amount_cents, status, bookings!inner(customer_name, payment_method, tenant_id, resources(name))')
    .eq('bookings.tenant_id', tenant.id)
    .gte('created_at', `${fromStr}T00:00:00`)
    .lte('created_at', `${toStr}T23:59:59`)
    .order('created_at', { ascending: false });

  if (error) throw createError({ statusCode: 500, message: error.message });

  const header = ['ID', 'Data', 'Cliente', 'Quadra', 'Valor (R$)', 'Status', 'Método'];
  const rows = (data || []).map((r: any) => [
    r.id,
    new Date(r.created_at).toISOString().substring(0, 10),
    r.bookings?.customer_name ?? '',
    r.bookings?.resources?.name ?? '',
    ((r.amount_cents || 0) / 100).toFixed(2).replace('.', ','),
    r.status,
    r.bookings?.payment_method === 'pix_upfront' ? 'PIX' : 'Na chegada',
  ]);

  const csv = [header, ...rows].map((row) => row.join(';')).join('\n');

  setHeader(event, 'content-type', 'text/csv; charset=utf-8');
  setHeader(event, 'content-disposition', `attachment; filename="agenda-slim-financeiro-${fromStr}_${toStr}.csv"`);
  return csv;
});
