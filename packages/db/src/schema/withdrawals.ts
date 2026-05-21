import {
  pgTable,
  uuid,
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { tenantPaymentAccounts } from './tenant-payment-accounts';

export const withdrawalStatusEnum = pgEnum('withdrawal_status', [
  'requested',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

export const withdrawals = pgTable(
  'withdrawals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => tenantPaymentAccounts.id),

    amountCents: integer('amount_cents').notNull(),
    status: withdrawalStatusEnum('status').notNull().default('requested'),

    providerWithdrawalId: varchar('provider_withdrawal_id', { length: 100 }),
    providerPayload: jsonb('provider_payload'),
    failureReason: text('failure_reason'),

    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_withdrawals_tenant').on(table.tenantId),
    index('idx_withdrawals_status').on(table.status),
    index('idx_withdrawals_provider_id').on(table.providerWithdrawalId),
  ],
);

export type Withdrawal = typeof withdrawals.$inferSelect;
export type NewWithdrawal = typeof withdrawals.$inferInsert;
export type WithdrawalStatus = (typeof withdrawalStatusEnum.enumValues)[number];
