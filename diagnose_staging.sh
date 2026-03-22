#!/bin/bash

# ============================================================
# Staging Diagnosis Script
# Purpose: Diagnose Nginx connection refused issue
# Usage: ./diagnose_staging.sh
# ============================================================

set -e

echo "========================================="
echo "Staging Diagnosis Script"
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
# 1) Check Next.js Configuration
# ============================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1) Next.js Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "/var/www/absenin/apps/web/next.config.js" ]; then
    info "Next.js config found"
    echo "Default port: 3000 (from NEXT_PUBLIC_APP_URL)"
else
    error "Next.js config not found"
fi

# ============================================================
# 2) Check PM2 Configuration
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2) PM2 Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v pm2 &> /dev/null; then
    info "PM2 is installed"

    echo ""
    echo "PM2 Status:"
    pm2 status

    echo ""
    echo "PM2 List (JSON):"
    pm2 list --json | jq -r '.[] | select(.name | contains("absenin")) | {name, pid, pm2_env: .pm2_env, cpu, memory}'

    echo ""
    echo "PM2 Logs (absenin-web, last 20 lines):"
    pm2 logs absenin-web --lines 20 --nostream || echo "No logs available"

    echo ""
    echo "PM2 Logs (absenin-api, last 20 lines):"
    pm2 logs absenin-api --lines 20 --nostream || echo "No logs available"

else
    error "PM2 is not installed"
fi

# ============================================================
# 3) Check Port Binding
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3) Port Binding"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
info "Checking port 3000 (Next.js):"
if lsof -i :3000 2>/dev/null | grep -v COMMAND; then
    success "Port 3000 is in use"
else
    warn "Port 3000 is NOT in use"
fi

echo ""
info "Checking port 3001 (API):"
if lsof -i :3001 2>/dev/null | grep -v COMMAND; then
    success "Port 3001 is in use"
else
    warn "Port 3001 is NOT in use"
fi

echo ""
info "Checking internal connections:"
echo "Testing http://127.0.0.1:3000..."
if curl -I http://127.0.0.1:3000 2>&1 | head -1; then
    success "Connection to 127.0.0.1:3000 successful"
else
    error "Connection to 127.0.0.1:3000 FAILED"
fi

echo ""
echo "Testing http://127.0.0.1:3001..."
if curl -I http://127.0.0.1:3001 2>&1 | head -1; then
    success "Connection to 127.0.0.1:3001 successful"
else
    error "Connection to 127.0.0.1:3001 FAILED"
fi

# ============================================================
# 4) Check Firewall/UFW
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4) Firewall Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v ufw &> /dev/null; then
    echo ""
    info "UFW Status:"
    sudo ufw status || echo "UFW status check failed"
else
    warn "UFW is not installed"
fi

echo ""
info "Loopback interface (127.0.0.1):"
if ip addr show lo 2>/dev/null | grep -q "127.0.0.1"; then
    success "Loopback interface is up"
else
    error "Loopback interface is down"
fi

# ============================================================
# 5) Check Nginx Configuration
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5) Nginx Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v nginx &> /dev/null; then
    info "Nginx is installed"

    echo ""
    info "Nginx Status:"
    sudo systemctl status nginx --no-pager | head -20 || echo "Status check failed"

    echo ""
    info "Nginx Test:"
    sudo nginx -t 2>&1

    echo ""
    info "Nginx Configuration (staging.absenin.com):"
    if [ -f "/etc/nginx/sites-available/staging.absenin.com" ]; then
        cat /etc/nginx/sites-available/staging.absenin.com | grep -A 5 "upstream\|location\|proxy_pass"
    elif [ -f "/etc/nginx/conf.d/staging.conf" ]; then
        cat /etc/nginx/conf.d/staging.conf | grep -A 5 "upstream\|location\|proxy_pass"
    else
        warn "Nginx config file not found in common locations"
        echo "Common locations:"
        echo "  - /etc/nginx/sites-available/staging.absenin.com"
        echo "  - /etc/nginx/conf.d/staging.conf"
    fi

    echo ""
    info "Nginx Error Log (last 20 lines):"
    sudo tail -20 /var/log/nginx/error.log 2>/dev/null || echo "Error log not accessible"

else
    error "Nginx is not installed"
fi

# ============================================================
# 6) Public URL Test
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6) Public URL Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
info "Testing https://staging.absenin.com..."
if curl -I https://staging.absenin.com 2>&1 | head -5; then
    success "Public URL is accessible"
else
    error "Public URL is NOT accessible"
fi

# ============================================================
# 7) Summary
# ============================================================

echo ""
echo "========================================="
echo "Summary & Recommendations"
echo "========================================="
echo ""
echo "Common Issues & Solutions:"
echo ""
echo "1) Port 3000 not bound:"
echo "   - Check PM2: pm2 status"
echo "   - Start web: pm2 start \"pnpm --filter @absenin/web start -p 3000\" --name absenin-web"
echo ""
echo "2) Nginx 502 Bad Gateway:"
echo "   - Check PM2 process is running"
echo "   - Check nginx upstream configuration"
echo "   - Test internal connection: curl http://127.0.0.1:3000"
echo ""
echo "3) Nginx 404 Not Found:"
echo "   - Check nginx location blocks"
echo "   - Verify proxy_pass points to correct port"
echo ""
echo "4) Connection Refused:"
echo "   - Check firewall (ufw status)"
echo "   - Verify nginx upstream block"
echo "   - Restart PM2: pm2 restart absenin-web"
echo ""
