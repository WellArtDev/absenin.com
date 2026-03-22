#!/bin/bash

# ============================================================
# Reset Admin Password Script
# Purpose: Reset admin password to known value
# Usage: ./reset_admin_password.sh
# ============================================================

set -e

echo "========================================="
echo "Reset Admin Password Script"
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
# Configuration
# ============================================================

ADMIN_EMAIL="admin@demonusantara.co.id"
NEW_PASSWORD="Demo123!Absenin"

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
# Check if admin user exists
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Check Admin User"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Checking if admin user exists..."

# Check user by counting
USER_COUNT=$(npx prisma db execute --stdin --json 2>/dev/null | grep -o '"rowCount":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$USER_COUNT" == "0" ]; then
    warn "Admin user does not exist"
    info "Attempting to create admin user..."

    # Create admin user directly
    npx prisma db execute --stdin <<SQL
INSERT INTO users (user_id, tenant_id, employee_id, email, password_hash, is_active, created_at, updated_at)
VALUES (
  'demo-user-001',
  'demo-tenant-001',
  'demo-emp-001',
  '$ADMIN_EMAIL',
  '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhNj/L4sCFA/8E6iPv9zTw',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (tenant_id, email) DO UPDATE SET
  password_hash = '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhNj/L4sCFA/8E6iPv9zTw',
  updated_at = NOW(),
  is_active = true;
SQL

    success "Admin user created"

    # Assign admin role
    npx prisma db execute --stdin <<SQL
INSERT INTO user_roles (user_id, role_id, assigned_at)
VALUES ('demo-user-001', 'demo-role-001', NOW())
ON CONFLICT DO NOTHING;
SQL

    success "Admin role assigned"
else
    success "Admin user found"
fi

# ============================================================
# Generate new password hash
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Generate New Password Hash"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "New password: $NEW_PASSWORD"

# Use Node.js to generate bcrypt hash
PASSWORD_HASH=$(node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('$NEW_PASSWORD', 12);
console.log(hash);
")

success "Password hash generated"

# ============================================================
# Update password in database
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Update Password in Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Updating password for $ADMIN_EMAIL..."

npx prisma db execute --stdin <<SQL
UPDATE users
SET password_hash = '$PASSWORD_HASH',
    updated_at = NOW()
WHERE tenant_id = 'demo-tenant-001'
  AND email = '$ADMIN_EMAIL';
SQL

success "Password updated"

# ============================================================
# Verify update
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verify Update"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Checking admin user status..."

npx prisma db execute --stdin <<'SQL'
SELECT
    'Admin User:' as info,
    email,
    tenant_id,
    CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status,
    LENGTH(password_hash) as hash_length
FROM users
WHERE tenant_id = 'demo-tenant-001'
  AND email = '$ADMIN_EMAIL';
SQL

# ============================================================
# Summary
# ============================================================

echo ""
echo "========================================="
success "Admin Password Reset Successfully!"
echo "========================================="
echo ""
echo "📧 Email: $ADMIN_EMAIL"
echo "🔑 Password: $NEW_PASSWORD"
echo ""
echo "🌐 Login URL:"
echo "   https://staging.absenin.com/login"
echo ""
echo "⚠️  Note: Password is case-sensitive"
echo ""
