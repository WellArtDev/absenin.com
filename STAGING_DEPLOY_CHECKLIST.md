# Staging Deployment Checklist - Absenin.com

**Version:** 1.0
**Last Updated:** 2026-03-22
**Target:** Contabo VPS (Ubuntu 24.04)

---

## Pre-Deployment Checklist

### Prerequisites Verification

| Task | Command/Action | Expected Result | Status | Evidence |
|------|----------------|-----------------|---------|-----------|
| Node.js installed | `node --version` | v18.x or higher | ⬜ | |
| npm/pnpm installed | `pnpm --version` | v8.x or higher | ⬜ | |
| PostgreSQL running | `systemctl status postgresql` | active (running) | ⬜ | |
| PM2 installed | `pm2 --version` | v5.x or higher | ⬜ | |
| Nginx installed | `nginx -v` | v1.24 or higher | ⬜ | |
| Git installed | `git --version` | v2.x or higher | ⬜ | |
| Sufficient disk space | `df -h /` | > 10GB free | ⬜ | |
| Sufficient RAM | `free -h` | > 2GB available | ⬜ | |

### Database Preparation

| Task | Command/Action | Expected Result | Status | Evidence |
|------|----------------|-----------------|---------|-----------|
| Create staging database | `createdb absenin_staging` | Database created | ⬜ | |
| Create database user | `psql -c "CREATE USER absenin_staging WITH PASSWORD 'xxx';"` | User created | ⬜ | |
| Grant privileges | `psql -c "GRANT ALL PRIVILEGES ON DATABASE absenin_staging TO absenin_staging;"` | Privileges granted | ⬜ | |
| Test connection | `psql -h localhost -U absenin_staging -d absenin_staging` | Connection successful | ⬜ | |
| Verify migrations table | `psql -c "\dt"` | _prisma_migrations exists | ⬜ | |

### Environment Configuration

| Variable | Description | Required | Status | Notes |
|----------|-------------|-----------|---------|--------|
| `NODE_ENV` | Environment | staging | ⬜ | |
| `PORT` | API port | 3001 | ⬜ | |
| `DATABASE_URL` | PostgreSQL connection string | Yes (staging DB) | ⬜ | |
| `JWT_SECRET` | JWT signing secret | Yes (32+ chars) | ⬜ | |
| `CSRF_SECRET` | CSRF signing secret | Yes (32+ chars) | ⬜ | |
| `CORS_ORIGINS` | Allowed origins | staging.absenin.com | ⬜ | |
| `COOKIE_DOMAIN` | Cookie domain | .absenin.com | ⬜ | |
| `WHATSAPP_PROVIDER` | WA provider | meta/wablas/fonnte | ⬜ | |
| `UPLOAD_BASE_URL` | Upload URL | https://staging.absenin.com/uploads | ⬜ | |
| `UPLOAD_DIR` | Upload directory | /var/www/absenin.com/staging/uploads | ⬜ | |

---

## Deployment Steps

### Phase 1: Code Deployment

| Step | Command | Expected Result | Status | Evidence |
|------|---------|-----------------|---------|-----------|
| 1. Clone repository | `git clone <repo> /var/www/absenin.com/staging` | Code cloned | ⬜ | |
| 2. Copy env template | `cp .env.staging.template .env.staging` | File created | ⬜ | |
| 3. Configure environment | Edit .env.staging | Values set | ⬜ | |
| 4. Install dependencies | `pnpm install` | Dependencies installed | ⬜ | |
| 5. Build application | `pnpm build` | Build successful | ⬜ | |
| 6. Run migrations | `cd apps/api && npx prisma migrate deploy` | Migrations applied | ⬜ | |
| 7. Generate Prisma client | `npx prisma generate` | Client generated | ⬜ | |

### Phase 2: Database Verification

| Step | Command | Expected Result | Status | Evidence |
|------|---------|-----------------|---------|-----------|
| 1. Verify RefreshToken table | `psql -c "\d refresh_tokens"` | Table exists | ⬜ | |
| 2. Verify indexes | `psql -c "\di refresh_tokens*"` | Indexes created | ⬜ | |
| 3. Verify foreign keys | `psql -c "\d refresh_tokens"` | FK to users exists | ⬜ | |
| 4. Check record count | `psql -c "SELECT COUNT(*) FROM refresh_tokens;"` | 0 (new table) | ⬜ | |
| 5. Test insert/delete | `psql -c "INSERT/DELETE test;"` | Operations work | ⬜ | |

### Phase 3: PM2 Setup

