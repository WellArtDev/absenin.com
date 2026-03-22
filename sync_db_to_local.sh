#!/bin/bash

# ============================================================
# Sync Database Staging to Local
# Purpose: Dump staging database and restore to local
# Usage: ./sync_db_to_local.sh
# ============================================================

set -e

echo "========================================="
echo "Sync Database Staging to Local"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# ============================================================
# Configuration
# ============================================================

STAGING_HOST="absenin@staging.absenin.com"
STAGING_DB_NAME="absenin_staging"
STAGING_DB_USER="absenin"
STAGING_DB_HOST="localhost"
STAGING_DB_PORT="5432"

LOCAL_DB_NAME="absenin_local"
LOCAL_DB_USER="wethepeople"
DUMP_FILE="/tmp/absenin_staging_dump.sql"

# ============================================================
# Check prerequisites
# ============================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Check Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v pg_dump &> /dev/null; then
    error "pg_dump not found. Install PostgreSQL client tools:"
    echo "  Ubuntu/Debian: sudo apt install postgresql-client"
    echo "  Mac: brew install postgresql"
    exit 1
fi

success "Prerequisites OK"

# ============================================================
# Step 1: Dump database from staging
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Dump Database from Staging"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Connecting to staging server and dumping database..."

ssh $STAGING_HOST << 'ENDSSH'
    set -e
    cd /var/www/absenin/apps/api

    # Dump database to file
    PGPASSWORD="$STAGING_DB_USER" pg_dump -h $STAGING_DB_HOST -p $STAGING_DB_PORT -U $STAGING_DB_USER \
        -d $STAGING_DB_NAME \
        --clean \
        --no-owner \
        --no-acl \
        --format=plain \
        -f /tmp/absenin_staging_dump.sql

    echo "✅ Database dumped to /tmp/absenin_staging_dump.sql"
ENDSSH

success "Staging database dumped"

# ============================================================
# Step 2: Copy dump file to local
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Copy Dump File to Local"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Downloading dump file from staging..."

scp $STAGING_HOST:/tmp/absenin_staging_dump.sql $DUMP_FILE

success "Dump file downloaded"

# ============================================================
# Step 3: Drop and recreate local database
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Prepare Local Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Dropping local database (if exists)..."

dropdb $LOCAL_DB_NAME 2>/dev/null || echo "Database does not exist yet"

success "Old database dropped (if existed)"

info "Creating new local database..."

createdb $LOCAL_DB_NAME

success "Local database created"

# ============================================================
# Step 4: Restore dump to local database
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Restore Dump to Local Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Restoring database from dump file..."

psql -d $LOCAL_DB_NAME < $DUMP_FILE

success "Database restored"

# ============================================================
# Step 5: Run Prisma migrations
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Run Prisma Migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /home/wethepeople/.openclaw/workspace/absenin.com

info "Running Prisma migrate reset..."

npx prisma migrate reset --force

success "Prisma migrations applied"

# ============================================================
# Step 6: Generate Prisma client
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Generate Prisma Client"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Generating Prisma client..."

pnpm --filter @absenin/api db:generate

success "Prisma client generated"

# ============================================================
# Step 7: Verify sync
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Verify Sync"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Checking tenant count..."
TENANT_COUNT=$(psql -d $LOCAL_DB_NAME -t -c "SELECT COUNT(*) FROM tenants;" | tr -d ' ')
echo "Tenants: $TENANT_COUNT"

info "Checking user count..."
USER_COUNT=$(psql -d $LOCAL_DB_NAME -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
echo "Users: $USER_COUNT"

info "Checking employee count..."
EMP_COUNT=$(psql -d $LOCAL_DB_NAME -t -c "SELECT COUNT(*) FROM employees;" | tr -d ' ')
echo "Employees: $EMP_COUNT"

# ============================================================
# Step 8: Cleanup
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 8: Cleanup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Removing temporary dump file..."

rm -f $DUMP_FILE

# Also clean up staging
ssh $STAGING_HOST "rm -f /tmp/absenin_staging_dump.sql"

success "Cleanup completed"

# ============================================================
# Summary
# ============================================================

echo ""
echo "========================================="
success "Database Sync Completed Successfully!"
echo "========================================="
echo ""
echo "📊 Database Statistics:"
echo "   Tenants: $TENANT_COUNT"
echo "   Users: $USER_COUNT"
echo "   Employees: $EMP_COUNT"
echo ""
echo "🗄️  Local Database:"
echo "   Name: $LOCAL_DB_NAME"
echo "   Connection: postgresql://localhost:5432/$LOCAL_DB_NAME"
echo ""
echo "🧪 Test Connection:"
echo "   psql -d $LOCAL_DB_NAME -c 'SELECT * FROM users LIMIT 5;'"
echo ""
echo "✅ Local database is now in sync with staging!"
echo ""
