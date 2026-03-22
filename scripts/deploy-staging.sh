#!/bin/bash
# Staging Deployment Script for Absenin.com
# Usage: ./scripts/deploy-staging.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/absenin.com/staging"
REPO_URL="https://github.com/your-username/absenin.com.git"
BRANCH="main"
BACKUP_DIR="/var/backups/absenin.com/staging"
LOG_FILE="/var/log/absenin.com/staging/deploy.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    log "✓ $1"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    log "✗ $1"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    log "⚠ $1"
}

# Start deployment
log "=========================================="
log "Starting staging deployment"
log "=========================================="

# Pre-deployment checks
log "Running pre-deployment checks..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
print_success "Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is not installed"
    exit 1
fi
print_success "pnpm version: $(pnpm --version)"

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    print_error "PostgreSQL is not running"
    exit 1
fi
print_success "PostgreSQL is running"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed"
    exit 1
fi
print_success "PM2 is installed"

# Backup current deployment
log "Creating backup..."
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
if [ -d "$PROJECT_DIR" ]; then
    cp -r "$PROJECT_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    print_success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
else
    print_warning "No existing deployment to backup"
fi

# Create project directory if it doesn't exist
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Pull latest code
log "Pulling latest code..."
if [ -d ".git" ]; then
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
    print_success "Code updated"
else
    git clone "$REPO_URL" .
    print_success "Repository cloned"
fi

# Create .env.staging from template if it doesn't exist
if [ ! -f ".env.staging" ]; then
    if [ -f ".env.staging.template" ]; then
        cp .env.staging.template .env.staging
        print_warning ".env.staging created from template - PLEASE CONFIGURE IT"
    else
        print_error ".env.staging.template not found"
        exit 1
    fi
fi

# Install dependencies
log "Installing dependencies..."
pnpm install --frozen-lockfile
print_success "Dependencies installed"

# Build application
log "Building application..."
pnpm build
print_success "Build successful"

# Run database migrations
log "Running database migrations..."
cd apps/api
npx prisma migrate deploy
print_success "Database migrations applied"

# Generate Prisma client
log "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Verify RefreshToken table
log "Verifying RefreshToken table..."
PGPASSWORD=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^:]*')
PGHOST=localhost PGUSER=$(echo "$DATABASE_URL" | grep -oP 'postgresql://\K[^@]*' | cut -d: -f2) \
  PGDATABASE=$(echo "$DATABASE_URL" | grep -oP '/\K[^?]*') \
  psql -c "SELECT COUNT(*) FROM refresh_tokens;" 2>/dev/null || true

if [ $? -eq 0 ]; then
    print_success "RefreshToken table exists and accessible"
else
    print_error "RefreshToken table not found"
    exit 1
fi

# Create necessary directories
log "Creating directories..."
mkdir -p /var/www/absenin.com/staging/uploads/selfies
mkdir -p /var/log/absenin.com/staging
chmod -R 755 /var/www/absenin.com/staging/uploads
print_success "Directories created"

# Start/Restart PM2 processes
log "Starting PM2 processes..."
cd "$PROJECT_DIR"

# Stop existing processes
pm2 stop absenin-api 2>/dev/null || true
pm2 stop absenin-web 2>/dev/null || true

# Start API
cd apps/api
pm2 start dist/index.js --name absenin-api --max-memory-restart 500M --env production
print_success "API started with PM2"

# Start Web
cd ../web
pm2 start node_modules/.bin/next --name absenin-web -- start --port 3002 --env production
print_success "Web started with PM2"

# Save PM2 configuration
pm2 save
pm2 startup | tail -n 1 || true
print_success "PM2 configuration saved"

# Set up cleanup cron job
log "Setting up cleanup cron job..."
CRON_CMD="0 2 * * * /var/www/absenin.com/staging/apps/api/scripts/run-cleanup.sh >> /var/log/absenin.com/staging/cleanup.log 2>&1"
if ! crontab -l 2>/dev/null | grep -q "run-cleanup.sh"; then
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    print_success "Cleanup cron job added"
else
    print_success "Cleanup cron job already exists"
fi

# Verify services
log "Verifying services..."

# Check PM2 status
pm2 status | tee -a "$LOG_FILE"

# Check Nginx configuration
if nginx -t 2>&1 | grep -q "successful"; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors"
    nginx -t
    exit 1
fi

# Reload Nginx
systemctl reload nginx
print_success "Nginx reloaded"

log "=========================================="
log "Deployment completed successfully"
log "=========================================="

# Run smoke tests
log "Running smoke tests..."
"$PROJECT_DIR/scripts/smoke-test.sh" || {
    print_error "Smoke tests failed"
    exit 1
}

print_success "All smoke tests passed"
log "=========================================="
log "Staging deployment is LIVE"
log "=========================================="
