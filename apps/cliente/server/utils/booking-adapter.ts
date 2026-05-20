// Adapter supabase-js do BookingAdapter (interface do @agendaslim/core).
// Usa HTTPS em vez de TCP direto — compatível com Vercel IPv4.
import type { BookingAdapter } from '@agendaslim/core';
import { createSupabaseAdmin } from './supabase-admin';

export function makeDbBookingAdapter(serviceId: string): BookingAdapter {
  const admin = createSupabaseAdmin();

  return {
    async insertBookingHold(args) {
      const { data, error } = await admin
        .from('bookings')
        .insert({
          tenant_id: args.tenantId,
          resource_id: args.resourceId,
          service_id: serviceId,
          customer_id: args.customerId ?? null,
          customer_name: args.customerName,
          customer_phone: args.customerPhone,
          customer_email: args.customerEmail ?? null,
          starts_at: args.startsAt.toISOString(),
          ends_at: args.endsAt.toISOString(),
          total_cents: args.totalCents,
          status: 'hold',
          payment_method: args.paymentMethod,
          expires_at: args.expiresAt?.toISOString() ?? null,
          customer_notes: args.customerNotes ?? null,
        })
        .select('id')
        .single();

      if (error) throw new Error(`Erro ao criar hold: ${error.message}`);
      return { id: data!.id };
    },

    async setRedisHold(key, ttlSeconds) {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (!url || !token) return;
      try {
        await fetch(`${url}/set/${encodeURIComponent(key)}/1?EX=${ttlSeconds}`, {
          headers: { authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.warn('[booking-adapter] Redis hold falhou (segue só com Postgres):', err);
      }
    },

    async releaseHold(bookingId) {
      await admin
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
    },

    async confirmBooking(bookingId, confirmedAt) {
      await admin
        .from('bookings')
        .update({
          status: 'confirmed',
          confirmed_at: confirmedAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
    },
  };
}
