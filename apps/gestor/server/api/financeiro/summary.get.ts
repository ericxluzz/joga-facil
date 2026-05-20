import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const admin = createSupabaseAdmin();
  const query = getQuery(event);
  const fromStr = (query.from as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const toStr = (query.to as string) || new Date().toISOString().substring(0, 10);
  const fromISO = `${fromStr}T00:00:00`;
  const toISO = `${toStr}T23:59:59`;

  // Fetch paid payments in period
  const { data: paidPayments } = await admin
    .from('payments')
    .select('amount_cents, bookings!inner(tenant_id, payment_method)')
    .eq('bookings.tenant_id', tenant.id)
    .eq('status', 'paid')
    .gte('paid_at', fromISO)
    .lte('paid_at', toISO);

  // Fetch refunded
  const { data: refundedPayments } = await admin
    .from('payments')
    .select('amount_cents, bookings!inner(tenant_id)')
    .eq('bookings.tenant_id', tenant.id)
    .eq('status', 'refunded')
    .gte('updated_at', fromISO)
    .lte('updated_at', toISO);

  // Fetch pending
  const { data: pendingPayments } = await admin
    .from('payments')
    .select('amount_cents, bookings!inner(tenant_id)')
    .eq('bookings.tenant_id', tenant.id)
    .eq('status', 'pending')
    .gte('created_at', fromISO)
    .lte('created_at', toISO);

  const faturamentoTotalCents = (paidPayments || []).reduce((s: number, p: any) => s + (p.amount_cents || 0), 0);
  const transacoesCount = (paidPayments || []).length;
  const faturamentoTotal = faturamentoTotalCents / 100;
  const ticketMedio = transacoesCount > 0 ? Number((faturamentoTotal / transacoesCount).toFixed(2)) : 0;
  const reembolsosTotal = (refundedPayments || []).reduce((s: number, p: any) => s + (p.amount_cents || 0), 0) / 100;
  const pendentesTotal = (pendingPayments || []).reduce((s: number, p: any) => s + (p.amount_cents || 0), 0) / 100;

  const pixPaid = (paidPayments || []).filter((p: any) => p.bookings?.payment_method === 'pix_upfront');
  const pixAmountCents = pixPaid.reduce((s: number, p: any) => s + (p.amount_cents || 0), 0);

  // On-site confirmed bookings
  const { data: onsiteBookings } = await admin
    .from('bookings')
    .select('total_cents')
    .eq('tenant_id', tenant.id)
    .eq('status', 'confirmed')
    .eq('payment_method', 'pay_on_site')
    .gte('starts_at', fromISO)
    .lte('starts_at', toISO);

  const onsiteAmountCents = (onsiteBookings || []).reduce((s: number, b: any) => s + (b.total_cents || 0), 0);

  return {
    period: { from: fromStr, to: toStr },
    kpis: {
      faturamentoTotal,
      transacoes: transacoesCount,
      ticketMedio,
      reembolsos: reembolsosTotal,
      pendentes: pendentesTotal,
    },
    chartData: {
      labels: ['01', '08', '15', '22', '29'],
      series: [
        { name: 'Confirmado', data: [faturamentoTotal, 0, 0, 0, 0] },
        { name: 'Pendente', data: [pendentesTotal, 0, 0, 0, 0] },
      ],
    },
    breakdown: [
      { method: 'PIX antecipado', amountCents: pixAmountCents, count: pixPaid.length, color: '#10B981' },
      { method: 'Pagar na chegada', amountCents: onsiteAmountCents, count: (onsiteBookings || []).length, color: '#F59E0B' },
    ],
  };
});
