// POST /api/r/[slug]/hold — cria hold real no DB usando o core createHold
import { getTenantBySlug } from '../../../utils/tenant';
import { makeDbBookingAdapter } from '../../../utils/booking-adapter';
import { createHold } from '@agendaslim/core/bookings';
import { normalizeCheckoutMethod } from '../../../utils/payments/checkout';

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  if (!slug) throw createError({ statusCode: 400, message: 'slug obrigatório' });

  const tenant = await getTenantBySlug(slug);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  if (!body.customer?.name || !body.customer?.phone || !Array.isArray(body.slots) || body.slots.length === 0) {
    throw createError({ statusCode: 400, message: 'customer e slots obrigatórios' });
  }

  // Pega o serviceId do primeiro slot (todos do mesmo recurso/serviço no MVP)
  const firstSlot = body.slots[0];
  const serviceId = firstSlot.serviceId;
  if (!serviceId) throw createError({ statusCode: 400, message: 'serviceId obrigatório no slot' });

  const adapter = makeDbBookingAdapter(serviceId);
  const settings = (tenant.settings as any) || {};
  const holdMinutes = settings.holdMinutes ?? 10;
  const paymentMethod = normalizeCheckoutMethod(body.method);

  try {
    const result = await createHold(
      adapter,
      {
        tenantId: tenant.id,
        customerName: body.customer.name,
        customerPhone: body.customer.phone,
        customerEmail: body.customer.email,
        items: body.slots.map((s: any) => ({
          resourceId: s.resourceId,
          serviceId: s.serviceId || serviceId,
          startsAt: new Date(s.startsAt),
          endsAt: new Date(s.endsAt),
          priceCents: s.priceCents,
        })),
        paymentMethod,
        customerNotes: body.notes,
      },
      holdMinutes,
    );

    return {
      holdId: result.bookingIds[0], // representativo
      bookingIds: result.bookingIds,
      expiresAt: result.expiresAt.toISOString(),
      totalCents: result.totalCents,
    };
  } catch (err: any) {
    if (err?.code === 'SLOT_UNAVAILABLE') {
      throw createError({ statusCode: 409, message: err.message });
    }
    throw err;
  }
});
