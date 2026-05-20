import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const admin = createSupabaseAdmin();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Reservas de hoje
  const { data: todayBookings } = await admin
    .from('bookings')
    .select('id')
    .eq('tenant_id', tenant.id)
    .neq('status', 'cancelled')
    .gte('starts_at', startOfDay)
    .lte('starts_at', endOfDay);

  // Faturamento do mês (bookings confirmadas)
  const { data: monthBookings } = await admin
    .from('bookings')
    .select('total_cents')
    .eq('tenant_id', tenant.id)
    .eq('status', 'confirmed')
    .gte('starts_at', startOfMonth)
    .lte('starts_at', endOfMonth);

  // Aprovações pendentes
  const { data: pendingBookings } = await admin
    .from('bookings')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('status', 'pending_approval')
    .gte('starts_at', now.toISOString());

  // Próximas reservas (Top 5)
  const { data: nextRows } = await admin
    .from('bookings')
    .select('id, customer_name, starts_at, status, total_cents, resources(name)')
    .eq('tenant_id', tenant.id)
    .gte('starts_at', now.toISOString())
    .order('starts_at')
    .limit(5);

  const faturamentoMes = (monthBookings || []).reduce((s: number, b: any) => s + (b.total_cents || 0), 0) / 100;
  const reservasHoje = todayBookings?.length || 0;
  const aprovacoesPendentes = pendingBookings?.length || 0;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const proximasReservas = (nextRows || []).map((b: any) => {
    const starts = new Date(b.starts_at);
    const timeStr = starts.toISOString().substring(11, 16);
    const isToday = starts.toDateString() === now.toDateString();
    const isTomorrow = starts.toDateString() === tomorrow.toDateString();
    let dataHora = '';
    if (isToday) dataHora = `Hoje, ${timeStr}`;
    else if (isTomorrow) dataHora = `Amanhã, ${timeStr}`;
    else {
      const day = String(starts.getDate()).padStart(2, '0');
      const month = String(starts.getMonth() + 1).padStart(2, '0');
      dataHora = `${day}/${month}, ${timeStr}`;
    }
    return {
      id: b.id,
      cliente: b.customer_name,
      quadra: b.resources?.name ?? '',
      dataHora,
      status: b.status,
      valor: (b.total_cents || 0) / 100,
    };
  });

  return {
    kpis: {
      reservasHoje,
      faturamentoMes,
      faturamentoComparacao: '+0% vs mês passado',
      ocupacaoSemana: 0,
      aprovacoesPendentes,
    },
    proximasReservas,
    chartData: {
      labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      datasets: [
        { label: 'Ocupação (%)', data: [0, 0, 0, 0, 0, 0, 0], backgroundColor: '#10B981', borderRadius: 4 },
      ],
    },
    timeline: [
      { titulo: 'Cadastro completo', detalhe: 'Você terminou o onboarding!', tempo: 'Hoje', icon: 'pi pi-star', color: '#3B82F6' },
    ],
  };
});
