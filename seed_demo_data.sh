#!/bin/bash

# ============================================================
# Seed Demo Data Script
# Purpose: Insert demo tenant and admin user to database
# Usage: ./seed_demo_data.sh
# ============================================================

set -e

echo "========================================="
echo "Seed Demo Data Script"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "ℹ️  $1${NC}"; }

# ============================================================
# Navigate to API directory
# ============================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Navigate to API directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/absenin/apps/api || {
    error "Failed to change to apps/api directory"
    exit 1
}

success "Changed to apps/api"

# ============================================================
# Run seed SQL
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Run Demo Seed SQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Running demo tenant seed..."

if npx prisma db execute --file prisma/seeds/demo_tenant_seed.sql; then
    success "Demo data seeded successfully"
else
    error "Failed to seed demo data"
    exit 1
fi

# ============================================================
# Verify seeded data
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verify Seeded Data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Checking admin user..."
npx prisma db execute --stdin <<'SQL'
SELECT
    'Admin User:' as info,
    email,
    CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status
FROM users
WHERE email = 'admin@demonusantara.co.id';
SQL

info "Checking employees..."
npx prisma db execute --stdin <<'SQL'
SELECT
    'Employees:' as info,
    COUNT(*) as count
FROM employees
WHERE tenant_id = 'demo-tenant-001';
SQL

info "Checking WhatsApp numbers..."
npx prisma db execute --stdin <<'SQL'
SELECT
    'WhatsApp:' as info,
    full_name,
    whatsapp_phone
FROM employees
WHERE tenant_id = 'demo-tenant-001'
LIMIT 5;
SQL

# ============================================================
# Summary
# ============================================================

echo ""
echo "========================================="
success "Demo Data Seeded Successfully!"
echo "========================================="
echo ""
echo "📧 Login Credentials:"
echo "   Email: admin@demonusantara.co.id"
echo "   Password: Demo123!Absenin"
echo ""
echo "🏢 Demo Tenant:"
echo "   Name: PT Demo Nusantara Digital"
echo "   Slug: demo-nsd"
echo ""
echo "👥 Demo Employees: 12 employees"
echo "   - Engineering: 4 employees"
echo "   - Marketing: 2 employees"
echo "   - Operations: 2 employees"
echo "   - Finance: 2 employees"
echo "   - HR: 2 employees"
echo ""
echo "📱 WhatsApp Numbers:"
echo "   All employees have WhatsApp numbers"
echo "   Format: 62812345678XX"
echo ""
echo "🌐 Login URL:"
echo "   https://staging.absenin.com/login"
echo ""
