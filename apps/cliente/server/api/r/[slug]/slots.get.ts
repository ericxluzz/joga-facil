import { db } from '@agendaslim/db/client';
import { bookings, tenants } from '@agendaslim/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

// GET /api/r/[slug]/slots?date=YYYY-MM-DD&resourceId=... — grade de slots real
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  const query = getQuery(event);
  const date = query.date as string | undefined;
  const resourceId = query.resourceId as string | undefined;

  if (!slug || !date || !resourceId) {
    throw createError({ statusCode: 400, message: 'slug, date e resourceId são obrigatórios' });
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const startOfDay = new Date(`${date}T00:00:00`);
  const endOfDay = new Date(`${date}T23:59:59`);

  const activeBookings = await db
    .select({ startsAt: bookings.startsAt })
    .from(bookings)
    .where(
      and(
        eq(bookings.resourceId, resourceId),
        gte(bookings.startsAt, startOfDay),
        lte(bookings.startsAt, endOfDay),
        sql`status IN ('hold', 'pending_approval', 'confirmed')`
      )
    );

  const bookedTimes = new Set(
    activeBookings.map(b => {
      // Formata startsAt em HH:MM
      const hours = String(b.startsAt.getHours()).padStart(2, '0');
      const minutes = String(b.startsAt.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    })
  );

  const isWeekend = isWeekendDay(date);
  const startHour = isWeekend ? 8 : 18;
  const endHour = 23;
  const peakHours = [18, 19, 20, 21];

  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    const time = `${String(h).padStart(2, '0')}:00`;
    const isPeak = peakHours.includes(h);
    const available = !bookedTimes.has(time);

    slots.push({
      id: `${date}-${resourceId}-${time}`,
      resourceId,
      time,
      startsAt: `${date}T${time}:00`,
      endsAt: `${date}T${String(h + 1).padStart(2, '0')}:00:00`,
      durationMinutes: 60,
      priceCents: isPeak ? 13000 : 10000,
      isPeak,
      available,
    });
  }

  return { slug, date, resourceId, slots };
});

function isWeekendDay(date: string): boolean {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6;
}
