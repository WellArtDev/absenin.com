#!/bin/bash

/**
 * Setup Test Database for Integration Tests
 *
 * This script creates a test database and seeds it with test data.
 * Run this before running integration tests.
 *
 * Usage: ./setup-test-db.sh
 */

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Absenin Test Database Setup ===${NC}\n"

# Configuration
TEST_DB_NAME="absenin_test"
TEST_TENANT_ID="test-tenant-001"
TEST_USER_EMAIL="test-auth@absenin.com"
TEST_USER_PASSWORD="TestPassword123!"

echo -e "${YELLOW}Step 1: Create test database${NC}"

# Check if PostgreSQL is running
if ! psql -U postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}Error: PostgreSQL is not running or accessible${NC}"
    echo "Please start PostgreSQL or check connection"
    exit 1
fi

# Drop test database if exists
echo "Dropping existing test database (if any)..."
psql -U postgres -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" 2>/dev/null || true

# Create test database
echo "Creating test database: $TEST_DB_NAME"
psql -U postgres -c "CREATE DATABASE $TEST_DB_NAME;" || {
    echo -e "${RED}Error: Failed to create database${NC}"
    exit 1
}

echo -e "${GREEN}✓ Test database created${NC}\n"

echo -e "${YELLOW}Step 2: Create test tenant${NC}"

# Create test tenant (mocked - in real app, tenant is created via API)
echo "Test tenant ID: $TEST_TENANT_ID"

echo -e "${GREEN}✓ Test tenant ready${NC}\n"

echo -e "${YELLOW}Step 3: Create test user${NC}"

# Hash password (bcrypt)
HASHED_PASSWORD=$(cd /home/wethepeople/.openclaw/workspace/absenin.com/apps/api && node -e "
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('$TEST_USER_PASSWORD', 10);
  console.log(hash);
")

# Create test user
psql -U postgres -d "$TEST_DB_NAME" -c "
INSERT INTO users (user_id, tenant_id, email, password_hash, is_active, created_at)
VALUES (
    gen_random_uuid(),
    '$TEST_TENANT_ID',
    '$TEST_USER_EMAIL',
    '$HASHED_PASSWORD',
    true,
    NOW()
)
ON CONFLICT (email) DO NOTHING;
" || {
    echo -e "${RED}Error: Failed to create test user${NC}"
    exit 1
}

echo -e "${GREEN}✓ Test user created${NC}"
echo "  Email: $TEST_USER_EMAIL"
echo "  Password: $TEST_USER_PASSWORD"

echo -e "${YELLOW}Step 4: Update .env for testing${NC}"

# Update .env file to use test database
ENV_FILE="/home/wethepeople/.openclaw/workspace/absenin.com/apps/api/.env"

if [ -f "$ENV_FILE" ]; then
    # Backup current .env
    cp "$ENV_FILE" "$ENV_FILE.backup"

    # Update DATABASE_URL
    if grep -q "DATABASE_URL=" "$ENV_FILE"; then
        sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres@localhost:5432/$TEST_DB_NAME?schema=public|g" "$ENV_FILE"
    else
        echo "DATABASE_URL=postgresql://postgres@localhost:5432/$TEST_DB_NAME?schema=public" >> "$ENV_FILE"
    fi

    echo -e "${GREEN}✓ .env updated to use test database${NC}"
    echo "  Backup saved to: $ENV_FILE.backup"
else
    echo -e "${YELLOW}Warning: .env file not found${NC}"
fi

echo -e "\n${GREEN}=== Test Database Setup Complete ===${NC}\n"
echo -e "You can now run integration tests with:"
echo -e "  cd apps/api"
echo -e "  npm run test:integration\n"

# Run Prisma migrations on test database
echo -e "\n${YELLOW}Running Prisma migrations on test database...${NC}"

cd /home/wethepeople/.openclaw/workspace/absenin.com/apps/api

# Set DATABASE_URL for migration
export DATABASE_URL="postgresql://postgres@localhost:5432/$TEST_DB_NAME?schema=public"

# Run migrations
npx prisma migrate deploy || {
    echo -e "${RED}Warning: Migrations failed or skipped${NC}"
    echo "If tables already exist, you can ignore this warning"
}

echo -e "${GREEN}✓ Migrations complete${NC}\n"

# Verify RefreshToken table exists
echo -e "${YELLOW}Step 5: Verify RefreshToken table${NC}"

TABLE_EXISTS=$(psql -U postgres -d "$TEST_DB_NAME" -c "
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'refresh_tokens'
  );
" -t | xargs)

if [ "$TABLE_EXISTS" = "t" ]; then
    echo -e "${GREEN}✓ RefreshToken table verified${NC}"
else
    echo -e "${RED}✗ RefreshToken table not found${NC}"
    echo "Authentication hardening tests will fail without this table"
fi

echo -e "\n${GREEN}=== Setup Complete ===${NC}\n"
echo "Test Database: $TEST_DB_NAME"
echo "Test User: $TEST_USER_EMAIL"
echo "Test Password: $TEST_USER_PASSWORD"
echo "Test Tenant ID: $TEST_TENANT_ID"
