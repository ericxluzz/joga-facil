import {
  pgTable,
  uuid,
  timestamp,
  integer,
  varchar,
  pgEnum,
  uniqueIndex,
  index,
  text,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { resources } from './resources';
import { services } from './services';
import { users } from './users';

// Status transitions:
//   hold              -> confirmed (após PIX pago)
//   hold              -> cancelled (timeout)
//   pending_approval  -> confirmed (gestor aprovou)
//   pending_approval  -> cancelled (gestor recusou ou timeout)
//   confirmed         -> cancelled (cancelamento manual)
//   confirmed         -> no_show (cliente não compareceu)
export const bookingStatusEnum = pgEnum('booking_status', [
  'hold',
  'pending_approval',
  'confirmed',
  'cancelled',
  'no_show',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'pix_upfront',
  'pay_on_site',
  'deposit_plus_on_site',
]);

// CORE TABLE
// IMPORTANTE: a constraint única `uq_booking_active_slot` previne race condition.
// Dois clientes não conseguem inserir hold/confirmed no mesmo (resource_id, starts_at).
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),

    // Cliente: pode ter conta (customerId preenchido) ou ser anônimo (apenas customer_name/phone)
    customerId: uuid('customer_id').references(() => users.id, { onDelete: 'set null' }),
    customerName: varchar('customer_name', { length: 200 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 32 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }),

    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),

    totalCents: integer('total_cents').notNull(),
    status: bookingStatusEnum('status').notNull().default('hold'),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),

    // Expiração do hold (para status='hold' ou 'pending_approval')
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    // Notas
    customerNotes: text('customer_notes'),
    internalNotes: text('internal_notes'),
    cancellationReason: text('cancellation_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => [
    // CRÍTICO: previne race condition de reserva
    // Postgres aceita esse partial unique index via sql template
    uniqueIndex('uq_booking_active_slot')
      .on(table.resourceId, table.startsAt)
      .where(sql`status IN ('hold', 'pending_approval', 'confirmed')`),

    index('idx_bookings_tenant_time').on(table.tenantId, table.startsAt),
    index('idx_bookings_resource_time').on(table.resourceId, table.startsAt),
    index('idx_bookings_customer').on(table.customerId),
    index('idx_bookings_status_expires').on(table.status, table.expiresAt),
  ],
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
