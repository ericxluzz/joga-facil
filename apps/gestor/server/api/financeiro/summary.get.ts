import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { payments, bookings } from '@agendaslim/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const query = getQuery(event);
  const fromStr = (query.from as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const toStr = (query.to as string) || new Date().toISOString().substring(0, 10);

  const fromDate = new Date(`${fromStr}T00:00:00`);
  const toDate = new Date(`${toStr}T23:59:59`);

  // Query aggregates
  const [totalFaturado] = await db
    .select({ sum: sql<number>`sum(${payments.amountCents})::int` })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.tenantId, tenant.id),
        eq(payments.status, 'paid'),
        gte(payments.paidAt, fromDate),
        lte(payments.paidAt, toDate)
      )
    );

  const [countTransacoes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.tenantId, tenant.id),
        eq(payments.status, 'paid'),
        gte(payments.paidAt, fromDate),
        lte(payments.paidAt, toDate)
      )
    );

  const [reembolsos] = await db
    .select({ sum: sql<number>`sum(${payments.amountCents})::int` })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.tenantId, tenant.id),
        eq(payments.status, 'refunded'),
        gte(payments.updatedAt, fromDate),
        lte(payments.updatedAt, toDate)
      )
    );

  const [pendentes] = await db
    .select({ sum: sql<number>`sum(${payments.amountCents})::int` })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.tenantId, tenant.id),
        eq(payments.status, 'pending'),
        gte(payments.createdAt, fromDate),
        lte(payments.createdAt, toDate)
      )
    );

  const faturamentoTotal = (totalFaturado?.sum || 0) / 100;
  const transacoesCount = countTransacoes?.count || 0;
  const ticketMedio = transacoesCount > 0 ? Number((faturamentoTotal / transacoesCount).toFixed(2)) : 0;
  const reembolsosTotal = (reembolsos?.sum || 0) / 100;
  const pendentesTotal = (pendentes?.sum || 0) / 100;

  // Breakdown by method
  const pixBreakdown = await db
    .select({
      sum: sql<number>`sum(${payments.amountCents})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.tenantId, tenant.id),
        eq(payments.status, 'paid'),
        eq(bookings.paymentMethod, 'pix_upfront'),
        gte(payments.paidAt, fromDate),
        lte(payments.paidAt, toDate)
      )
    );

  const onsiteBreakdown = await db
    .select({
      sum: sql<number>`sum(${bookings.totalCents})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenant.id),
        eq(bookings.status, 'confirmed'),
        eq(bookings.paymentMethod, 'pay_on_site'),
        gte(bookings.startsAt, fromDate),
        lte(bookings.startsAt, toDate)
      )
    );

  return {
    period: {
      from: fromStr,
      to: toStr,
    },
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
      { method: 'PIX antecipado', amountCents: pixBreakdown[0]?.sum || 0, count: pixBreakdown[0]?.count || 0, color: '#10B981' },
      { method: 'Pagar na chegada', amountCents: onsiteBreakdown[0]?.sum || 0, count: onsiteBreakdown[0]?.count || 0, color: '#F59E0B' },
    ],
  };
});
