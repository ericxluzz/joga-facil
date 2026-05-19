import { pgTable, uuid, text, timestamp, jsonb, varchar, pgEnum } from 'drizzle-orm/pg-core';

export const tenantPlanEnum = pgEnum('tenant_plan', ['trial', 'mvp', 'pro']);
export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'suspended', 'cancelled']);

export type TenantSettings = {
  // Reserva
  requireRegistration: boolean;
  acceptPayOnSite: boolean;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  holdMinutes: number;
  payOnSiteTimeoutMinutes: number;
  cancellationPolicy: string;

  // Branding mínimo do estabelecimento
  description?: string;
  whatsapp?: string;
  instagram?: string;
};

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  timezone: varchar('timezone', { length: 64 }).notNull().default('America/Sao_Paulo'),
  type: varchar('type', { length: 32 }).notNull().default('society'),
  photoUrl: text('photo_url'),
  address: text('address'),
  settings: jsonb('settings').$type<TenantSettings>().notNull(),
  plan: tenantPlanEnum('plan').notNull().default('trial'),
  status: tenantStatusEnum('status').notNull().default('active'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

// Settings default usados ao criar tenant novo
export const defaultTenantSettings: TenantSettings = {
  requireRegistration: false,
  acceptPayOnSite: false,
  minAdvanceMinutes: 60,
  maxAdvanceDays: 30,
  holdMinutes: 10,
  payOnSiteTimeoutMinutes: 60,
  cancellationPolicy:
    'Cancelamentos com mais de 24h de antecedência são reembolsados integralmente.',
};
