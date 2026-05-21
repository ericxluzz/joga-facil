-- Migration 0002: ValidaPay subaccounts, KYC tables, admin fields
-- Run with: pnpm drizzle-kit push (or apply via Supabase SQL editor)

-- Enums
DO $$ BEGIN
  CREATE TYPE "public"."person_type" AS ENUM('PF', 'PJ');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."payment_account_status" AS ENUM(
    'not_started', 'draft', 'submitted', 'pending_review',
    'approved', 'rejected', 'blocked'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."payment_document_type" AS ENUM(
    'rg_front', 'rg_back', 'cnh', 'selfie', 'proof_of_address',
    'contrato_social', 'cartao_cnpj', 'representative_doc', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."payment_document_status" AS ENUM(
    'uploaded', 'sent_to_validapay', 'approved', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."withdrawal_status" AS ENUM(
    'requested', 'processing', 'completed', 'failed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- tenant_payment_accounts
CREATE TABLE IF NOT EXISTS "tenant_payment_accounts" (
  "id"                               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"                        uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,

  "person_type"                      "person_type" NOT NULL DEFAULT 'PF',

  "document"                         varchar(30) NOT NULL DEFAULT '',
  "legal_name"                       varchar(255) NOT NULL DEFAULT '',
  "trade_name"                       varchar(255),
  "birth_date"                       date,

  "email"                            varchar(255) NOT NULL DEFAULT '',
  "phone"                            varchar(30) NOT NULL DEFAULT '',

  "address_street"                   varchar(255),
  "address_number"                   varchar(20),
  "address_complement"               varchar(100),
  "address_neighborhood"             varchar(100),
  "address_city"                     varchar(100),
  "address_state"                    varchar(2),
  "address_zipcode"                  varchar(10),

  "representative_name"              varchar(255),
  "representative_document"          varchar(30),
  "representative_birth_date"        date,
  "representative_email"             varchar(255),
  "representative_phone"             varchar(30),

  "estimated_monthly_revenue_cents"  text,

  "status"                           "payment_account_status" NOT NULL DEFAULT 'not_started',
  "validapay_form_id"                varchar(100),
  "validapay_account_number"         varchar(100),
  "validapay_status_raw"             jsonb,

  "rejection_reason"                 text,
  "submitted_at"                     timestamp with time zone,
  "approved_at"                      timestamp with time zone,
  "rejected_at"                      timestamp with time zone,

  "created_at"                       timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"                       timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_payment_account"
  ON "tenant_payment_accounts"("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_account_status"
  ON "tenant_payment_accounts"("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_account_form_id"
  ON "tenant_payment_accounts"("validapay_form_id");--> statement-breakpoint

-- tenant_payment_documents
CREATE TABLE IF NOT EXISTS "tenant_payment_documents" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id"        uuid NOT NULL REFERENCES "tenant_payment_accounts"("id") ON DELETE cascade,
  "document_type"     "payment_document_type" NOT NULL,
  "file_url"          text NOT NULL,
  "file_storage_key"  text NOT NULL,
  "mime_type"         varchar(100),
  "status"            "payment_document_status" NOT NULL DEFAULT 'uploaded',
  "created_at"        timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"        timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_payment_docs_account"
  ON "tenant_payment_documents"("account_id");--> statement-breakpoint

-- withdrawals
CREATE TABLE IF NOT EXISTS "withdrawals" (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"              uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "account_id"             uuid NOT NULL REFERENCES "tenant_payment_accounts"("id"),
  "amount_cents"           integer NOT NULL,
  "status"                 "withdrawal_status" NOT NULL DEFAULT 'requested',
  "provider_withdrawal_id" varchar(100),
  "provider_payload"       jsonb,
  "failure_reason"         text,
  "requested_at"           timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at"           timestamp with time zone,
  "created_at"             timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"             timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_withdrawals_tenant"
  ON "withdrawals"("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_withdrawals_status"
  ON "withdrawals"("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_withdrawals_provider_id"
  ON "withdrawals"("provider_withdrawal_id");--> statement-breakpoint

-- platform_settings (singleton)
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id"                         uuid PRIMARY KEY,
  "default_platform_fee_cents" integer NOT NULL DEFAULT 500,
  "pix_expiration_minutes"     integer NOT NULL DEFAULT 15,
  "validapay_env"              varchar(20) NOT NULL DEFAULT 'sandbox',
  "maintenance_mode"           boolean NOT NULL DEFAULT false,
  "updated_at"                 timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

INSERT INTO "platform_settings" ("id", "default_platform_fee_cents", "pix_expiration_minutes", "validapay_env")
VALUES ('00000000-0000-0000-0000-000000000001', 500, 15, 'sandbox')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

-- Add is_platform_admin to users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_platform_admin" boolean NOT NULL DEFAULT false;--> statement-breakpoint

-- Migrate existing validapayAccountId from settings JSONB to tenant_payment_accounts
-- (creates a draft/approved record for tenants that already have an account configured)
INSERT INTO "tenant_payment_accounts" (
  "id", "tenant_id", "status", "validapay_account_number",
  "document", "legal_name", "email", "phone",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  t.id,
  CASE
    WHEN (t.settings->>'paymentOnboardingStatus') = 'approved' THEN 'approved'::payment_account_status
    WHEN (t.settings->>'paymentOnboardingStatus') = 'pending'  THEN 'pending_review'::payment_account_status
    WHEN (t.settings->>'paymentOnboardingStatus') = 'rejected' THEN 'rejected'::payment_account_status
    ELSE 'not_started'::payment_account_status
  END,
  t.settings->>'validapayAccountId',
  '', '', '', '',
  now(), now()
FROM "tenants" t
WHERE t.settings->>'validapayAccountId' IS NOT NULL
   OR t.settings->>'paymentOnboardingStatus' IS NOT NULL
ON CONFLICT ("tenant_id") DO NOTHING;
