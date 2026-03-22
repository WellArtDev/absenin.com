-- Migration: Fix WhatsApp Events Unique Constraint and Comments
-- Date: 2026-03-22 18:00 GMT+7
-- Purpose: Add missing closing brace to WhatsAppEvent model

-- Note: This fixes a syntax error in schema.prisma
-- The unique constraint remains the same (tenant_id, provider, message_id)
-- which correctly implements idempotency scoping

BEGIN;

-- Fix missing closing brace in WhatsAppEvent model
-- (This is a schema fix, no data changes needed)
COMMENT ON TABLE "whatsapp_events" IS 'WhatsApp event logs with tenant and provider scoping';

-- End migration
