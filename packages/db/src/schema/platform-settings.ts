import {
  pgTable,
  uuid,
  integer,
  varchar,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

// Singleton table (one row, id = '00000000-0000-0000-0000-000000000001').
export const platformSettings = pgTable('platform_settings', {
  id: uuid('id').primaryKey(),
  defaultPlatformFeeCents: integer('default_platform_fee_cents').notNull().default(500),
  pixExpirationMinutes: integer('pix_expiration_minutes').notNull().default(15),
  validapayEnv: varchar('validapay_env', { length: 20 }).notNull().default('sandbox'),
  maintenanceMode: boolean('maintenance_mode').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;

export const PLATFORM_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';
