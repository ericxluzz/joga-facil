import { db } from '@agendaslim/db/client';
import { bookings, tenants, services } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/r/[slug]/hold — cria hold de carrinho
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  const body = await readBody(event);

  if (!slug || !body.slots || body.slots.length === 0) {
    throw createError({ statusCode: 400, message: 'Faltam parâmetros obrigatórios' });
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const tenantServices = await db
    .select()
    .from(services)
    .where(eq(services.tenantId, tenant.id))
    .limit(1);

  if (tenantServices.length === 0) {
    throw createError({ statusCode: 500, message: 'Nenhum serviço configurado neste estabelecimento' });
  }
  const serviceId = tenantServices[0].id;

  const holdMinutes = tenant.settings.holdMinutes || 10;
  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

  const insertedBookings: any[] = [];

  try {
    await db.transaction(async (tx) => {
      for (const slot of body.slots) {
        const startsAt = new Date(slot.startsAt);
        const endsAt = new Date(slot.endsAt);

        const [newBooking] = await tx
          .insert(bookings)
          .values({
            tenantId: tenant.id,
            resourceId: slot.resourceId,
            serviceId,
            customerName: body.customerName || 'Cliente PWA',
            customerPhone: body.customerPhone || '000000000',
            startsAt,
            endsAt,
            totalCents: slot.priceCents || 10000,
            status: 'hold',
            paymentMethod: body.paymentMethod === 'pay_on_site' ? 'pay_on_site' : 'pix_upfront',
            expiresAt,
          })
          .returning();

        insertedBookings.push(newBooking);
      }
    });
  } catch (err: any) {
    console.error('Hold creation error:', err);
    throw createError({ statusCode: 409, message: 'Um ou mais horários selecionados já foram reservados. Escolha outros horários.' });
  }

  const totalCents = insertedBookings.reduce((sum, b) => sum + b.totalCents, 0);

  return {
    holdId: `hold-${Date.now()}`,
    slug,
    bookingIds: insertedBookings.map(b => b.id),
    expiresAt: expiresAt.toISOString(),
    totalCents,
  };
});
