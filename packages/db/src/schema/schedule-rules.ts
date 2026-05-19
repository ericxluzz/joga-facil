import {
  pgTable,
  uuid,
  integer,
  time,
  date,
  numeric,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { resources } from './resources';

// Regras de disponibilidade + modificador de preço (peak/off-peak)
// price_modifier: 1.0 = preço base, 1.3 = peak +30%, 0.8 = off-peak -20%
export const scheduleRules = pgTable(
  'schedule_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').notNull(), // 0=domingo, 6=sábado
    startTime: time('start_time').notNull(), // ex: '08:00'
    endTime: time('end_time').notNull(), // ex: '23:00'
    priceModifier: numeric('price_modifier', { precision: 4, scale: 2 }).notNull().default('1.00'),
    validFrom: date('valid_from'),
    validTo: date('valid_to'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_schedule_rules_resource_weekday').on(table.resourceId, table.weekday),
    index('idx_schedule_rules_tenant').on(table.tenantId),
  ],
);

export type ScheduleRule = typeof scheduleRules.$inferSelect;
export type NewScheduleRule = typeof scheduleRules.$inferInsert;
