# Deploy to Staging Guide

**Date:** 2026-03-23
**Status:** Ready to deploy

---

## Prerequisites

- SSH access to staging VPS: `absenin@staging.absenin.com`
- Restart script: `restart_service.sh`
- GitHub Actions configured (optional)

---

## Deployment Options

### Option 1: Automatic Deployment via GitHub Actions ✅ RECOMMENDED

**Requirements:**
- Update GitHub secret `STAGING_APP_DIR` to `/var/www/absenin`
- All code must be pushed to `main` branch

**Steps:**

1. **Update GitHub Secret:**
   ```bash
   # Go to: https://github.com/WellArtDev/absenin.com/settings/secrets/actions
   # Find: STAGING_APP_DIR
   # Change from: /var/www/absenin.com
   # Change to: /var/www/absenin
   # Click "Update secret"
   ```

2. **Push to main:**
   ```bash
   git status
   git add .
   git commit -m "chore: Update staging deployment configuration"
   git push origin main
   ```

3. **Monitor Deployment:**
   - Go to: https://github.com/WellArtDev/absenin.com/actions
   - Watch "Deploy Staging" workflow run
   - All 3 jobs should complete successfully:
     - ✅ Quality Gate
     - ✅ Deploy
     - ✅ Health Check

4. **Verify Deployment:**
   ```bash
   # Check API health
   curl https://staging.absenin.com/api/whatsapp/health

   # Check login
   curl -I https://staging.absenin.com/login
   ```

---

### Option 2: Manual Deployment with Restart Script

**Requirements:**
- `restart_service.sh` script uploaded to staging VPS
- SSH access to staging VPS

**Steps:**

1. **Upload Restart Script:**
   ```bash
   # From local machine
   scp restart_service.sh absenin@staging.absenin.com:/home/absenin/
   ```

2. **SSH into Staging VPS:**
   ```bash
   ssh absenin@staging.absenin.com
   ```

3. **Run Deployment:**
   ```bash
   cd /var/www/absenin
   sudo ./restart_service.sh
   ```

4. **Watch Output:**
   ```
   [GREEN][05:30:00] absenin-api: Running database migrations...
   [GREEN][05:30:10] absenin-api: Database migrations completed successfully
   [GREEN][05:30:11] absenin-api: Checking for existing PM2 process...
   [GREEN][05:30:12] absenin-api: PM2 process found, restarting...
   [GREEN][05:30:13] absenin-api: PM2 command executed: pm2 restart
   [GREEN][05:30:14] absenin-api: Successfully restarted absenin-api
   ```

5. **Verify Deployment:**
   ```bash
   # Check PM2 status
   pm2 status

   # Check logs
   pm2 logs absenin-api --lines 50

   # Test API
   curl https://staging.absenin.com/api/whatsapp/health
   ```

---

### Option 3: Manual Deployment (Step-by-Step)

**Steps:**

1. **SSH into Staging VPS:**
   ```bash
   ssh absenin@staging.absenin.com
   ```

2. **Navigate to App Directory:**
   ```bash
   cd /var/www/absenin
   ```

3. **Pull Latest Code:**
   ```bash
   git fetch --all
   git reset --hard origin/main
   ```

4. **Install Dependencies:**
   ```bash
   pnpm install --frozen-lockfile
   ```

5. **Generate Prisma Client:**
   ```bash
   pnpm --filter @absenin/api db:generate
   ```

6. **Build All Packages:**
   ```bash
   pnpm build
   ```

7. **Run Database Migrations:**
   ```bash
   cd apps/api
   npx prisma migrate deploy
   cd ../..
   ```

8. **Restart PM2 Processes:**
   ```bash
   pm2 restart absenin-api || pm2 start "pnpm --filter @absenin/api start" --name absenin-api
   pm2 restart absenin-web || pm2 start "pnpm --filter @absenin/web start -p 3000" --name absenin-web
   pm2 save
   ```

9. **Reload Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

