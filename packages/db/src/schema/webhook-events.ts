import { pgTable, varchar, timestamp, jsonb, primaryKey, index } from 'drizzle-orm/pg-core';

// Tabela de idempotência: garante que o mesmo webhook só seja processado uma vez.
// PK composta de (provider, external_id) — não usamos uuid pra prevenir duplicatas pelo provider.
export const webhookEvents = pgTable(
  'webhook_events',
  {
    provider: varchar('provider', { length: 32 }).notNull(),
    externalId: varchar('external_id', { length: 100 }).notNull(),
    eventType: varchar('event_type', { length: 64 }),
    payload: jsonb('payload').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    error: varchar('error', { length: 1000 }),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.externalId] }),
    index('idx_webhook_events_processed').on(table.processedAt),
  ],
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
