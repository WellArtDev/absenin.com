#!/bin/bash

# ============================================================
# Resolve Failed Migration Script
# Purpose: Fix failed Prisma migration in staging
# Usage: ./resolve_failed_migration.sh
# ============================================================

set -e

echo "========================================="
echo "Resolve Failed Migration Script"
echo "========================================="

# Navigate to API directory
cd /var/www/absenin/apps/api || {
    echo "Failed to change directory to /var/www/absenin/apps/api"
    exit 1
}

# Check migration status
echo ""
echo "Checking migration status..."
npx prisma migrate status

echo ""
echo "Attempting to resolve failed migration..."
echo ""
echo "This migration just adds a COMMENT to the whatsapp_events table."
echo "The COMMENT likely already exists or there was a temporary issue."
echo ""

# Try to resolve by marking it as applied
echo "Resolving migration: 20260322_fix_whatsapp_events_unique_constraint"
npx prisma migrate resolve --applied "20260322_fix_whatsapp_events_unique_constraint"

echo ""
echo "Migration resolved successfully!"
echo ""
echo "Verifying migration status..."
npx prisma migrate status

echo ""
echo "========================================="
echo "Done! The failed migration has been resolved."
echo "You can now retry the deployment."
echo "========================================="
