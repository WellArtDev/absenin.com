-- Migration: Add WhatsApp integration models
-- Date: 2026-03-22 06:32:00 GMT+7

-- Add whatsapp_phone column to employees table
ALTER TABLE "employees" ADD COLUMN "whatsapp_phone" TEXT;

-- Create unique index on whatsapp_phone
CREATE UNIQUE INDEX "employees_whatsapp_phone_key" ON "employees"("whatsapp_phone") WHERE "whatsapp_phone" IS NOT NULL;

-- Create whatsapp_integrations table
CREATE TABLE "whatsapp_integrations" (
    "integration_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "api_key" TEXT DEFAULT '',
    "webhook_url" TEXT DEFAULT '',
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create primary key
ALTER TABLE "whatsapp_integrations" ADD CONSTRAINT "whatsapp_integrations_pkey" PRIMARY KEY ("integration_id");

-- Create indexes
CREATE INDEX "whatsapp_integrations_provider_idx" ON "whatsapp_integrations"("provider");
CREATE INDEX "whatsapp_integrations_is_active_idx" ON "whatsapp_integrations"("is_active");
CREATE UNIQUE INDEX "whatsapp_integrations_tenant_provider_key" ON "whatsapp_integrations"("tenant_id", "provider");

-- Add foreign key to tenants
ALTER TABLE "whatsapp_integrations" ADD CONSTRAINT "whatsapp_integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create whatsapp_events table
CREATE TABLE "whatsapp_events" (
    "event_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "integration_id" TEXT,
    "provider" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "request_payload" JSON NOT NULL,
    "response_text" TEXT,
    "status" TEXT DEFAULT 'processing' NOT NULL,
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create primary key
ALTER TABLE "whatsapp_events" ADD CONSTRAINT "whatsapp_events_pkey" PRIMARY KEY ("event_id");

-- Create indexes
CREATE INDEX "whatsapp_events_tenant_phone_idx" ON "whatsapp_events"("tenant_id", "phone_number");
CREATE INDEX "whatsapp_events_tenant_provider_idx" ON "whatsapp_events"("tenant_id", "provider");
CREATE INDEX "whatsapp_events_message_id_idx" ON "whatsapp_events"("message_id");
CREATE INDEX "whatsapp_events_status_idx" ON "whatsapp_events"("status");
CREATE INDEX "whatsapp_events_created_at_idx" ON "whatsapp_events"("created_at");

-- Add composite unique constraint for idempotency: tenant_id + provider + message_id
-- This prevents duplicate processing across tenants and providers
CREATE UNIQUE INDEX "whatsapp_events_tenant_provider_message_id_key" ON "whatsapp_events"("tenant_id", "provider", "message_id");

-- Add foreign key to whatsapp_integrations
ALTER TABLE "whatsapp_events" ADD CONSTRAINT "whatsapp_events_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "whatsapp_integrations"("integration_id") ON DELETE SET NULL ON UPDATE CASCADE;