10. **Verify Deployment:**
    ```bash
    # Check API health
    curl https://staging.absenin.com/api/whatsapp/health

    # Check login page
    curl -I https://staging.absenin.com/login

    # Check PM2 status
    pm2 status
    ```

---

## What Gets Deployed

### New Features:
- ✅ Fonnte adapter implementation
- ✅ WhatsApp health endpoints (`/api/whatsapp/health`, `/api/whatsapp/status`, `/api/whatsapp/providers`)
- ✅ Health check verification in CI/CD
- ✅ Database migration automation in restart script
- ✅ Improved restart script with systemd/PM2 detection

### Files Changed:
- `apps/api/src/modules/whatsapp/` - Fonnte adapter, health controller
- `apps/api/src/index.ts` - Health routes
- `apps/api/prisma/schema.prisma` - Idempotency constraint
- `apps/api/prisma/migrations/` - Schema fix migration
- `.github/workflows/` - CI/CD workflows
- `restart_service.sh` - Updated restart script

---

## Troubleshooting

### Issue 1: systemd Service Not Found

**Symptom:** `systemd service absenin-api.service not found`

**Solution:** This is expected behavior. The script will fall back to PM2 method automatically.

```bash
# Check if PM2 is running
pm2 status

# Manually restart via PM2
pm2 restart absenin-api
```

### Issue 2: Database Migration Fails

**Symptom:** `Database migrations failed`

**Solution:**
```bash
# Check migration status
cd /var/www/absenin/apps/api
npx prisma migrate status

# Manually run migrations
npx prisma migrate deploy

# Check database connection
npx prisma db pull
```

### Issue 3: PM2 Process Not Found

**Symptom:** `PM2 process not found`

**Solution:**
```bash
# Start API manually
cd /var/www/absenin
pm2 start "pnpm --filter @absenin/api start" --name absenin-api
pm2 save

# Start Web manually
pm2 start "pnpm --filter @absenin/web start -p 3000" --name absenin-web
pm2 save
```

### Issue 4: Port Already in Use

**Symptom:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Restart PM2
pm2 restart absenin-api
```

---

## Post-Deployment Verification

### 1. Check API Health
```bash
curl https://staging.absenin.com/api/whatsapp/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-23T05:30:00.000Z",
  "integration": "whatsapp",
  "providers": {
    "meta": { "status": "misconfigured", "configured": false },
    "fonnte": { "status": "misconfigured", "configured": false },
    "wablas": { "status": "misconfigured", "configured": false }
  },
  "database": { "status": "healthy", "latency_ms": 10 }
}
```

### 2. Check Login Page
```bash
curl -I https://staging.absenin.com/login
```

**Expected Response:** `HTTP/1.1 200 OK`

### 3. Test Login CSRF
```bash
curl -X POST https://staging.absenin.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

**Expected Response:** `{"success":false,"error":{"type":"INTERNAL","message":"CSRF token missing..."}}`

### 4. Check PM2 Status
```bash
pm2 status
```

**Expected Output:**
```
┌────┬───────────────────┬─────────────┬─────────┬─────────┬──────────┬──────────┐
│ id │ name              │ namespace   │ version │ mode    │ pid      │ status   │
├────┼───────────────────┼─────────────┼─────────┼─────────┼──────────┼──────────┤
│ 0  │ absenin-api      │ default     │ 1.0.0   │ fork     │ 12345    │ online   │
│ 1  │ absenin-web      │ default     │ 1.0.0   │ fork     │ 12346    │ online   │
└────┴───────────────────┴─────────────┴─────────┴─────────┴──────────┴──────────┘
```

---

## Recommended Next Steps

1. ✅ Deploy to staging (choose option above)
2. ✅ Verify deployment using post-deployment checks
3. ✅ Configure Fonnte API credentials in database
4. ✅ Test WhatsApp integration with Fonnte
5. ✅ Begin pilot testing

---

**Document Version:** 1.0
**Last Updated:** 2026-03-23
**Status:** Ready to Deploy
