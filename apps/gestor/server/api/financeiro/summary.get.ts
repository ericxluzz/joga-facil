import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const admin = await createSupabaseAdmin(event);
  const query = getQuery(event);
  const fromStr =
    (query.from as string) ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const toStr = (query.to as string) || new Date().toISOString().substring(0, 10);
  const fromISO = `${fromStr}T00:00:00`;
  const toISO = `${toStr}T23:59:59`;

  const [
    { data: paidPayments },
    { data: refundedPayments },
    { data: pendingPayments },
    { data: onsiteBookings },
  ] = await Promise.all([
    admin
      .from('payments')
      .select(
        'amount_cents, paid_at, bookings!inner(tenant_id, payment_method, resource_id, resources(id, name))',
      )
      .eq('bookings.tenant_id', tenant.id)
      .eq('status', 'paid')
      .gte('paid_at', fromISO)
      .lte('paid_at', toISO),

    admin
      .from('payments')
      .select('amount_cents, bookings!inner(tenant_id)')
      .eq('bookings.tenant_id', tenant.id)
      .eq('status', 'refunded')
      .gte('updated_at', fromISO)
      .lte('updated_at', toISO),

    admin
      .from('payments')
      .select('amount_cents, bookings!inner(tenant_id)')
      .eq('bookings.tenant_id', tenant.id)
      .eq('status', 'pending')
      .gte('created_at', fromISO)
      .lte('created_at', toISO),

    admin
      .from('bookings')
      .select('total_cents, resource_id, resources(id, name)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'confirmed')
      .eq('payment_method', 'pay_on_site')
      .gte('starts_at', fromISO)
      .lte('starts_at', toISO),
  ]);

  const faturamentoTotalCents = (paidPayments || []).reduce(
    (s: number, p: any) => s + (p.amount_cents || 0),
    0,
  );
  const transacoesCount = (paidPayments || []).length;
  const faturamentoTotal = faturamentoTotalCents / 100;
  const ticketMedio =
    transacoesCount > 0 ? Number((faturamentoTotal / transacoesCount).toFixed(2)) : 0;
  const reembolsosTotal =
    (refundedPayments || []).reduce((s: number, p: any) => s + (p.amount_cents || 0), 0) / 100;
  const pendentesTotal =
    (pendingPayments || []).reduce((s: number, p: any) => s + (p.amount_cents || 0), 0) / 100;

  // Series diária real (preenche dias vazios com 0)
  const fromD = new Date(`${fromStr}T00:00:00`);
  const toD = new Date(`${toStr}T00:00:00`);
  const dailyMap: Record<string, number> = {};
  for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().substring(0, 10);
    dailyMap[key] = 0;
  }
  for (const p of paidPayments || []) {
    if (!p.paid_at) continue;
    const key = new Date(p.paid_at).toISOString().substring(0, 10);
    if (key in dailyMap) dailyMap[key] = (dailyMap[key] || 0) + (p.amount_cents || 0) / 100;
  }
  const dailyLabels = Object.keys(dailyMap).sort();
  const dailyValues = dailyLabels.map((k) => Number((dailyMap[k] || 0).toFixed(2)));

  // Breakdown por método (PIX vs na chegada)
  const pixPaid = (paidPayments || []).filter(
    (p: any) => p.bookings?.payment_method === 'pix_upfront',
  );
  const pixAmountCents = pixPaid.reduce((s: number, p: any) => s + (p.amount_cents || 0), 0);

  const sinalPaid = (paidPayments || []).filter(
    (p: any) => p.bookings?.payment_method === 'deposit_plus_on_site',
  );
  const sinalAmountCents = sinalPaid.reduce(
    (s: number, p: any) => s + (p.amount_cents || 0),
    0,
  );

  const onsiteAmountCents = (onsiteBookings || []).reduce(
    (s: number, b: any) => s + (b.total_cents || 0),
    0,
  );

  // Breakdown por quadra (top 5 by faturamento)
  const byResource: Record<string, { id: string; name: string; cents: number }> = {};
  for (const p of paidPayments || []) {
    const r = p.bookings?.resources;
    if (!r) continue;
    if (!byResource[r.id]) byResource[r.id] = { id: r.id, name: r.name, cents: 0 };
    byResource[r.id]!.cents += p.amount_cents || 0;
  }
  for (const b of onsiteBookings || []) {
    const r = b.resources;
    if (!r) continue;
    if (!byResource[r.id]) byResource[r.id] = { id: r.id, name: r.name, cents: 0 };
    byResource[r.id]!.cents += b.total_cents || 0;
  }
  const resourceBreakdown = Object.values(byResource)
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 5)
    .map((r) => ({ id: r.id, name: r.name, amountCents: r.cents }));

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
      labels: dailyLabels,
      values: dailyValues,
    },
    breakdown: [
      {
        method: 'PIX antecipado',
        amountCents: pixAmountCents,
        count: pixPaid.length,
        color: '#10B981',
      },
      {
        method: 'Sinal + presencial',
        amountCents: sinalAmountCents,
        count: sinalPaid.length,
        color: '#3B82F6',
      },
      {
        method: 'Pagar na chegada',
        amountCents: onsiteAmountCents,
        count: (onsiteBookings || []).length,
        color: '#F59E0B',
      },
    ],
    resourceBreakdown,
  };
});