| Step | Command | Expected Result | Status | Evidence |
|------|---------|-----------------|---------|-----------|
| 1. Copy ecosystem config | `cp ecosystem.config.staging.js /var/www/absenin.com/staging/` | Config copied | ⬜ | |
| 2. Start API | `pm2 start ecosystem.config.staging.js --only absenin-api` | API running | ⬜ | |
| 3. Start Web | `pm2 start ecosystem.config.staging.js --only absenin-web` | Web running | ⬜ | |
| 4. Verify API status | `pm2 status` | absenin-api: online | ⬜ | |
| 5. Verify Web status | `pm2 status` | absenin-web: online | ⬜ | |
| 6. Save PM2 config | `pm2 save` | Config saved | ⬜ | |
| 7. Setup PM2 startup | `pm2 startup` | Startup script installed | ⬜ | |
| 8. Create log directory | `mkdir -p /var/log/absenin.com/staging` | Directory created | ⬜ | |
| 9. Check logs | `pm2 logs --lines 50` | No errors | ⬜ | |

### Phase 4: Nginx & SSL

| Step | Command | Expected Result | Status | Evidence |
|------|---------|-----------------|---------|-----------|
| 1. Copy Nginx config | `cp nginx/staging.absenin.com.conf /etc/nginx/sites-available/` | Config copied | ⬜ | |
| 2. Enable site | `ln -s /etc/nginx/sites-available/staging.absenin.com.conf /etc/nginx/sites-enabled/` | Site enabled | ⬜ | |
| 3. Test Nginx config | `nginx -t` | successful | ⬜ | |
| 4. Setup SSL | `./scripts/setup-ssl.sh staging.absenin.com admin@absenin.com` | Certificate obtained | ⬜ | |
| 5. Reload Nginx | `systemctl reload nginx` | Nginx reloaded | ⬜ | |
| 6. Verify SSL | `curl -I https://staging.absenin.com` | 200 OK + SSL | ⬜ | |
| 7. Verify redirect | `curl -I http://staging.absenin.com` | 301 to HTTPS | ⬜ | |

### Phase 5: Directories & Permissions

| Step | Command | Expected Result | Status | Evidence |
|------|---------|-----------------|---------|-----------|
| 1. Create uploads dir | `mkdir -p /var/www/absenin.com/staging/uploads/selfies` | Directory created | ⬜ | |
| 2. Set permissions | `chmod -R 755 /var/www/absenin.com/staging/uploads` | 755 permissions | ⬜ | |
| 3. Set ownership | `chown -R www-data:www-data /var/www/absenin.com/staging/uploads` | www-data owner | ⬜ | |
| 4. Create log dir | `mkdir -p /var/log/absenin.com/staging` | Directory created | ⬜ | |
| 5. Set log permissions | `chmod -R 755 /var/log/absenin.com/staging` | 755 permissions | ⬜ | |
| 6. Test write access | `touch /var/www/absenin.com/staging/uploads/test.txt` | Write successful | ⬜ | |

### Phase 6: Security & Ops

| Step | Command | Expected Result | Status | Evidence |
|------|---------|-----------------|---------|-----------|
| 1. Copy cleanup script | `cp apps/api/scripts/run-cleanup.sh /var/www/absenin.com/staging/apps/api/scripts/` | Script copied | ⬜ | |
| 2. Make executable | `chmod +x /var/www/absenin.com/staging/apps/api/scripts/run-cleanup.sh` | Executable | ⬜ | |
| 3. Add cron job | `(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/absenin.com/staging/apps/api/scripts/run-cleanup.sh") | crontab -` | Job added | ⬜ | |
| 4. Verify cron | `crontab -l` | Job listed | ⬜ | |
| 5. Check CSRF active | `curl -X POST https://staging.absenin.com/api/auth/login -v 2>&1 | grep -i csrf` | CSRF error | ⬜ | |
| 6. Check cookie secure | `curl -I https://staging.absenin.com/api/auth/csrf-token 2>&1 | grep -i set-cookie` | secure flag | ⬜ | |
| 7. Verify rate limits | `ab -n 20 -c 10 https://staging.absenin.com/api/employees` | Some 429s | ⬜ | |

---

## Post-Deployment Smoke Tests

### Test 1: API Health Check

```bash
curl -I https://staging.absenin.com/health
```

**Expected:** `HTTP/2 200`

| Result | Status | Evidence |
|--------|---------|----------|
| 200 OK | ⬜ | |

---

### Test 2: CSRF Token Generation

```bash
curl https://staging.absenin.com/api/auth/csrf-token
```

**Expected:** JSON with `{"success":true,"data":{"csrfToken":"64-char-hex"}}`

| Result | Status | Evidence |
|--------|---------|----------|
| Valid CSRF token (64 chars) | ⬜ | |

---

### Test 3: Login CSRF Protection

