import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

// Log de operações importantes (cancelamento, aprovação manual, suspensão, etc.)
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 64 }).notNull(),
    entityType: varchar('entity_type', { length: 32 }).notNull(),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_tenant_time').on(table.tenantId, table.createdAt),
    index('idx_audit_entity').on(table.entityType, table.entityId),
  ],
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
