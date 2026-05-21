import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { tenantPaymentAccounts } from './tenant-payment-accounts';

export const documentTypeEnum = pgEnum('payment_document_type', [
  'rg_front',
  'rg_back',
  'cnh',
  'selfie',
  'proof_of_address',
  'contrato_social',
  'cartao_cnpj',
  'representative_doc',
  'other',
]);

export const documentStatusEnum = pgEnum('payment_document_status', [
  'uploaded',
  'sent_to_validapay',
  'approved',
  'rejected',
]);

export const tenantPaymentDocuments = pgTable(
  'tenant_payment_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => tenantPaymentAccounts.id, { onDelete: 'cascade' }),

    documentType: documentTypeEnum('document_type').notNull(),
    fileUrl: text('file_url').notNull(),
    fileStorageKey: text('file_storage_key').notNull(),
    mimeType: varchar('mime_type', { length: 100 }),
    status: documentStatusEnum('status').notNull().default('uploaded'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_payment_docs_account').on(table.accountId),
  ],
);

export type TenantPaymentDocument = typeof tenantPaymentDocuments.$inferSelect;
export type NewTenantPaymentDocument = typeof tenantPaymentDocuments.$inferInsert;
export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
