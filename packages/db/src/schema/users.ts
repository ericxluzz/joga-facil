import { pgTable, uuid, text, timestamp, varchar, boolean, pgEnum, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const userRoleEnum = pgEnum('user_role', ['owner', 'operator', 'customer']);

// users espelha auth.users do Supabase via id (uuid). Não é populada manualmente.
// Use auth.users como source of truth para credenciais.
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // matches auth.users.id
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 200 }),
  phone: varchar('phone', { length: 32 }),
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Vínculo N:N entre users e tenants (um operador pode atender múltiplos estabelecimentos)
export const tenantUsers = pgTable(
  'tenant_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull().default('owner'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('uq_tenant_user').on(table.tenantId, table.userId)],
);

export type User = typeof users.$inferSelect;
export type TenantUser = typeof tenantUsers.$inferSelect;
