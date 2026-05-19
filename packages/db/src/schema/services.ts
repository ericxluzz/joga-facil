import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { resources } from './resources';

// Tipos de serviço (ex: "1h society", "2h society com bola")
export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }),
    durationMinutes: integer('duration_minutes').notNull(),
    basePriceCents: integer('base_price_cents').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_services_tenant').on(table.tenantId),
    index('idx_services_resource').on(table.resourceId),
  ],
);

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
