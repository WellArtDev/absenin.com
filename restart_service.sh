#!/bin/bash

# ============================================================
# Restart Service Script for Staging VPS
# Purpose: Restart API service on staging.absenin.com
# Usage: ./restart_service.sh [environment]
#   - Default: production
#   - Development: development
# ============================================================

set -e errexit pipefail

# Configuration
ENV="${1:-production}"
APP_NAME="absenin-api"
SERVICE_NAME="absenin-api"
PM2_APP_NAME="absenin-api"
LOG_DIR="/var/log/$SERVICE_NAME"

# Colors for output
GREEN='\033[0m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Process management
PM2_START=0
if [ "$ENV" = "development" ]; then
    PM2_PROCESS="pm2 start"
    PM2_STOP="pm2 stop"
else
    PM2_PROCESS="pm2 restart"
    PM2_STOP="pm2 stop"
fi

# ============================================================
# Functions
# ============================================================

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $SERVICE_NAME: $PM2_START"
    echo "Attempting to restart $SERVICE_NAME..."
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] $SERVICE_NAME: ERROR - $1"
    echo "Error: $1"
    echo "$1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] $SERVICE_NAME: WARNING - $1"
    echo "Warning: $1"
}

success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $SERVICE_NAME: SUCCESS"
    echo "Successfully restarted $SERVICE_NAME"
}

# ============================================================
# PM2 Manager
# ============================================================

start_pm2() {
    log "Checking for existing PM2 process..."

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed"
        return 1
    fi

    # Check if PM2 process is already running
    if pm2 list | grep -q "$APP_NAME"; then
        warn "PM2 process found, restarting..."
        PM2_PROCESS="restart"
    else
        log "No existing PM2 process found, starting new process..."
        PM2_PROCESS="start"
    fi

    # Start or restart PM2
    log "Executing: pm2 $PM2_PROCESS..."

    # Using pm2 CLI instead of API for better process control
    cd /var/www/$SERVICE_NAME || {
        error "Failed to change directory to /var/www/$SERVICE_NAME"
        return 1
    }

    case "$PM2_PROCESS" in
        start)
            # Start PM2 daemon
            pm2 start "pnpm --filter @absenin/api start" --name "$APP_NAME"
            ;;
        restart)
            # Graceful restart (zero downtime)
            pm2 restart "$APP_NAME"
            ;;
        stop)
            # Stop PM2 daemon (not needed for restart)
            pm2 stop "$APP_NAME"
            ;;
        *)
            error "Unknown PM2 process: $PM2_PROCESS"
            log "Unknown PM2 process: $PM2_PROCESS"
            return 1
            ;;
    esac

    log "PM2 command executed: pm2 $PM2_PROCESS"
    pm2 save
    return 0
}

# ============================================================
# Alternative: Systemd (if available)
# ============================================================

check_systemd() {
    if command -v systemctl &> /dev/null; then
        SYSTEMD_AVAILABLE=true
        log "systemd detected - will use systemd method"
    fi
}

restart_via_systemd() {
    if [ "$SYSTEMD_AVAILABLE" = true ]; then
        # Check if systemd service exists
        if systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
            log "Restarting via systemd..."
            sudo systemctl restart "$SERVICE_NAME"
            log "Waiting for service to restart..."

            # Wait for service to be active
            for i in {1..30}; do
                sleep 1
                if systemctl is-active "$SERVICE_NAME" &> /dev/null; then
                    log "Service is now active"
                    break
                fi
            done

            log "Service restart completed via systemd"
            return 0
        else
            warn "systemd service ${SERVICE_NAME}.service not found"
            log "Falling back to PM2 method..."
        fi
    else
        warn "systemd not available"
        # Fall through to PM2 method
    fi
}

# ============================================================
# Main Script
# ============================================================

main() {
    local exit_code=0

    log "========================================="
    log "Restart Service Script for Staging VPS"
    log "Environment: $ENV"
    log "Service: $SERVICE_NAME"
    log "Date: $(date +'%Y-%m-%d %H:%M:%S')"
    log "========================================="

    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        log "Running with root privileges"
    else
        log "Not running as root - may need sudo"
    fi

    # Check which method to use
    check_systemd

    # Try systemd first (preferred for production)
    if [ "$SYSTEMD_AVAILABLE" = true ]; then
        restart_via_systemd
        exit_code=$?
    else
        # Fall back to PM2 method
        start_pm2
        exit_code=$?
    fi

    log "Restart script completed with exit code: $exit_code"
    exit $exit_code
}

# Call main
main "$@"