```bash
curl -X POST https://staging.absenin.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

**Expected:** 403 Forbidden with "CSRF token missing"

| Result | Status | Evidence |
|--------|---------|----------|
| 403 Forbidden + CSRF error | ⬜ | |

---

### Test 4: Login with CSRF

```bash
TOKEN=$(curl https://staging.absenin.com/api/auth/csrf-token | jq -r '.data.csrfToken')
curl -X POST https://staging.absenin.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: test" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"email":"test@example.com","password":"test"}'
```

**Expected:** 401 Unauthorized (wrong password, but CSRF passed)

| Result | Status | Evidence |
|--------|---------|----------|
| 401 Unauthorized (not 403) | ⬜ | |

---

### Test 5: Protected Endpoint Access

```bash
curl https://staging.absenin.com/api/employees
```

**Expected:** 400/401 (unauthenticated)

| Result | Status | Evidence |
|--------|---------|----------|
| 400/401 Unauthorized | ⬜ | |

---

### Test 6: Location Validate-Presence

```bash
curl -X POST https://staging.absenin.com/api/locations/validate-presence \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","locationId":"test","latitude":-6.2088,"longitude":106.8456}'
```

**Expected:** JSON with distance and isInside fields

| Result | Status | Evidence |
|--------|---------|----------|
| Valid JSON response | ⬜ | |

---

### Test 7: Cookie Security Headers

```bash
curl -I https://staging.absenin.com/api/auth/csrf-token
```

**Expected:**
- `Set-Cookie` header present
- `HttpOnly` flag present
- `Secure` flag present (staging)

| Check | Status | Evidence |
|-------|---------|----------|
| Set-Cookie present | ⬜ | |
| HttpOnly flag | ⬜ | |
| Secure flag | ⬜ | |
| SameSite attribute | ⬜ | |

---

### Test 8: PM2 Process Status

```bash
pm2 status
```

**Expected:**
- absenin-api: online
- absenin-web: online

| Process | Status | Evidence |
|---------|--------|----------|
| absenin-api | ⬜ | |
| absenin-web | ⬜ | |

---

### Test 9: Nginx Status

```bash
systemctl status nginx
nginx -t
```

**Expected:** Active (running), configuration test successful

| Check | Status | Evidence |
|-------|---------|----------|
| Nginx running | ⬜ | |
| Config valid | ⬜ | |

---

### Test 10: Database Connection

```bash
psql -h localhost -U absenin_staging -d absenin_staging -c "SELECT COUNT(*) FROM refresh_tokens;"
```

**Expected:** Number (query executes successfully)

| Result | Status | Evidence |
|--------|---------|----------|
| Query successful | ⬜ | |

---

## Quality Gates

Run these commands after deployment:

| Command | Exit Code | Status | Evidence |
|---------|-----------|--------|----------|
| `pnpm lint` | 0 | ⬜ | |
| `pnpm type-check` | 0 | ⬜ | |
| `pnpm test` | 0 | ⬜ | |
| `pnpm build` | 0 | ⬜ | |

---

## Rollback Procedure

### Quick Rollback (If deployment fails)

```bash
# 1. Stop new deployment
pm2 stop all

# 2. Restore from backup
cd /var/backups/absenin.com/staging
LATEST_BACKUP=$(ls -t | head -1)
cp -r "$LATEST_BACKUP"/* /var/www/absenin.com/staging/

# 3. Start services
cd /var/www/absenin.com/staging
pm2 start ecosystem.config.staging.js

# 4. Verify
pm2 status
nginx -t && systemctl reload nginx
```

### Full Rollback (If database or major issues)

```bash
# 1. Stop services
pm2 stop all
systemctl stop nginx

# 2. Restore database
psql absenin_staging < /var/backups/absenin.com/staging/db-backup-YYYYMMDD.sql

# 3. Restore code
cd /var/backups/absenin.com/staging
LATEST_BACKUP=$(ls -t | head -1)
rm -rf /var/www/absenin.com/staging/*
cp -r "$LATEST_BACKUP"/* /var/www/absenin.com/staging/

# 4. Start services
cd /var/www/absenin.com/staging
pm2 start ecosystem.config.staging.js
systemctl start nginx

# 5. Verify
./scripts/smoke-test.sh
```

### Rollback Verification

After rollback, verify:
- [ ] API is responding on port 3001
- [ ] Web is responding on port 3002
- [ ] Nginx is proxying correctly
- [ ] SSL is working
- [ ] Smoke tests pass
- [ ] Database is accessible

---

## Post-Deployment Monitoring

### First 24 Hours

- [ ] Monitor PM2 logs: `pm2 logs --lines 100`
- [ ] Monitor Nginx logs: `tail -f /var/log/nginx/staging.absenin.com-error.log`
- [ ] Monitor error rates: Check for 500 errors
- [ ] Monitor auth failures: Track login attempts
- [ ] Monitor CSRF rejections: Track CSRF validation errors

### Ongoing Monitoring

- [ ] Set up log rotation for PM2 and Nginx
- [ ] Configure log aggregation (if available)
- [ ] Set up alerts for error rates
- [ ] Monitor disk space for uploads
- [ ] Monitor database size
- [ ] Verify cleanup cron is running

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Deployment Engineer | | | |
| QA / Testing | | | |
| Database Admin | | | |
| Security Review | | | |
| Final Approval | | | |

---

## GO / NO-GO Decision

**Date:** _______________

**Deployment Status:** ⬜ GO  ⬜ NO-GO

**Reason for Decision:**
_________________________________________________________________________

**Approved By:** _______________

---

**Checklist Version:** 1.0
**Last Updated:** 2026-03-22
