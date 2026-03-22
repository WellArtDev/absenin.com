# Authentication Migration Plan
## Absenin.com - Cookie-Based Authentication Rollout

**Document Version:** 1.0
**Last Updated:** 2026-03-22 09:30 GMT+7
**Target Date:** 2026-04-01 (Production Rollout)
**Deprecation Date:** 2026-06-01 (Legacy Token Mode)

---

## Executive Summary

This document outlines the migration from localStorage-based JWT tokens to secure, httpOnly cookie-based authentication with refresh token rotation and CSRF protection.

### Key Changes
- **Before**: JWT access tokens stored in localStorage (XSS-vulnerable)
- **After**: JWT access tokens in httpOnly cookies + refresh tokens in database

---

## Phase 1: Database Migration (REQUIRED BEFORE DEPLOYMENT)

### Prerequisites
- Database access with migration permissions
- Backup of production database
- Maintenance window: 5 minutes

### Migration Steps

```bash
# 1. Navigate to API directory
cd apps/api

# 2. Run migration
npx prisma migrate deploy

# 3. Verify RefreshToken table exists
psql $DATABASE_URL -c "\d refresh_tokens"

# 4. Check indexes
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'refresh_tokens';"
```

### Expected Schema
```sql
CREATE TABLE refresh_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);
```

### Rollback Plan
```sql
-- If migration fails, drop the table
DROP TABLE IF EXISTS refresh_tokens CASCADE;

-- Revert Prisma migration
npx prisma migrate resolve --rolled-back [migration_name]
```

---

## Phase 2: Staging Deployment

### Pre-Deployment Checklist
- [ ] Database migration completed on staging
- [ ] Environment variables set (JWT_SECRET, CSRF_SECRET)
- [ ] CORS configuration includes `credentials: true`
- [ ] Frontend `.env` has NEXT_PUBLIC_API_URL pointing to staging

### Deployment Steps
```bash
# 1. Deploy API to staging
pnpm build --filter @absenin/api
# [Use your deployment process]

# 2. Deploy Web to staging
pnpm build --filter @absenin/web
# [Use your deployment process]

# 3. Verify health endpoint
curl https://staging-api.absenin.com/health
```

### Smoke Tests (Staging)
```bash
# 1. Test login
curl -X POST https://staging-api.absenin.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# 2. Verify cookies are set
grep "accessToken" cookies.txt
grep "refreshToken" cookies.txt
grep "csrf-token" cookies.txt

# 3. Test protected endpoint
curl https://staging-api.absenin.com/api/auth/me \
  -b cookies.txt

# 4. Test refresh
curl -X POST https://staging-api.absenin.com/api/auth/refresh \
  -b cookies.txt -c new_cookies.txt

# 5. Test logout
curl -X POST https://staging-api.absenin.com/api/auth/logout \
  -b new_cookies.txt
```

---

## Phase 3: Production Rollout

### Rollout Strategy: Blue-Green Deployment

#### Step 1: Database Migration (Production)
```bash
# Run during low-traffic window (e.g., 02:00 AM)
npx prisma migrate deploy --preview-feature
```

#### Step 2: Deploy API Backend
```bash
# Deploy to production
# New version will support both cookie and header auth
kubectl apply -f k8s/api-deployment.yaml
# OR
# [Your deployment process]
```

#### Step 3: Deploy Web Frontend
```bash
# Deploy to production
kubectl apply -f k8s/web-deployment.yaml
# OR
# [Your deployment process]
```

#### Step 4: Monitor
- Watch error logs for authentication failures
- Monitor RefreshToken table growth
- Check for unexpected 401 errors

---

## Phase 4: Backward Compatibility Window

### During Transition (2026-04-01 to 2026-06-01)

Both authentication methods are supported:

#### Method 1: Legacy Authorization Header (Deprecated)
```javascript
// Old way - still works until deprecation date
headers: {
  'Authorization': 'Bearer <access_token>'
}
```

#### Method 2: Cookie-Based Session (New Standard)
```javascript
// New way - automatic with credentials: 'include'
fetch('/api/auth/me', {
  credentials: 'include'
})
```

### Migration Code (Frontend)
```typescript
// lib/api.ts already handles both methods
// No code changes needed in existing components
// New login flow automatically uses cookies
```

### User Experience
- **Existing users**: Continue using header auth until they re-login
- **New logins**: Automatically get cookie-based session
- **No forced logout**: Users migrate organically

---

## Phase 5: Deprecation & Cleanup (2026-06-01)

### Actions Required
1. Remove Authorization header fallback from `requireAuth` middleware
2. Remove `getTokenFromHeader` function from authController.ts
3. Update API documentation to remove header auth references
4. Monitor for any remaining legacy token usage

### Code to Remove
```typescript
// In authController.ts - DELETE THIS
const getTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// In requireAuth - CHANGE THIS
const token = getTokenFromCookie(req) || getTokenFromHeader(req);
// TO THIS
const token = getTokenFromCookie(req);
```

