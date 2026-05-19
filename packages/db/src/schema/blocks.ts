import { pgTable, uuid, timestamp, varchar, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { resources } from './resources';

// Bloqueios manuais: manutenção, feriado, "fechado dia X"
export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    reason: varchar('reason', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_blocks_resource_time').on(table.resourceId, table.startsAt, table.endsAt),
    index('idx_blocks_tenant').on(table.tenantId),
  ],
);

export type Block = typeof blocks.$inferSelect;
export type NewBlock = typeof blocks.$inferInsert;
