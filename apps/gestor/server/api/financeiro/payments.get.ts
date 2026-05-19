import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { payments, bookings, resources } from '@agendaslim/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const query = getQuery(event);
  const status = query.status as string | undefined;

  const conditions = [eq(bookings.tenantId, tenant.id)];
  if (status) {
    conditions.push(eq(payments.status, status as any));
  }

  const result = await db
    .select({
      id: payments.id,
      bookingId: payments.bookingId,
      customerName: bookings.customerName,
      resourceName: resources.name,
      amountCents: payments.amountCents,
      status: payments.status,
      method: bookings.paymentMethod,
      createdAt: payments.createdAt,
      paidAt: payments.paidAt,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .innerJoin(resources, eq(bookings.resourceId, resources.id))
    .where(and(...conditions))
    .orderBy(desc(payments.createdAt));

  const list = result.map(p => ({
    id: p.id,
    bookingId: p.bookingId,
    customerName: p.customerName,
    resourceName: p.resourceName,
    amountCents: p.amountCents,
    status: p.status,
    method: p.method === 'pix_upfront' ? 'PIX' : 'Na chegada',
    date: p.createdAt.toISOString().substring(0, 10),
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
  }));

  return { payments: list, total: list.length };
});