---

## Security Configuration

### Cookie Policy by Environment

| Environment | httpOnly | secure | sameSite | domain     | maxAge (access) | maxAge (refresh) |
|-------------|----------|--------|----------|------------|-----------------|------------------|
| Development | true     | false  | lax      | localhost  | 15 minutes     | 7 days           |
| Staging     | true     | true   | lax      | .absenin.com | 15 minutes     | 7 days           |
| Production  | true     | true   | lax      | .absenin.com | 15 minutes     | 7 days           |

**Notes:**
- `secure: false` in development allows testing over HTTP (localhost)
- `sameSite: 'lax'` allows top-level navigations with cookies (login redirects)
- `httpOnly: true` prevents XSS attacks from accessing tokens
- `domain: .absenin.com` allows sharing cookies across subdomains

### CSRF Protection

**Endpoints requiring CSRF validation:**
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/employees (create)
- PATCH /api/employees/:id (update)
- DELETE /api/employees/:id (delete)
- POST /api/attendance/* (check-in/out)
- POST /api/roles (create)
- PATCH /api/roles/:id (update)
- DELETE /api/roles/:id (delete)
- POST /api/locations (create)
- PATCH /api/locations/:id (update)
- DELETE /api/locations/:id (delete)

**CSRF token flow:**
1. Client requests CSRF token: `GET /api/auth/csrf-token`
2. Server sets `csrf-token` cookie and returns token in response
3. Client includes token in `X-CSRF-Token` header for state-changing requests
4. Server validates token against cookie value

---

## Monitoring & Alerting

### Key Metrics to Monitor
1. **Authentication Success Rate**: Should be >99%
2. **Token Refresh Rate**: Spikes may indicate access token expiry issues
3. **RefreshToken Table Size**: Should not grow unbounded (cleanup job needed)
4. **CSRF Validation Failures**: Spikes may indicate attack attempts

### Alerts to Configure
```
- Alert: Auth success rate < 95% for 5 minutes
- Alert: RefreshToken table > 1M rows
- Alert: CSRF validation failure rate > 10%
- Alert: Logout failure rate > 5%
```

### Cleanup Job (Recommended)
```sql
-- Run daily to clean up expired/revoked tokens
DELETE FROM refresh_tokens
WHERE expires_at < NOW()
   OR revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days';
```

---

## Rollback Plan

### Immediate Rollback (< 1 hour)
1. Revert API code to previous version (header auth only)
2. RefreshToken table remains (harmless)
3. Frontend continues using Authorization header

### Full Rollback (> 1 hour)
1. Drop RefreshToken table: `DROP TABLE refresh_tokens CASCADE;`
2. Revert Prisma schema
3. Revert all code changes
4. Clear all cookies: `res.clearCookie('accessToken')`, etc.

---

## Testing Checklist

### Unit Tests
- [x] Token generation (access + refresh)
- [x] Token validation and expiration
- [x] Refresh token rotation
- [x] CSRF token generation

### Integration Tests
- [x] Login flow sets cookies
- [x] Protected endpoint works with cookie session
- [x] Expired access token triggers refresh
- [x] Refresh token rotation works
- [x] Logout revokes tokens
- [x] CSRF validation enforced

### Manual Tests
- [ ] Test in development environment
- [ ] Test in staging environment
- [ ] Test with multiple browsers (Chrome, Firefox, Safari)
- [ ] Test with private browsing mode
- [ ] Test with cookie blocking scenarios

---

## Support & Troubleshooting

### Common Issues

**Issue: Users getting logged out frequently**
- Cause: Access token expiry too short (15 minutes)
- Solution: Client should automatically call refresh endpoint

**Issue: CSRF token errors**
- Cause: Missing X-CSRF-Token header
- Solution: Ensure lib/api.ts includes CSRF token in requests

**Issue: Cookies not being set**
- Cause: Domain mismatch or third-party cookie blocking
- Solution: Verify cookie domain configuration and browser settings

**Issue: Refresh token invalid after deployment**
- Cause: RefreshToken table not created or JWT_SECRET changed
- Solution: Verify migration completed and JWT_SECRET is consistent

---

## Contact Information

**Technical Lead:** [Your Name]
**DevOps Lead:** [DevOps Lead Name]
**Security Review:** [Security Lead Name]

---

## Appendix: Environment Variables

### Required for Production
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=15m

# CSRF Configuration
CSRF_SECRET=your-csrf-secret-min-32-chars

# Database
DATABASE_URL=postgresql://user:pass@host:5432/absenin

# Environment
NODE_ENV=production
```

### Optional
```bash
# Override defaults if needed
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-22 | 1.0 | Initial migration plan created |
| [Future] | 1.1 | Updates based on staging feedback |
| [Future] | 2.0 | Post-deployment improvements |
