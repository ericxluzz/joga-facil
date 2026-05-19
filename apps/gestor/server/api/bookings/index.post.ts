import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { bookings, services } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  if (!body.customerName || !body.resourceId || !body.startTime || !body.endTime || !body.date) {
    throw createError({ statusCode: 400, statusMessage: 'Faltam campos obrigatórios' });
  }

  let serviceId: string;
  const existingServices = await db.select().from(services).where(eq(services.tenantId, tenant.id)).limit(1);
  if (existingServices[0]) {
    serviceId = existingServices[0].id;
  } else {
    const [defaultSvc] = await db
      .insert(services)
      .values({
        tenantId: tenant.id,
        name: 'Reserva Manual',
        durationMinutes: 60,
        basePriceCents: 10000,
        active: true,
      })
      .returning();
    serviceId = defaultSvc.id;
  }

  const startsAt = new Date(`${body.date}T${body.startTime}:00`);
  const endsAt = new Date(`${body.date}T${body.endTime}:00`);

  const [newBooking] = await db
    .insert(bookings)
    .values({
      tenantId: tenant.id,
      resourceId: body.resourceId,
      serviceId,
      customerName: body.customerName,
      customerPhone: body.customerPhone || '',
      startsAt,
      endsAt,
      totalCents: body.priceCents || 10000,
      status: body.status || 'confirmed',
      paymentMethod: 'pay_on_site',
    })
    .returning();

  return { success: true, booking: newBooking };
});
