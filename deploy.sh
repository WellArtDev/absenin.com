#!/bin/bash

# ============================================================
# Deployment Script for Staging VPS
# Purpose: Deploy, migrate, and restart services
# Usage: ./deploy.sh [environment]
#   - Default: staging
#   - Environment: staging|production
# ============================================================

set -e errexit pipefail

# ============================================================
# Configuration
# ============================================================

ENV="${1:-staging}"
APP_DIR="/var/www/absenin"
APP_NAME="absenin"
LOG_DIR="/var/log/$APP_NAME"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# Logging Functions
# ============================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log "$1"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================================
# Error Handler
# ============================================================

cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        error "Deployment failed with exit code: $exit_code"
        error "Check logs in: $LOG_DIR"
    fi
    exit $exit_code
}

trap cleanup EXIT

# ============================================================
# Validation Functions
# ============================================================

check_dependencies() {
    step "Checking dependencies..."

    local missing_deps=()

    # Check git
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        missing_deps+=("pnpm")
    fi

    # Check npx
    if ! command -v npx &> /dev/null; then
        missing_deps+=("npx")
    fi

    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        missing_deps+=("pm2")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        error "Missing dependencies: ${missing_deps[*]}"
        error "Install missing dependencies and try again"
        exit 1
    fi

    success "All dependencies are installed"
}

validate_environment() {
    step "Validating environment..."

    # Check if app directory exists
    if [ ! -d "$APP_DIR" ]; then
        error "Application directory does not exist: $APP_DIR"
        exit 1
    fi

    # Check if .env file exists
    if [ ! -f "$APP_DIR/apps/api/.env" ]; then
        error ".env file not found: $APP_DIR/apps/api/.env"
        exit 1
    fi

    success "Environment is valid"
}

# ============================================================
# Deployment Functions
# ============================================================

pull_code() {
    step "Pulling latest code..."

    cd "$APP_DIR" || {
        error "Failed to change directory to $APP_DIR"
        exit 1
    }

    # Fetch all branches
    log "Fetching all branches..."
    git fetch --all

    # Check if we need to pull
    local local_hash=$(git rev-parse HEAD)
    local remote_hash=$(git rev-parse origin/main)

    if [ "$local_hash" = "$remote_hash" ]; then
        warn "No new changes to deploy"
    else
        log "Resetting to origin/main..."
        git reset --hard origin/main
        success "Code pulled successfully"
        log "Deployed commit: $(git log -1 --oneline)"
    fi
}

install_dependencies() {
    step "Installing dependencies..."

    cd "$APP_DIR" || {
        error "Failed to change directory to $APP_DIR"
        exit 1
    }

    # Ensure pnpm is available
    if ! command -v pnpm &> /dev/null; then
        log "Enabling pnpm..."
        corepack enable
        corepack prepare pnpm@10 --activate
    fi

    # Install dependencies
    log "Installing dependencies with pnpm..."
    pnpm install --frozen-lockfile

    success "Dependencies installed successfully"
}

generate_prisma_client() {
    step "Generating Prisma client..."

    cd "$APP_DIR" || {
        error "Failed to change directory to $APP_DIR"
        exit 1
    }

    log "Generating Prisma client for @absenin/api..."
    pnpm --filter @absenin/api db:generate

    success "Prisma client generated successfully"
}

build_project() {
    step "Building project..."

    cd "$APP_DIR" || {
        error "Failed to change directory to $APP_DIR"
        exit 1
    }

    log "Building all packages..."
    pnpm build

    success "Project built successfully"
}

run_migrations() {
    step "Running database migrations..."

    cd "$APP_DIR/apps/api" || {
        error "Failed to change directory to $APP_DIR/apps/api"
        exit 1
    }

    # Check migration status first
    log "Checking migration status..."
    npx prisma migrate status

    # Run migrations
    log "Applying pending migrations..."
    if npx prisma migrate deploy; then
        success "Database migrations completed successfully"
    else
        error "Database migrations failed"
        error "Migration status:"
        npx prisma migrate status
        error ""
        error "To resolve failed migrations, run:"
        error "  npx prisma migrate resolve --applied <migration_name>"
        exit 1
    fi
}

restart_services() {
    step "Restarting services..."

    cd "$APP_DIR" || {
        error "Failed to change directory to $APP_DIR"
        exit 1
    }

    # Restart API
    if pm2 list | grep -q "$APP_NAME-api"; then
        log "Restarting $APP_NAME-api..."
        pm2 restart "$APP_NAME-api"
        success "$APP_NAME-api restarted successfully"
    else
        log "Starting $APP_NAME-api..."
        pm2 start "pnpm --filter @absenin/api start" --name "$APP_NAME-api"
        success "$APP_NAME-api started successfully"
    fi

    # Restart Web
    if pm2 list | grep -q "$APP_NAME-web"; then
        log "Restarting $APP_NAME-web..."
        pm2 restart "$APP_NAME-web"
        success "$APP_NAME-web restarted successfully"
    else
        log "Starting $APP_NAME-web..."
        pm2 start "pnpm --filter @absenin/web start -p 3000" --name "$APP_NAME-web"
        success "$APP_NAME-web started successfully"
    fi

    # Save PM2 process list
    pm2 save
}

reload_nginx() {
    step "Reloading nginx..."

    # Test nginx configuration
    if sudo nginx -t; then
        log "Reloading nginx..."
        sudo systemctl reload nginx
        success "nginx reloaded successfully"
    else
        warn "nginx configuration test failed, skipping reload"
    fi
}

verify_deployment() {
    step "Verifying deployment..."

    # Wait for services to start
    log "Waiting for services to start..."
    sleep 10

    # Check PM2 status
    local api_status=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME-api\") | .pm2_env.status" 2>/dev/null || echo "unknown")
    local web_status=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME-web\") | .pm2_env.status" 2>/dev/null || echo "unknown")

    if [ "$api_status" = "online" ]; then
        success "$APP_NAME-api is running"
    else
        error "$APP_NAME-api is not running (status: $api_status)"
        pm2 logs "$APP_NAME-api" --lines 20 --nostream
        exit 1
    fi

    if [ "$web_status" = "online" ]; then
        success "$APP_NAME-web is running"
    else
        error "$APP_NAME-web is not running (status: $web_status)"
        pm2 logs "$APP_NAME-web" --lines 20 --nostream
        exit 1
    fi

    # Check if API is responding
    if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
        success "API is responding on port 3001"
    elif curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
        success "API is responding on port 3000"
    else
        warn "API health endpoint not responding (this might be expected)"
    fi
}

# ============================================================
# Main Deployment
# ============================================================

main() {
    log "========================================"
    log "Deployment Script for $ENV"
    log "Environment: $ENV"
    log "App Directory: $APP_DIR"
    log "Date: $(date +'%Y-%m-%d %H:%M:%S')"
    log "========================================"

    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        warn "Running with root privileges"
    else
        log "Running as user: $(whoami)"
    fi

    # Run deployment steps
    check_dependencies
    validate_environment
    pull_code
    install_dependencies
    generate_prisma_client
    build_project
    run_migrations
    restart_services
    reload_nginx
    verify_deployment

    log ""
    log "========================================"
    success "Deployment completed successfully!"
    log "========================================"
    log ""
    log "Services:"
    log "  - API: $APP_NAME-api"
    log "  - Web: $APP_NAME-web"
    log ""
    log "Monitor logs with:"
    log "  pm2 logs $APP_NAME-api"
    log "  pm2 logs $APP_NAME-web"
    log ""
}

# Run main
main "$@"
