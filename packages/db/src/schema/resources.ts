import { pgTable, uuid, varchar, jsonb, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export type ResourceConfig = {
  // Configurações específicas do recurso (quadra)
  capacity?: number;
  notes?: string;
};

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    type: varchar('type', { length: 32 }).notNull().default('society'), // society, padel, beach, tennis
    photoUrl: varchar('photo_url', { length: 500 }),
    config: jsonb('config').$type<ResourceConfig>().notNull().default({}),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_resources_tenant').on(table.tenantId)],
);

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
