# Deployment Guide

**Simple, single-file deployment for staging VPS**

---

## Quick Start

### Option 1: Deploy from Local (Recommended)

```bash
# 1. Copy script to staging
scp deploy.sh absenin@staging.absenin.com:/home/absenin/

# 2. SSH to staging
ssh absenin@staging.absenin.com

# 3. Make executable and run
cd /home/absenin
chmod +x deploy.sh
sudo ./deploy.sh
```

### Option 2: Deploy via GitHub Actions (Automatic)

Just push to `main` branch. GitHub Actions will automatically:
1. Run quality gate (lint, type-check, build)
2. Deploy to staging
3. Verify health endpoints

---

## Script Features

### ✅ What It Does

1. **Checks Dependencies** - git, pnpm, npx, pm2
2. **Validates Environment** - app directory, .env file
3. **Pulls Latest Code** - git fetch && reset --hard
4. **Installs Dependencies** - pnpm install --frozen-lockfile
5. **Generates Prisma Client** - pnpm db:generate
6. **Builds Project** - pnpm build
7. **Runs Migrations** - npx prisma migrate deploy
8. **Restarts Services** - pm2 restart absenin-api & absenin-web
9. **Reloads nginx** - systemctl reload nginx
10. **Verifies Deployment** - checks PM2 status and API health

### 🎯 Key Features

- **Zero Downtime** - Graceful PM2 restart
- **Database Safe** - Migrations run before service restart
- **Error Handling** - Clear error messages with suggestions
- **Status Checks** - Verifies services are running after deploy
- **Color-coded Output** - Easy to read logs

---

## Usage

### Basic Usage

```bash
# Deploy to staging (default)
./deploy.sh

# Deploy to production
./deploy.sh production
```

### Output Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Checking dependencies...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All dependencies are installed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pulling latest code...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Code pulled successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running database migrations...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Database migrations completed successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Restarting services...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ absenin-api restarted successfully
✅ absenin-web restarted successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verifying deployment...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ absenin-api is running
✅ absenin-web is running

========================================
✅ Deployment completed successfully!
========================================
```

---

## Troubleshooting

### Issue: Migration Failed

**Symptom:**
```
❌ Database migrations failed
```

**Solution:**
```bash
cd /var/www/absenin/apps/api

# Check migration status
npx prisma migrate status

# Resolve failed migration
npx prisma migrate resolve --applied <migration_name>

# Retry deployment
cd /var/www/absenin
sudo ./deploy.sh
```

### Issue: Port Already in Use

**Symptom:**
```
❌ API is not running
```

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Restart PM2
pm2 restart absenin-api
```

### Issue: Dependencies Not Found

**Symptom:**
```
❌ Missing dependencies: pnpm
```

**Solution:**
```bash
# Install pnpm
corepack enable
corepack prepare pnpm@10 --activate
```

### Issue: PM2 Process Not Found

**Symptom:**
```
⚠️  absenin-api is not running
```

**Solution:**
```bash
cd /var/www/absenin

# Start API manually
pm2 start "pnpm --filter @absenin/api start" --name absenin-api
pm2 start "pnpm --filter @absenin/web start -p 3000" --name absenin-web
pm2 save
```

---

## Monitoring

### Check PM2 Status

```bash
pm2 status
```

### View Logs

```bash
# API logs
pm2 logs absenin-api --lines 50

# Web logs
pm2 logs absenin-web --lines 50

# Follow logs in real-time
pm2 logs
```

### Check nginx Logs

```bash
# Error logs
sudo tail -f /var/log/nginx/error.log

# Access logs
sudo tail -f /var/log/nginx/access.log
```

### Test API Endpoints

```bash
# Health check
curl https://staging.absenin.com/api/health

# WhatsApp health
curl https://staging.absenin.com/api/whatsapp/health

# Login page
curl -I https://staging.absenin.com/login
```

---

## Comparison: Script vs GitHub Actions

| Feature | Manual Script | GitHub Actions |
|---------|---------------|-----------------|
| Deployment Speed | ⚡ Fast (2-3 min) | 🐢 Slower (4-5 min) |
| Quality Gates | ❌ No | ✅ Lint, type-check, build |
| Health Checks | ✅ Basic | ✅ Comprehensive |
| Rollback | ❌ Manual | ❌ Manual |
| Monitoring | ❌ No | ✅ Web UI |
| Access | SSH required | Git push |

**Recommendation:** Use script for quick deployments, use GitHub Actions for production deployments with quality gates.

---

## Next Steps After Deployment

1. ✅ Verify deployment with health checks
2. ✅ Check PM2 logs for errors
3. ✅ Test critical endpoints
4. ✅ Monitor for a few minutes
5. ✅ Check analytics/monitoring if available

---

**Document Version:** 1.0
**Last Updated:** 2026-03-23
**Status:** ✅ Production-Ready
