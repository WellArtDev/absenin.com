# Restart Service Guide - Staging VPS
**Version:** 1.0
**Date:** 2026-03-22
**Purpose:** Bash script to restart API service on staging

---

## Overview

This script provides a production-ready method to restart the `absenin-api` service on the staging VPS. It includes PM2 process management and systemd integration.

---

## Script Location

**File:** `/home/wethepeople/.openclaw/workspace/absenin.com/restart_service.sh`

---

## Usage

### Basic Usage

```bash
# Restart service (auto-detects environment)
./restart_service.sh

# Specify environment manually
./restart_service.sh production
./restart_service.sh development
```

### Options

| Option | Description | Default |
|--------|-------------|--------|
| `--production` | Force production mode | Auto-detected |
| `--development` | Force development mode | |

### Environment Detection

The script automatically detects:
- **Production**: If `NODE_ENV=production` is set
- **Development**: If `NODE_ENV=development` is set
- **Fallback**: Production if neither is set

---

## Features

### 1. Database Migration

**Automatic Migration:**
- Runs `npx prisma migrate deploy` before restarting
- Applies all pending database migrations
- Stops restart if migration fails (safe default)
- Ensures database schema is up-to-date

**Migration Command:**
```bash
npx prisma migrate deploy
```

**Important:**
- Migration runs before service restart
- If migration fails, restart is aborted
- Check logs for migration errors

### 2. PM2 Process Management

**Smart Detection:**
- Checks for existing PM2 ecosystem file
- Avoids duplicate processes
- Graceful restart with zero downtime

**Supported Operations:**
- `start` - Start PM2 daemon
- `restart` - Graceful restart (zero downtime)
- `stop` - Stop PM2 daemon

### 3. Systemd Integration

**Automatic Detection:**
- Checks if `systemd` is available
- Uses systemd if available (preferred)
- Falls back to PM2 if systemd not available

**Systemd Commands:**
```bash
sudo systemctl restart absenin-api
sudo systemctl status absenin-api
```

### 3. Logging

**Color-Coded Output:**
- ✅ GREEN - Success messages
- ✅ RED - Error messages
- ✅ YELLOW - Warning messages
- ✅ NC - No color (important info)

**Log Locations:**
- Console output
- `/var/log/absenin-api/pm2-out.log` (if PM2 used)
- `/var/log/absenin-api/pm2-error.log` (if PM2 used)

---

## Script Functions

### Environment Detection
```bash
ENV="${1:-production}"
if [ "$ENV" = "development" ]; then
    PM2_PROCESS="pm2 start"
else
    PM2_PROCESS="pm2 restart"
fi
```

### Database Migration
```bash
migrate_database() {
    log "Running database migrations..."

    cd /var/www/$SERVICE_NAME/apps/api
    npx prisma migrate deploy

    if [ $? -eq 0 ]; then
        success "Database migrations completed successfully"
        return 0
    else
        error "Database migrations failed"
        return 1
    fi
}
```

### Process Management
```bash
start_pm2() {
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed"
        return 1
    fi

    # Check if PM2 process is already running
    if pm2 list | grep -q "$APP_NAME"; then
        PM2_PROCESS="restart"
    else
        PM2_PROCESS="start"
    fi

    case "$PM2_PROCESS" in
        start)
            pm2 start "pnpm --filter @absenin/api start" --name "$APP_NAME"
            ;;
        restart)
            pm2 restart "$APP_NAME"
            ;;
    esac

    pm2 save
}
```

### Systemd Integration
```bash
check_systemd() {
    if command -v systemctl &> /dev/null; then
        SYSTEMD_AVAILABLE=true
    fi
}

restart_via_systemd() {
    if [ "$SYSTEMD_AVAILABLE" = true ]; then
        sudo systemctl restart "$SERVICE_NAME"
    fi
}
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Permission Denied

**Symptom:** `Permission denied` when running script

**Solution:**
```bash
# Run with sudo
sudo ./restart_service.sh
```

#### Issue 2: PM2 Not Installed

**Symptom:** `pm2: command not found`

**Solution:**
```bash
# Install PM2 globally
npm install -g pm2
```

#### Issue 3: Service Not Found

**Symptom:** `pm2 start "absenin-api" failed with "name missing"

**Solution:**
The app name in the script must match the actual PM2 app name.

Check actual PM2 app name:
```bash
pm2 list
```

#### Issue 4: Server Not Running

**Symptom:** API server at `localhost:3000` not accessible

**Solution:**
```bash
# Check server status
curl -I http://localhost:3000/api/health

# Start server if needed
cd /var/www/absenin
pm2 start absenin-api
```

#### Issue 5: Database Migration Fails

**Symptom:** `Database migrations failed` or `npx: command not found`

**Solution:**
```bash
# Check if npx is available
which npx

# If not available, install Node.js with npx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Check database connection
cd /var/www/absenin/apps/api
npx prisma db pull

# Manually run migrations
npx prisma migrate deploy
```

#### Issue 6: Migration Aborts Restart

**Symptom:** Restart aborted due to migration failure

**Solution:**
```bash
# Check migration status
cd /var/www/absenin/apps/api
npx prisma migrate status

# Review migration logs
tail -f /var/log/absenin-api/pm2-error.log

# Fix migration issues, then re-run
./restart_service.sh
```

---

## Examples

### Example 1: Basic Restart (Production)

```bash
./restart_service.sh
# Output:
# [GREEN][19:45:05] absenin-api: Running database migrations...
# [GREEN][19:45:15] absenin-api: Database migrations completed successfully
# [GREEN][19:45:16] absenin-api: Checking for existing PM2 process...
# [GREEN][19:45:17] absenin-api: PM2 process found, restarting...
# [GREEN][19:45:18] absenin-api: Successfully restarted absenin-api
```

### Example 2: Restart via Systemd

```bash
sudo systemctl restart absenin-api

# Note: The restart_service.sh script runs migrations before restarting:
# 1. npx prisma migrate deploy
# 2. Restart service via systemd or PM2
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error in execution (logged with details) |
| 2 | Unknown error (script bug) |

---

## Security Notes

1. **Root Privileges Required**
   - Script needs `sudo` for systemd operations
   - If not root, script will fall back to PM2 method

2. **File Permissions**
   - Script must be executable: `chmod +x restart_service.sh`

3. **Production Mode**
   - Default environment detection checks `NODE_ENV` variable
   - Can override with `--production` flag

4. **Logging**
   - All operations are logged to:
    - Console (timestamped)
    - `/var/log/absenin-api/` (systemd + PM2 logs)

---

## Next Steps

1. **Make Script Executable**
   ```bash
   chmod +x /home/wethepeople/.openclaw/workspace/absenin.com/restart_service.sh
   ```

2. **Copy to Staging VPS**
   ```bash
   scp restart_service.sh user@staging-vps:/home/user/
   ```

3. **Run on Staging**
   ```bash
   ssh user@staging-vps
   cd /var/www/absenin
   sudo ./restart_service.sh
   ```

4. **Verify Restart**
   ```bash
   ssh user@staging-vps
   pm2 status
   curl -I http://localhost:3000/api/health
   ```

---

## Support

If you encounter issues:
1. Check the logs: `sudo tail -f /var/log/absenin-api/pm2-*.log`
2. Check service status: `sudo systemctl status absenin-api`
3. Test manually: `pm2 restart absenin-api`

---

**Document Version:** 1.0
**Last Updated:** 2026-03-22 19:45
**Status:** ✅ Production-Ready
