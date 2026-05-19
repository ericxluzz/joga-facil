import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { payments, bookings, resources } from '@agendaslim/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

// GET /api/financeiro/export?from=YYYY-MM-DD&to=YYYY-MM-DD — exporta CSV real
export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const query = getQuery(event);
  const fromStr =
    (query.from as string) ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const toStr = (query.to as string) || new Date().toISOString().substring(0, 10);
  const fromDate = new Date(`${fromStr}T00:00:00`);
  const toDate = new Date(`${toStr}T23:59:59`);

  const rows = await db
    .select({
      id: payments.id,
      createdAt: payments.createdAt,
      customerName: bookings.customerName,
      resourceName: resources.name,
      amountCents: payments.amountCents,
      status: payments.status,
      method: bookings.paymentMethod,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .innerJoin(resources, eq(bookings.resourceId, resources.id))
    .where(
      and(
        eq(bookings.tenantId, tenant.id),
        gte(payments.createdAt, fromDate),
        lte(payments.createdAt, toDate),
      ),
    )
    .orderBy(desc(payments.createdAt));

  const header = ['ID', 'Data', 'Cliente', 'Quadra', 'Valor (R$)', 'Status', 'Método'];
  const dataRows = rows.map((r) => [
    r.id,
    r.createdAt.toISOString().substring(0, 10),
    r.customerName,
    r.resourceName,
    (r.amountCents / 100).toFixed(2).replace('.', ','),
    r.status,
    r.method === 'pix_upfront' ? 'PIX' : 'Na chegada',
  ]);

  const csv = [header, ...dataRows].map((row) => row.join(';')).join('\n');

  setHeader(event, 'content-type', 'text/csv; charset=utf-8');
  setHeader(
    event,
    'content-disposition',
    `attachment; filename="agenda-slim-financeiro-${fromStr}_${toStr}.csv"`,
  );
  return csv;
});
