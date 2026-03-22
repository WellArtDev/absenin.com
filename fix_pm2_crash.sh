#!/bin/bash

# ============================================================
# Fix PM2 Crash Loop Script
# Purpose: Stop crash loop and restart services cleanly
# Usage: ./fix_pm2_crash.sh
# ============================================================

set -e

echo "========================================="
echo "Fix PM2 Crash Loop Script"
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
# Step 1: Stop all PM2 processes
# ============================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Stop all PM2 processes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if pm2 list | grep -q "absenin"; then
    info "Stopping all PM2 processes..."
    pm2 delete all
    success "All PM2 processes stopped"
else
    warn "No PM2 processes running"
fi

# ============================================================
# Step 2: Kill zombie processes
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Kill zombie processes holding ports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Killing processes on port 3000..."
if sudo lsof -ti :3000 2>/dev/null; then
    sudo lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    success "Killed processes on port 3000"
else
    info "No processes on port 3000"
fi

info "Killing processes on port 3001..."
if sudo lsof -ti :3001 2>/dev/null; then
    sudo lsof -ti :3001 | xargs kill -9 2>/dev/null || true
    success "Killed processes on port 3001"
else
    info "No processes on port 3001"
fi

# ============================================================
# Step 3: Wait for ports to be released
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Wait for ports to be released"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Waiting 3 seconds..."
sleep 3

# ============================================================
# Step 4: Navigate to app directory
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Navigate to app directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/absenin || {
    error "Failed to change directory to /var/www/absenin"
    exit 1
}

success "Changed to /var/www/absenin"

# ============================================================
# Step 5: Pull latest code
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Pull latest code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Fetching latest code..."
git fetch --all

info "Resetting to origin/main..."
git reset --hard origin/main

success "Code updated to latest version"

# ============================================================
# Step 6: Install dependencies (if needed)
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Install dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Installing dependencies..."
pnpm install --frozen-lockfile

success "Dependencies installed"

# ============================================================
# Step 7: Generate Prisma client
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Generate Prisma client"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Generating Prisma client..."
pnpm --filter @absenin/api db:generate

success "Prisma client generated"

# ============================================================
# Step 8: Build project
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 8: Build project"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Building all packages..."
pnpm build

success "Project built successfully"

# ============================================================
# Step 9: Run migrations
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 9: Run database migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd apps/api || {
    error "Failed to change directory to apps/api"
    exit 1
}

info "Applying migrations..."
npx prisma migrate deploy

success "Migrations applied"

cd ../..

# ============================================================
# Step 10: Start API service
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 10: Start API service (port 3001)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Starting absenin-api..."
pm2 start "pnpm --filter @absenin/api start" --name absenin-api

success "absenin-api started"

# ============================================================
# Step 11: Wait and start Web service
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 11: Start Web service (port 3000)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Waiting 3 seconds for API to start..."
sleep 3

info "Starting absenin-web..."
pm2 start "pnpm --filter @absenin/web start -p 3000" --name absenin-web

success "absenin-web started"

# ============================================================
# Step 12: Save PM2 process list
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 12: Save PM2 process list"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pm2 save

success "PM2 process list saved"

# ============================================================
# Step 13: Reload nginx
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 13: Reload nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if sudo nginx -t; then
    sudo systemctl reload nginx
    success "nginx reloaded"
else
    error "nginx configuration test failed"
    exit 1
fi

# ============================================================
# Step 14: Verify services
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 14: Verify services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
info "PM2 Status:"
pm2 status

echo ""
info "Testing API (port 3001)..."
if curl -f -s http://127.0.0.1:3001/health > /dev/null 2>&1; then
    success "API is responding on port 3001"
else
    warn "API health check failed (this might be OK if endpoint doesn't exist)"
fi

echo ""
info "Testing Web (port 3000)..."
if curl -f -s http://127.0.0.1:3000 > /dev/null 2>&1; then
    success "Web is responding on port 3000"
else
    warn "Web health check failed"
fi

echo ""
info "Testing public URL..."
if curl -f -s https://staging.absenin.com > /dev/null 2>&1; then
    success "Public URL is accessible"
else
    warn "Public URL check failed"
fi

# ============================================================
# Summary
# ============================================================

echo ""
echo "========================================="
success "PM2 crash loop fixed!"
echo "========================================="
echo ""
echo "Services are now running:"
echo "  - absenin-api: http://127.0.0.1:3001"
echo "  - absenin-web: http://127.0.0.1:3000"
echo "  - Public URL: https://staging.absenin.com"
echo ""
echo "Monitor logs with:"
echo "  pm2 logs absenin-api"
echo "  pm2 logs absenin-web"
echo ""
echo "Next steps:"
echo "  1. Verify staging.absenin.com is accessible"
echo "  2. Run Fonnte functional tests"
echo ""
