import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { bookings, resources } from '@agendaslim/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const query = getQuery(event);
  
  const conditions = [eq(bookings.tenantId, tenant.id)];

  if (query.date) {
    // query.date format is 'YYYY-MM-DD'
    conditions.push(sql`DATE(${bookings.startsAt} AT TIME ZONE ${tenant.timezone}) = ${query.date}`);
  }

  if (query.status) {
    conditions.push(eq(bookings.status, query.status as any));
  }

  const result = await db
    .select({
      id: bookings.id,
      resourceId: bookings.resourceId,
      resourceName: resources.name,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      priceCents: bookings.totalCents,
    })
    .from(bookings)
    .innerJoin(resources, eq(bookings.resourceId, resources.id))
    .where(and(...conditions))
    .orderBy(bookings.startsAt);

  const mapped = result.map(b => {
    // Extract times (HH:MM)
    const startTime = b.startsAt.toISOString().substring(11, 16);
    const endTime = b.endsAt.toISOString().substring(11, 16);
    const dateStr = b.startsAt.toISOString().substring(0, 10);

    return {
      id: b.id,
      resourceId: b.resourceId,
      resourceName: b.resourceName,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      date: dateStr,
      startTime,
      endTime,
      status: b.status,
      priceCents: b.priceCents,
    };
  });

  return { bookings: mapped };
});
