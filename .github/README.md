# GitHub Actions Workflows

This directory contains CI/CD workflows for the Absenin project.

---

## Workflows

### 1. CI Workflow (`ci.yml`)

**Trigger:** Pull requests and pushes to main branch

**Jobs:**

#### Lint
- Runs ESLint on all TypeScript files
- Checks code quality and formatting
- Exit code 0 on success

#### Type Check
- Runs TypeScript compiler in no-emit mode
- Validates all type definitions
- Generates Prisma client before checking

#### Build
- Builds all packages in the monorepo
- Validates production builds
- Ensures no build-time errors

#### WhatsApp Functional Tests
- Runs simulated functional tests for WhatsApp integration
- Tests 13 scenarios (webhook, commands, security, idempotency)
- Continues on error (non-blocking for CI)

#### Security Scan
- Runs `npm audit` for vulnerability scanning
- Checks for outdated dependencies
- Non-blocking (continues on error)

#### Prisma Schema Validation
- Validates Prisma schema syntax
- Checks schema formatting
- Fails if schema needs formatting

---

### 2. Deploy Staging Workflow (`deploy-staging.yml`)

**Trigger:** Push to main branch or manual dispatch

**Jobs:**

#### Quality Gate
- Runs on ubuntu-latest
- Steps:
  1. Checkout code
  2. Setup pnpm and Node.js 22
  3. Install dependencies (frozen-lockfile)
  4. Generate Prisma client
  5. Run lint (exit on fail)
  6. Run type-check (exit on fail)
  7. Run WhatsApp functional tests (continue on error)
  8. Build all packages (exit on fail)

#### Deploy
- Needs: quality-gate
- Runs on ubuntu-latest
- Environment: staging
- Steps:
  1. Setup SSH key from secrets
  2. Connect to staging VPS via SSH
  3. Git fetch and reset to origin/main
  4. Install dependencies
  5. Generate Prisma client
  6. Build all packages
  7. Run `npx prisma migrate deploy` (CRITICAL)
  8. Restart PM2 processes (absenin-api, absenin-web)
  9. Save PM2 process list
  10. Reload nginx

**Note:** The `restart_service.sh` script also runs migrations before restarting the service, ensuring consistency whether deploying via CI/CD or manually.

#### Health Check
- Needs: deploy
- Runs on ubuntu-latest
- Steps:
  1. Wait 30 seconds for services to start
  2. Check API health endpoint
  3. Check WhatsApp health endpoint
  4. Check database connectivity via status endpoint
  5. Verify webhook endpoints are accessible

---

## Required GitHub Secrets

### Staging Deployment Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `STAGING_SSH_KEY` | SSH private key for staging VPS | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `STAGING_HOST` | Staging VPS hostname/IP | `staging.absenin.com` or `192.168.1.100` |
| `STAGING_PORT` | SSH port for staging VPS | `22` (default) |
| `STAGING_USER` | SSH user for staging VPS | `deploy` or `ubuntu` |
| `STAGING_APP_DIR` | Application directory on staging VPS | `/var/www/absenin.com` |

### Adding Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each required secret from the table above

---

## Environment Protection Rules

The staging deployment uses GitHub Environment Protection:

- **Name:** `staging`
- **URL:** `https://staging.absenin.com`
- **Required Reviewers:** None (auto-deploy on main push)
- **Deployment Branches:** `main` only

---

## Manual Restart

For manual restarts on the staging VPS, use the `restart_service.sh` script:

```bash
# Copy script to staging
scp restart_service.sh user@staging-vps:/home/user/

# SSH into staging and run restart
ssh user@staging-vps
cd /var/www/absenin.com
sudo ./restart_service.sh
```

**The script automatically:**
1. Runs `npx prisma migrate deploy` (database migrations)
2. Detects and restarts via systemd or PM2
3. Saves PM2 process list
4. Reloads nginx (if systemd available)

**Documentation:** See `RESTART_SERVICE_GUIDE.md` for full details.

---

## Quality Gate Guarantees

The quality gate ensures that:

1. **Code Quality:** All lint rules pass (0 errors, 0 warnings)
2. **Type Safety:** All TypeScript types compile successfully
3. **Build Success:** All packages build without errors
4. **Database Schema:** Prisma schema is valid and properly formatted
5. **WhatsApp Integration:** Functional tests pass (non-blocking)

**Any failure in blocking steps (lint, type-check, build) prevents deployment.**

---

## Health Check Verification

After deployment, the workflow automatically verifies:

1. **API Health:** `/api/health` returns 200 OK
2. **WhatsApp Health:** `/api/whatsapp/health` returns 200 OK
3. **Database:** `/api/whatsapp/status` returns 200 OK
4. **Webhooks:** Webhook endpoints accept GET/POST requests

**Any health check failure is reported but does not rollback.**

---

## Manual Deployment

To manually trigger staging deployment:

1. Go to Actions tab in GitHub
2. Select "Deploy Staging" workflow
3. Click "Run workflow" → "Run workflow"
4. Select branch (default: main)
5. Click "Run workflow"

---

## Monitoring

- **Workflow Runs:** Actions tab in repository
- **Staging Environment:** https://staging.absenin.com
- **Health Endpoints:**
  - API: https://staging.absenin.com/api/health
  - WhatsApp: https://staging.absenin.com/api/whatsapp/health
  - Status: https://staging.absenin.com/api/whatsapp/status

---

## Troubleshooting

### Issue 1: Quality Gate Fails

**Symptom:** Deployment blocked due to lint/type-check/build failure

**Solution:**
1. Check workflow logs for specific error
2. Fix issues locally
3. Run `pnpm lint`, `pnpm type-check`, `pnpm build` to verify
4. Push fixes to trigger new deployment

### Issue 2: Deploy Fails (SSH)

**Symptom:** "Permission denied" or "Connection refused"

**Solution:**
1. Verify `STAGING_SSH_KEY` secret is correct
2. Verify `STAGING_HOST` and `STAGING_PORT` are correct
3. Verify SSH user has permissions to deploy
4. Test SSH connection manually: `ssh -p $PORT $USER@$HOST`

### Issue 3: Migrate Deploy Fails

**Symptom:** `prisma migrate deploy` fails

**Solution:**
1. Check migration status: `npx prisma migrate status`
2. Verify database connection in `.env` on staging
3. Ensure migrations are pushed to main branch
4. Run `npx prisma migrate deploy` manually on staging

### Issue 4: Health Check Fails

**Symptom:** Health endpoint returns error after deployment

**Solution:**
1. Check application logs: `pm2 logs absenin-api`
2. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify services are running: `pm2 status`
4. Manually test endpoints with curl

---

## Best Practices

### For Developers

1. **Run quality gate locally before pushing:**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm build
   pnpm --filter @absenin/api test:functional
   ```

2. **Test migrations locally:**
   ```bash
   npx prisma migrate dev
   ```

3. **Never skip migrations in CI/CD:**
   - Always use `prisma migrate deploy` in production/staging
   - Never use `prisma migrate dev` in CI/CD

4. **Keep secrets secure:**
   - Never commit secrets to repository
   - Rotate SSH keys regularly
   - Use GitHub secrets for all sensitive data

### For Maintainers

1. **Monitor workflow runs:**
   - Check Actions tab regularly
   - Set up notifications for failed deployments

2. **Review failed jobs:**
   - Analyze logs for root cause
   - Create issues for recurring failures

3. **Update documentation:**
   - Keep workflow documentation current
   - Document new environment variables or secrets

4. **Test workflows locally:**
   - Use `act` to run GitHub Actions locally: `act push`

---

## Future Enhancements

- [ ] Add production deployment workflow
- [ ] Add Slack/email notifications for deployments
- [ ] Add automated rollback on health check failure
- [ ] Add deployment dashboard with deployment history
- [ ] Add performance regression tests
- [ ] Add end-to-end tests with real webhooks

---

**Last Updated:** 2026-03-23
**Status:** ✅ Active
