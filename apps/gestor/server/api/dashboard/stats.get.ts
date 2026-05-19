import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { bookings, resources } from '@agendaslim/db/schema';
import { eq, and, gte, lte, sql, asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // 1. Reservas de hoje
  const [todayCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenant.id),
        gte(bookings.startsAt, startOfDay),
        lte(bookings.startsAt, endOfDay),
        sql`${bookings.status} != 'cancelled'`
      )
    );

  // 2. Faturamento do mês
  const [faturamentoResult] = await db
    .select({ sum: sql<number>`sum(${bookings.totalCents})::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenant.id),
        gte(bookings.startsAt, startOfMonth),
        lte(bookings.startsAt, endOfMonth),
        eq(bookings.status, 'confirmed')
      )
    );

  // 3. Aprovações pendentes
  const [pendingCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenant.id),
        eq(bookings.status, 'pending_approval'),
        gte(bookings.startsAt, now)
      )
    );

  // 4. Próximas reservas (Top 5)
  const nextBookings = await db
    .select({
      id: bookings.id,
      cliente: bookings.customerName,
      quadra: resources.name,
      startsAt: bookings.startsAt,
      status: bookings.status,
      valor: bookings.totalCents,
    })
    .from(bookings)
    .innerJoin(resources, eq(bookings.resourceId, resources.id))
    .where(
      and(
        eq(bookings.tenantId, tenant.id),
        gte(bookings.startsAt, now)
      )
    )
    .orderBy(asc(bookings.startsAt))
    .limit(5);

  const proximasReservas = nextBookings.map(b => {
    const starts = b.startsAt;
    let dataHora = '';
    
    const isToday = starts.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = starts.toDateString() === tomorrow.toDateString();

    const timeStr = starts.toISOString().substring(11, 16);

    if (isToday) {
      dataHora = `Hoje, ${timeStr}`;
    } else if (isTomorrow) {
      dataHora = `Amanhã, ${timeStr}`;
    } else {
      const day = String(starts.getDate()).padStart(2, '0');
      const month = String(starts.getMonth() + 1).padStart(2, '0');
      dataHora = `${day}/${month}, ${timeStr}`;
    }

    return {
      id: b.id,
      cliente: b.cliente,
      quadra: b.quadra,
      dataHora,
      status: b.status,
      valor: b.valor / 100,
    };
  });

  const faturamentoMes = (faturamentoResult?.sum || 0) / 100;
  const reservasHoje = todayCountResult?.count || 0;
  const aprovacoesPendentes = pendingCountResult?.count || 0;

  return {
    kpis: {
      reservasHoje,
      faturamentoMes,
      faturamentoComparacao: '+0% vs mês passado',
      ocupacaoSemana: 0,
      aprovacoesPendentes
    },
    proximasReservas,
    chartData: {
      labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      datasets: [
        {
          label: 'Ocupação (%)',
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: '#10B981',
          borderRadius: 4
        }
      ]
    },
    timeline: [
      { titulo: 'Cadastro completo', detalhe: 'Você terminou o onboarding!', tempo: 'Hoje', icon: 'pi pi-star', color: '#3B82F6' }
    ]
  };
});
