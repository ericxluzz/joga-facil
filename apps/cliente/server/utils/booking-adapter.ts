// Adapter Drizzle do BookingAdapter (interface do @agendaslim/core).
// Conecta a lógica pura de createHold/confirmAfterPayment ao DB real.
// Redis hold é opcional — se UPSTASH não configurado, só Postgres (constraint única já protege).

import type { BookingAdapter } from '@agendaslim/core';
import { db } from '@agendaslim/db/client';
import { bookings } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

export function makeDbBookingAdapter(serviceId: string): BookingAdapter {
  return {
    async insertBookingHold(args) {
      const [row] = await db
        .insert(bookings)
        .values({
          tenantId: args.tenantId,
          resourceId: args.resourceId,
          serviceId,
          customerId: args.customerId ?? null,
          customerName: args.customerName,
          customerPhone: args.customerPhone,
          customerEmail: args.customerEmail ?? null,
          startsAt: args.startsAt,
          endsAt: args.endsAt,
          totalCents: args.totalCents,
          status: 'hold',
          paymentMethod: args.paymentMethod,
          expiresAt: args.expiresAt,
          customerNotes: args.customerNotes ?? null,
        })
        .returning({ id: bookings.id });
      return { id: row.id };
    },

    async setRedisHold(key, ttlSeconds) {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (!url || !token) return; // Fallback: sem Redis, só Postgres
      try {
        await fetch(`${url}/set/${encodeURIComponent(key)}/1?EX=${ttlSeconds}`, {
          headers: { authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.warn('[booking-adapter] Redis hold falhou (segue só com Postgres):', err);
      }
    },

    async releaseHold(bookingId) {
      await db
        .update(bookings)
        .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));
    },

    async confirmBooking(bookingId, confirmedAt) {
      await db
        .update(bookings)
        .set({ status: 'confirmed', confirmedAt, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));
    },
  };
}
