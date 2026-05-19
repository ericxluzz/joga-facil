import { pgTable, uuid, integer, varchar, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { bookings } from './bookings';

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'expired',
  'refunded',
  'failed',
]);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),

    provider: varchar('provider', { length: 32 }).notNull().default('abacatepay'),
    providerPaymentId: varchar('provider_payment_id', { length: 100 }),
    amountCents: integer('amount_cents').notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),

    // PIX específico
    pixQrCode: varchar('pix_qr_code', { length: 1000 }),
    pixCopiaCola: varchar('pix_copia_cola', { length: 1000 }),

    paidAt: timestamp('paid_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    rawPayload: jsonb('raw_payload'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_payments_booking').on(table.bookingId),
    index('idx_payments_provider_id').on(table.provider, table.providerPaymentId),
    index('idx_payments_status').on(table.status),
  ],
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
