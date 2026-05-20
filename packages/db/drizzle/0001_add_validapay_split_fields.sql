ALTER TYPE "public"."payment_method" ADD VALUE IF NOT EXISTS 'deposit_plus_on_site';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_account_id" varchar(100);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "seller_amount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "platform_fee_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "due_on_site_cents" integer DEFAULT 0 NOT NULL;
