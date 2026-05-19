CREATE TYPE "public"."tenant_plan" AS ENUM('trial', 'mvp', 'pro');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'operator', 'customer');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('hold', 'pending_approval', 'confirmed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('pix_upfront', 'pay_on_site');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'expired', 'refunded', 'failed');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(200) NOT NULL,
	"timezone" varchar(64) DEFAULT 'America/Sao_Paulo' NOT NULL,
	"type" varchar(32) DEFAULT 'society' NOT NULL,
	"photo_url" text,
	"address" text,
	"settings" jsonb NOT NULL,
	"plan" "tenant_plan" DEFAULT 'trial' NOT NULL,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tenant_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_user" UNIQUE("tenant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(200),
	"phone" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(32) DEFAULT 'society' NOT NULL,
	"photo_url" varchar(500),
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"resource_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"duration_minutes" integer NOT NULL,
	"base_price_cents" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"price_modifier" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"resource_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"customer_id" uuid,
	"customer_name" varchar(200) NOT NULL,
	"customer_phone" varchar(32) NOT NULL,
	"customer_email" varchar(255),
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"total_cents" integer NOT NULL,
	"status" "booking_status" DEFAULT 'hold' NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"expires_at" timestamp with time zone,
	"customer_notes" text,
	"internal_notes" text,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" varchar(32) DEFAULT 'abacatepay' NOT NULL,
	"provider_payment_id" varchar(100),
	"amount_cents" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"pix_qr_code" varchar(1000),
	"pix_copia_cola" varchar(1000),
	"paid_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"provider" varchar(32) NOT NULL,
	"external_id" varchar(100) NOT NULL,
	"event_type" varchar(64),
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" varchar(1000),
	CONSTRAINT "webhook_events_provider_external_id_pk" PRIMARY KEY("provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid,
	"action" varchar(64) NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_resources_tenant" ON "resources" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_services_tenant" ON "services" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_services_resource" ON "services" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_schedule_rules_resource_weekday" ON "schedule_rules" USING btree ("resource_id","weekday");--> statement-breakpoint
CREATE INDEX "idx_schedule_rules_tenant" ON "schedule_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_blocks_resource_time" ON "blocks" USING btree ("resource_id","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "idx_blocks_tenant" ON "blocks" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_booking_active_slot" ON "bookings" USING btree ("resource_id","starts_at") WHERE status IN ('hold', 'pending_approval', 'confirmed');--> statement-breakpoint
CREATE INDEX "idx_bookings_tenant_time" ON "bookings" USING btree ("tenant_id","starts_at");--> statement-breakpoint
CREATE INDEX "idx_bookings_resource_time" ON "bookings" USING btree ("resource_id","starts_at");--> statement-breakpoint
CREATE INDEX "idx_bookings_customer" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_status_expires" ON "bookings" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_payments_booking" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_payments_provider_id" ON "payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_processed" ON "webhook_events" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "idx_audit_tenant_time" ON "audit_log" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_log" USING btree ("entity_type","entity_id");