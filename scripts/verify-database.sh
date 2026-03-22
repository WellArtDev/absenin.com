#!/bin/bash
# Database Verification Script for Staging
# Usage: ./scripts/verify-database.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables
if [ -f ".env.staging" ]; then
    export $(cat .env.staging | grep -v '^#' | xargs)
elif [ -f "apps/api/.env" ]; then
    export $(cat apps/api/.env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: No .env file found${NC}"
    exit 1
fi

# Parse DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | grep -oP 'postgresql://[^@]*@\K[^:]+')
DB_PORT=$(echo "$DATABASE_URL" | grep -oP ':[0-9]+/' | tr -d ':/')
DB_NAME=$(echo "$DATABASE_URL" | grep -oP '/[^?]*' | tr -d '/')
DB_USER=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f1)

echo "=========================================="
echo "Database Verification"
echo "=========================================="
echo "Host: $DB_HOST"
echo "Port: ${DB_PORT:-5432}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "=========================================="

# Test 1: Connection
print_test() {
    echo -e "\n${YELLOW}Testing: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

print_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
}

print_test "Database Connection"
if PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f2) \
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    print_pass "Database connection successful"
else
    print_fail "Cannot connect to database"
    exit 1
fi

# Test 2: Prisma Migrations Table
print_test "Prisma Migrations Table"
MIGRATIONS_COUNT=$(PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f2) \
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM _prisma_migrations;" 2>/dev/null || echo "0")

if [ "$MIGRATIONS_COUNT" -gt 0 ]; then
    print_pass "Prisma migrations table exists with $MIGRATIONS_COUNT migrations"
else
    print_fail "Prisma migrations table not found or empty"
fi

# Test 3: RefreshToken Table
print_test "RefreshToken Table"
REFRESH_EXISTS=$(PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f2) \
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'refresh_tokens');" 2>/dev/null)

if [ "$REFRESH_EXISTS" = "t" ]; then
    print_pass "RefreshToken table exists"

    # Test 4: RefreshToken Columns
    print_test "RefreshToken Table Columns"
    COLUMNS=$(PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f2) \
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'refresh_tokens';" 2>/dev/null)

    if [ "$COLUMNS" -ge 8 ]; then
        print_pass "RefreshToken table has $COLUMNS columns (expected: 8)"
    else
        print_fail "RefreshToken table has only $COLUMNS columns (expected: 8)"
    fi

    # Test 5: RefreshToken Indexes
    print_test "RefreshToken Table Indexes"
    INDEXES=$(PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f2) \
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'refresh_tokens';" 2>/dev/null)

    if [ "$INDEXES" -ge 5 ]; then
        print_pass "RefreshToken table has $INDEXES indexes (expected: 5+)"
    else
        print_fail "RefreshToken table has only $INDEXES indexes (expected: 5+)"
    fi

    # Test 6: RefreshToken Foreign Key
    print_test "RefreshToken Foreign Key to Users"
    FK_EXISTS=$(PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f2) \
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_name = 'refresh_tokens_user_id_fkey';" 2>/dev/null)

    if [ "$FK_EXISTS" = "1" ]; then
        print_pass "Foreign key to users table exists"
    else
        print_fail "Foreign key to users table not found"
    fi

    # Test 7: RefreshToken Record Count
    print_test "RefreshToken Record Count"
    RECORD_COUNT=$(PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f2) \
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM refresh_tokens;" 2>/dev/null)

    print_pass "RefreshToken table has $RECORD_COUNT records (expected: 0 for new DB)"
else
    print_fail "RefreshToken table does not exist"
    exit 1
fi

# Test 8: Core Tables Exist
print_test "Core Tables Exist"
CORE_TABLES="tenants users employees roles permissions divisions positions attendance_records selfie uploads office_locations"
ALL_EXIST=true

for table in $CORE_TABLES; do
    EXISTS=$(PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f2) \
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table');" 2>/dev/null)

    if [ "$EXISTS" != "t" ]; then
        print_fail "Table '$table' does not exist"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = true ]; then
    print_pass "All core tables exist"
fi

# Test 9: Database Version
print_test "PostgreSQL Version"
PG_VERSION=$(PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f2) \
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" 2>/dev/null | grep -oP 'PostgreSQL \K[0-9.]+' || echo "Unknown")

print_pass "PostgreSQL version: $PG_VERSION"

# Test 10: Database Size
print_test "Database Size"
DB_SIZE=$(PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f2) \
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null)

print_pass "Database size: $DB_SIZE"

echo ""
echo "=========================================="
echo "Database Verification Complete"
echo "=========================================="
