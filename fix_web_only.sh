#!/bin/bash

# ============================================================
# Quick Fix for Web Service
# Purpose: Fix Next.js web service startup issues
# Usage: ./fix_web_only.sh
# ============================================================

set -e

echo "========================================="
echo "Quick Fix for Web Service"
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
# Step 1: Stop web service
# ============================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Stop web service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pm2 stop absenin-web 2>/dev/null || echo "Web service not running"
pm2 delete absenin-web 2>/dev/null || echo "Web service not in list"

success "Web service stopped"

# ============================================================
# Step 2: Kill any process on port 3000
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Kill processes on port 3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if sudo lsof -ti :3000 2>/dev/null; then
    sudo lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    success "Killed processes on port 3000"
else
    info "No processes on port 3000"
fi

# ============================================================
# Step 3: Navigate to web directory
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Navigate to web directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/absenin/apps/web || {
    error "Failed to change to apps/web"
    exit 1
}

success "Changed to apps/web"

# ============================================================
# Step 4: Check and rebuild if needed
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Check build directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
    warn "Build directory missing or incomplete"
    info "Rebuilding Next.js..."

    cd /var/www/absenin
    pnpm --filter @absenin/web build

    success "Next.js rebuilt"
else
    success "Build directory exists"
fi

# ============================================================
# Step 5: Create ecosystem file for web
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Create PM2 ecosystem for web"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/absenin

cat > ecosystem.web.js << 'EOF'
module.exports = {
  apps: [{
    name: 'absenin-web',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000',
    cwd: '/var/www/absenin/apps/web',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/absenin-web-error.log',
    out_file: '/var/log/pm2/absenin-web-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10
  }]
};
EOF

success "Ecosystem file created"

# ============================================================
# Step 6: Start web with ecosystem
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Start web service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Starting absenin-web with PM2 ecosystem..."
pm2 start ecosystem.web.js --only absenin-web

success "Web service started"

# ============================================================
# Step 7: Wait for startup
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Wait for Next.js startup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Waiting 10 seconds for Next.js to start..."
sleep 10

# ============================================================
# Step 8: Verify web service
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 8: Verify web service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
info "PM2 Status:"
pm2 status

echo ""
info "Testing http://127.0.0.1:3000..."
if curl -f -s http://127.0.0.1:3000 > /dev/null 2>&1; then
    success "Web is responding on port 3000"

    echo ""
    curl -I http://127.0.0.1:3000 2>&1 | head -10
else
    error "Web is NOT responding"
    echo ""
    info "PM2 Logs (last 20 lines):"
    pm2 logs absenin-web --lines 20 --nostream

    echo ""
    info "Direct test with verbose curl:"
    curl -v http://127.0.0.1:3000/ 2>&1 | head -30
fi

echo ""
info "Testing https://staging.absenin.com..."
if curl -f -s https://staging.absenin.com > /dev/null 2>&1; then
    success "Public URL is accessible"

    echo ""
    curl -I https://staging.absenin.com 2>&1 | head -10
else
    error "Public URL is NOT accessible"
fi

# ============================================================
# Step 9: Save PM2 configuration
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 9: Save PM2 configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pm2 save

success "PM2 configuration saved"

# ============================================================
# Summary
# ============================================================

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "If web is still not working:"
echo ""
echo "1. Check full logs:"
echo "   pm2 logs absenin-web --lines 100"
echo ""
echo "2. Check nginx config:"
echo "   sudo nginx -T | grep -A 20 'server_name staging.absenin.com'"
echo ""
echo "3. Check nginx error log:"
echo "   sudo tail -50 /var/log/nginx/error.log"
echo ""
echo "4. Test with diagnosis script:"
echo "   ./diagnose_web.sh"
echo ""
