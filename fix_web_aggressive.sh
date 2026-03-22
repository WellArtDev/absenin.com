#!/bin/bash

# ============================================================
# Aggressive Web Fix Script
# Purpose: Fix Next.js web service completely
# Usage: ./fix_web_aggressive.sh
# ============================================================

set -e

echo "========================================="
echo "Aggressive Web Fix Script"
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
# Step 1: Stop and delete all PM2 processes
# ============================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Stop and delete all PM2 processes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pm2 delete all 2>/dev/null || echo "No PM2 processes"

success "All PM2 processes deleted"

# ============================================================
# Step 2: Kill ALL processes on ports 3000 and 3001
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Kill all processes on ports 3000/3001"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sudo pkill -f "node.*3000" 2>/dev/null || echo "No processes on port 3000"
sudo pkill -f "node.*3001" 2>/dev/null || echo "No processes on port 3001"

# Double check with lsof
sudo lsof -ti :3000 2>/dev/null | xargs -r kill -9
sudo lsof -ti :3001 2>/dev/null | xargs -r kill -9

success "All processes on ports 3000/3001 killed"

# ============================================================
# Step 3: Navigate to app directory
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Navigate to app directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/absenin || {
    error "Failed to change to /var/www/absenin"
    exit 1
}

success "Changed to /var/www/absenin"

# ============================================================
# Step 4: Clean and rebuild
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Clean and rebuild"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Cleaning build directories..."
rm -rf apps/web/.next
rm -rf apps/web/out
rm -rf apps/api/dist
rm -rf node_modules/.cache

success "Build directories cleaned"

info "Installing dependencies..."
export CI=true
pnpm install --frozen-lockfile --force

success "Dependencies installed"

info "Generating Prisma client..."
pnpm --filter @absenin/api db:generate

success "Prisma client generated"

info "Building all packages..."
pnpm build

success "All packages built"

# ============================================================
# Step 5: Run migrations
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Run database migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd apps/api || {
    error "Failed to change to apps/api"
    exit 1
}

npx prisma migrate deploy

success "Migrations applied"

cd ../..

# ============================================================
# Step 6: Start API first
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Start API service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Starting absenin-api..."
NODE_ENV=production pm2 start "pnpm --filter @absenin/api start" --name absenin-api

success "API started"

# ============================================================
# Step 7: Wait for API to be ready
# ============================================================

echo ""
info "Waiting 5 seconds for API to start..."
sleep 5

# Test API
info "Testing API..."
if curl -f -s http://127.0.0.1:3001/health > /dev/null 2>&1; then
    success "API is responding"
else
    warn "API health endpoint not found (this might be OK)"
fi

# ============================================================
# Step 8: Start Web with explicit configuration
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 8: Start Web service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd apps/web || {
    error "Failed to change to apps/web"
    exit 1
}

info "Starting absenin-web with explicit NODE_ENV..."
NODE_ENV=production PORT=3000 pm2 start "pnpm start" --name absenin-web -- --port 3000

success "Web started"

cd ../..

# ============================================================
# Step 9: Wait for Web startup
# ============================================================

echo ""
info "Waiting 10 seconds for Next.js to start..."
sleep 10

# ============================================================
# Step 10: Verify services
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 10: Verify services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
info "PM2 Status:"
pm2 status

echo ""
info "Checking port 3001 (API)..."
if sudo lsof -i :3001 > /dev/null 2>&1; then
    success "Port 3001 is in use"
else
    error "Port 3001 is NOT in use"
fi

echo ""
info "Checking port 3000 (Web)..."
if sudo lsof -i :3000 > /dev/null 2>&1; then
    success "Port 3000 is in use"
else
    error "Port 3000 is NOT in use"
fi

echo ""
info "Testing internal connection to API..."
if curl -f -s http://127.0.0.1:3001/health > /dev/null 2>&1; then
    success "API is responding"
    curl -I http://127.0.0.1:3001/health 2>&1 | head -5
else
    warn "API health check failed"
fi

echo ""
info "Testing internal connection to Web..."
if curl -f -s http://127.0.0.1:3000 > /dev/null 2>&1; then
    success "Web is responding"
    curl -I http://127.0.0.1:3000 2>&1 | head -5
else
    error "Web is NOT responding"
    echo ""
    info "PM2 logs (web, last 30 lines):"
    pm2 logs absenin-web --lines 30 --nostream
fi

# ============================================================
# Step 11: Save PM2 configuration
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 11: Save PM2 configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pm2 save

success "PM2 configuration saved"

# ============================================================
# Step 12: Reload nginx
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 12: Reload nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if sudo nginx -t; then
    sudo systemctl reload nginx
    success "nginx reloaded"
else
    error "nginx configuration test failed"
    exit 1
fi

# ============================================================
# Step 13: Test public URL
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 13: Test public URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Testing https://staging.absenin.com..."
if curl -f -s https://staging.absenin.com > /dev/null 2>&1; then
    success "Public URL is accessible"
    curl -I https://staging.absenin.com 2>&1 | head -10
else
    error "Public URL is NOT accessible"
fi

# ============================================================
# Summary
# ============================================================

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "Services:"
pm2 list

echo ""
echo "If still getting 502 Bad Gateway:"
echo ""
echo "1. Check PM2 logs:"
echo "   pm2 logs absenin-web --lines 50"
echo ""
echo "2. Check nginx error log:"
echo "   sudo tail -50 /var/log/nginx/error.log"
echo ""
echo "3. Check if ports are listening:"
echo "   sudo lsof -i :3000"
echo "   sudo lsof -i :3001"
echo ""
echo "4. Test directly:"
echo "   curl http://127.0.0.1:3000"
echo "   curl http://127.0.0.1:3001/health"
echo ""
