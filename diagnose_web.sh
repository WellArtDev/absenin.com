#!/bin/bash

# ============================================================
# Web Diagnosis Script
# Purpose: Diagnose Next.js web app issues
# Usage: ./diagnose_web.sh
# ============================================================

set -e

echo "========================================="
echo "Web Diagnosis Script"
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
# 1) Check PM2 process details
# ============================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1) PM2 Process Details"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
info "PM2 Status:"
pm2 status

echo ""
info "PM2 Process Info (absenin-web):"
pm2 show absenin-web || echo "Process not found"

# ============================================================
# 2) Check PM2 logs (web)
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2) PM2 Logs (absenin-web)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
info "STDOUT Logs (last 30 lines):"
pm2 logs absenin-web --lines 30 --nostream | grep -A 30 "absenin-web-out.log" || true

echo ""
info "STDERR Logs (last 30 lines):"
pm2 logs absenin-web --lines 30 --nostream | grep -A 30 "absenin-web-error.log" || true

# ============================================================
# 3) Check port binding
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3) Port Binding Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
info "Processes listening on port 3000:"
sudo lsof -i :3000 || echo "No process on port 3000"

echo ""
info "Processes listening on port 3001:"
sudo lsof -i :3001 || echo "No process on port 3001"

# ============================================================
# 4) Test Next.js directly
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4) Direct Next.js Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/absenin/apps/web || {
    error "Failed to change to apps/web directory"
    exit 1
}

echo ""
info "Testing Next.js with direct curl:"
if curl -v http://127.0.0.1:3000 2>&1 | head -20; then
    success "Direct curl successful"
else
    error "Direct curl failed"
fi

echo ""
info "Testing with curl -I (headers only):"
curl -I http://127.0.0.1:3000 2>&1 || true

echo ""
info "Testing with curl -v (verbose):"
curl -v http://127.0.0.1:3000/ 2>&1 | head -30 || true

# ============================================================
# 5) Check Next.js build output
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5) Next.js Build Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
info "Checking if .next build directory exists:"
if [ -d ".next" ]; then
    success "Build directory exists"
    echo "Contents:"
    ls -la .next | head -20
else
    error "Build directory NOT found"
    info "Next.js may not have been built"
fi

# ============================================================
# 6) Check environment variables
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6) Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
info "Checking .env files:"
if [ -f ".env.local" ]; then
    echo "Found .env.local"
    head -5 .env.local
elif [ -f ".env.production" ]; then
    echo "Found .env.production"
    head -5 .env.production
else
    warn "No .env file found for web"
fi

# ============================================================
# 7) Try to start Next.js manually
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7) Manual Next.js Start Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
warn "Attempting to start Next.js manually for 10 seconds..."
warn "Press Ctrl+C to stop early if needed"

# Stop PM2 web first
pm2 stop absenin-web 2>/dev/null || true

# Start Next.js in background
timeout 10s pnpm start -p 3000 > /tmp/nextjs_manual_test.log 2>&1 &
NEXTJS_PID=$!

# Wait a bit
sleep 5

# Check if it's running
if ps -p $NEXTJS_PID > /dev/null; then
    success "Next.js started successfully (PID: $NEXTJS_PID)"

    # Test connection
    echo ""
    info "Testing connection to manual Next.js instance:"
    if curl -I http://127.0.0.1:3000 2>&1 | head -5; then
        success "Connection successful!"
    else
        error "Connection failed"
    fi

    # Kill it
    echo ""
    info "Stopping manual Next.js instance..."
    kill $NEXTJS_PID 2>/dev/null || true
else
    error "Next.js failed to start"
    echo ""
    info "Log output:"
    cat /tmp/nextjs_manual_test.log
fi

# ============================================================
# 8) Summary & Recommendations
# ============================================================

echo ""
echo "========================================="
echo "Summary & Recommendations"
echo "========================================="
echo ""
echo "Common Next.js Issues:"
echo ""
echo "1) Build directory missing:"
echo "   - Run: cd /var/www/absenin && pnpm build"
echo ""
echo "2) Port 3000 already in use:"
echo "   - Check: sudo lsof -i :3000"
echo "   - Kill: sudo kill -9 <PID>"
echo ""
echo "3) Environment variables missing:"
echo "   - Check .env files in apps/web/"
echo ""
echo "4) PM2 restart loop:"
echo "   - Check PM2 logs: pm2 logs absenin-web"
echo "   - Delete and restart: pm2 delete absenin-web && pm2 start ..."
echo ""
echo "5) Memory issue:"
echo "   - Check available memory: free -h"
echo "   - Increase swap if needed"
echo ""
