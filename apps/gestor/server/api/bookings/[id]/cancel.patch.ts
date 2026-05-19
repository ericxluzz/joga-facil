import { db } from '@agendaslim/db/client';
import { bookings } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'ID obrigatório' });

  const [booking] = await db
    .update(bookings)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, id))
    .returning();

  if (!booking) {
    throw createError({ statusCode: 404, statusMessage: 'Reserva não encontrada' });
  }

  return { success: true, booking };
});
