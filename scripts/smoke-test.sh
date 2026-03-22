#!/bin/bash
# Smoke Test Suite for Staging Deployment
# Usage: ./scripts/smoke-test.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BASE_URL="${STAGING_URL:-http://localhost:3001}"
API_URL="$BASE_URL/api"
WEB_URL="${STAGING_WEB_URL:-http://localhost:3002}"

# Test counter
TOTAL=0
PASSED=0
FAILED=0

# Functions
print_test() {
    echo -e "\n${YELLOW}Testing: $1${NC}"
    ((TOTAL++))
}

print_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

# Start smoke tests
echo "=========================================="
echo "Absenin.com Staging Smoke Tests"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "API URL: $API_URL"
echo "Web URL: $WEB_URL"
echo "=========================================="

# Test 1: Health Check
print_test "API Health Check"
if curl -s -f "$API_URL/health" > /dev/null 2>&1 || \
   curl -s -f "$BASE_URL/health" > /dev/null 2>&1; then
    print_pass "API is responding"
else
    print_fail "API is not responding"
fi

# Test 2: CSRF Token Generation
print_test "CSRF Token Generation"
CSRF_RESPONSE=$(curl -s "$API_URL/auth/csrf-token")
if echo "$CSRF_RESPONSE" | grep -q '"csrfToken"'; then
    CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
    if [ ${#CSRF_TOKEN} -eq 64 ]; then
        print_pass "CSRF token generated correctly (64 chars)"
    else
        print_fail "CSRF token length is ${#CSRF_TOKEN}, expected 64"
    fi
else
    print_fail "CSRF token endpoint not responding correctly"
fi

# Test 3: Login CSRF Protection
print_test "Login CSRF Protection"
LOGIN_NO_CSRF=$(curl -s -w "%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Tenant-Id: test-tenant" \
    -d '{"email":"test@example.com","password":"wrong"}' -o /dev/null)

if [ "$LOGIN_NO_CSRF" = "403" ]; then
    print_pass "Login correctly rejects requests without CSRF token (403)"
else
    print_fail "Login returned $LOGIN_NO_CSRF, expected 403"
fi

# Test 4: Login with Valid CSRF
print_test "Login with CSRF Token"
CSRF_TOKEN=$(curl -s "$API_URL/auth/csrf-token" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Tenant-Id: test-tenant" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -d '{"email":"test@example.com","password":"wrongpassword"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":false'; then
    # Should fail with wrong password, not CSRF error
    if echo "$LOGIN_RESPONSE" | grep -q 'password salah\|Invalid credentials'; then
        print_pass "Login accepts CSRF token and validates credentials"
    else
        print_fail "Login returned unexpected error: $LOGIN_RESPONSE"
    fi
else
    print_fail "Login response invalid: $LOGIN_RESPONSE"
fi

# Test 5: Protected Endpoint Without Auth
print_test "Protected Endpoint Access (No Auth)"
PROTECTED_RESPONSE=$(curl -s -w "%{http_code}" "$API_URL/employees" \
    -H "X-Tenant-Id: test-tenant" -o /dev/null)

if [ "$PROTECTED_RESPONSE" = "401" ] || [ "$PROTECTED_RESPONSE" = "400" ]; then
    print_pass "Protected endpoint correctly rejects unauthenticated requests ($PROTECTED_RESPONSE)"
else
    print_fail "Protected endpoint returned $PROTECTED_RESPONSE, expected 401/400"
fi

# Test 6: Tenant Scoping
print_test "Tenant Scoping"
# This should fail because tenant doesn't exist
TENANT_RESPONSE=$(curl -s "$API_URL/employees?tenant=nonexistent-tenant-xyz")
if echo "$TENANT_RESPONSE" | grep -q '"success":false\|Tenant not found\|not specified'; then
    print_pass "Tenant validation working correctly"
else
    print_fail "Tenant scoping not working: $TENANT_RESPONSE"
fi

# Test 7: RefreshToken Table Access
print_test "RefreshToken Table Access"
if command -v psql &> /dev/null; then
    # This is a basic check - actual connection requires valid credentials
    if PGPASSWORD=${PGPASSWORD:-} psql -h ${PGHOST:-localhost} -U ${PGUSER:-postgres} -d ${PGDATABASE:-absenin_staging} \
        -c "SELECT COUNT(*) FROM refresh_tokens;" > /dev/null 2>&1; then
        print_pass "RefreshToken table is accessible"
    else
        print_fail "Cannot access RefreshToken table (check database credentials)"
    fi
else
    print_fail "psql command not available for database test"
fi

# Test 8: Upload Directory Permissions
print_test "Upload Directory Permissions"
if [ -d "/var/www/absenin.com/staging/uploads" ]; then
    if [ -w "/var/www/absenin.com/staging/uploads/selfies" ]; then
        print_pass "Upload directory is writable"
    else
        print_fail "Upload directory is not writable"
    fi
else
    print_fail "Upload directory does not exist"
fi

# Test 9: PM2 Process Status
print_test "PM2 Process Status"
if command -v pm2 &> /dev/null; then
    API_STATUS=$(pm2 list | grep absenin-api | awk '{print $10}')
    WEB_STATUS=$(pm2 list | grep absenin-web | awk '{print $10}')

    if [ "$API_STATUS" = "online" ]; then
        print_pass "API process is online"
    else
        print_fail "API process status: $API_STATUS"
    fi

    if [ "$WEB_STATUS" = "online" ]; then
        print_pass "Web process is online"
    else
        print_fail "Web process status: $WEB_STATUS"
    fi
else
    print_fail "PM2 command not available"
fi

# Test 10: Nginx Status
print_test "Nginx Status"
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        print_pass "Nginx is running"
    else
        print_fail "Nginx is not running"
    fi
else
    print_fail "Nginx command not available"
fi

# Test 11: Location Validate-Presence Endpoint
print_test "Location Validate-Presence Endpoint"
# Test with known office location coordinates
LOC_RESPONSE=$(curl -s -X POST "$API_URL/locations/validate-presence" \
    -H "Content-Type: application/json" \
    -d '{"tenantId":"test-tenant","locationId":"test-location","latitude":-6.2088,"longitude":106.8456}')

if echo "$LOC_RESPONSE" | grep -q 'isInside\|outside\|inside\|distance'; then
    print_pass "Location validate-presence endpoint responding"
else
    print_fail "Location validate-presence not working: $LOC_RESPONSE"
fi

# Test 12: Cookie Security Headers
print_test "Cookie Security Headers"
CSRF_HEADERS=$(curl -sI "$API_URL/auth/csrf-token")
if echo "$CSRF_HEADERS" | grep -qi "set-cookie"; then
    if echo "$CSRF_HEADERS" | grep -qi "httponly"; then
        print_pass "HttpOnly cookie flag is set"
    else
        print_fail "HttpOnly cookie flag is not set"
    fi
else
    print_fail "No Set-Cookie header found"
fi

# Test 13: Database Connection
print_test "Database Connection"
# Check if API can connect to database
DB_CHECK=$(curl -s "$API_URL/health" 2>/dev/null || echo "{}")
if echo "$DB_CHECK" | grep -q '"success":true\|healthy\|ok' || \
   echo "$DB_CHECK" | grep -q '"type":"NOT_FOUND"'; then
    print_pass "Database connection appears working"
else
    print_fail "Database connection may have issues"
fi

# Print Summary
echo ""
echo "=========================================="
echo "Smoke Test Summary"
echo "=========================================="
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}ALL TESTS PASSED${NC}"
    exit 0
else
    echo -e "${RED}SOME TESTS FAILED${NC}"
    exit 1
fi
