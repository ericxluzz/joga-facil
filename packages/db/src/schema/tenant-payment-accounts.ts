import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  date,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const personTypeEnum = pgEnum('person_type', ['PF', 'PJ']);

export const paymentAccountStatusEnum = pgEnum('payment_account_status', [
  'not_started',
  'draft',
  'submitted',
  'pending_review',
  'approved',
  'rejected',
  'blocked',
]);

export const tenantPaymentAccounts = pgTable(
  'tenant_payment_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    personType: personTypeEnum('person_type').notNull().default('PF'),

    // Identity
    document: varchar('document', { length: 30 }).notNull().default(''),
    legalName: varchar('legal_name', { length: 255 }).notNull().default(''),
    tradeName: varchar('trade_name', { length: 255 }),
    birthDate: date('birth_date'),

    // Contact
    email: varchar('email', { length: 255 }).notNull().default(''),
    phone: varchar('phone', { length: 30 }).notNull().default(''),

    // Address
    addressStreet: varchar('address_street', { length: 255 }),
    addressNumber: varchar('address_number', { length: 20 }),
    addressComplement: varchar('address_complement', { length: 100 }),
    addressNeighborhood: varchar('address_neighborhood', { length: 100 }),
    addressCity: varchar('address_city', { length: 100 }),
    addressState: varchar('address_state', { length: 2 }),
    addressZipcode: varchar('address_zipcode', { length: 10 }),

    // PJ representative
    representativeName: varchar('representative_name', { length: 255 }),
    representativeDocument: varchar('representative_document', { length: 30 }),
    representativeBirthDate: date('representative_birth_date'),
    representativeEmail: varchar('representative_email', { length: 255 }),
    representativePhone: varchar('representative_phone', { length: 30 }),

    // Financial details (required by ValidaPay)
    estimatedMonthlyRevenueCents: text('estimated_monthly_revenue_cents'),

    // ValidaPay integration
    status: paymentAccountStatusEnum('status').notNull().default('not_started'),
    validapayFormId: varchar('validapay_form_id', { length: 100 }),
    validapayAccountNumber: varchar('validapay_account_number', { length: 100 }),
    validapayStatusRaw: jsonb('validapay_status_raw'),

    // Review info
    rejectionReason: text('rejection_reason'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_payment_account').on(table.tenantId),
    index('idx_payment_account_status').on(table.status),
    index('idx_payment_account_form_id').on(table.validapayFormId),
  ],
);

export type TenantPaymentAccount = typeof tenantPaymentAccounts.$inferSelect;
export type NewTenantPaymentAccount = typeof tenantPaymentAccounts.$inferInsert;
export type PaymentAccountStatus = (typeof paymentAccountStatusEnum.enumValues)[number];
export type PersonType = (typeof personTypeEnum.enumValues)[number];
