/**
 * Cleanup Job for Refresh Tokens
 *
 * This SQL script cleans up expired and revoked refresh tokens
 * to prevent the refresh_tokens table from growing unbounded.
 *
 * Usage:
 *   psql -U postgres -d absenin -f cleanup-refresh-tokens.sql
 *
 * Schedule:
 *   Add to crontab: 0 2 * * * * psql -U postgres -d absenin -f /path/to/cleanup-refresh-tokens.sql
 *
 *   This runs daily at 2:00 AM
 */

-- Delete expired refresh tokens
-- These tokens can no longer be used for authentication
DELETE FROM refresh_tokens
WHERE expires_at < NOW()
   AND revoked_at IS NULL;

-- Delete revoked refresh tokens older than 30 days
-- These are tokens that were already used in logout
-- We keep them for 30 days for audit/logging purposes
DELETE FROM refresh_tokens
WHERE revoked_at IS NOT NULL
  AND revoked_at < NOW() - INTERVAL '30 days';

-- Log cleanup results (optional, for monitoring)
-- Uncomment if you want to log cleanup operations
/*
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM refresh_tokens
  WHERE expires_at < NOW()
     AND revoked_at IS NULL
  RETURNING 1 INTO deleted_count;

  RAISE NOTICE 'Deleted % expired refresh tokens', deleted_count;
COMMIT;
END $$;
*/

-- Output summary after cleanup
-- This shows how many tokens remain in the table
SELECT
  'Total refresh tokens' AS metric,
  COUNT(*) AS value
FROM refresh_tokens
UNION ALL
SELECT
  'Active refresh tokens' AS metric,
  COUNT(*) AS value
FROM refresh_tokens
WHERE revoked_at IS NULL
  AND expires_at > NOW()
UNION ALL
SELECT
  'Revoked refresh tokens' AS metric,
  COUNT(*) AS value
FROM refresh_tokens
WHERE revoked_at IS NOT NULL
UNION ALL
SELECT
  'Expired refresh tokens' AS metric,
  COUNT(*) AS value
FROM refresh_tokens
WHERE expires_at < NOW()
ORDER BY metric;

-- Optional: Create a cleanup log table
-- Uncomment to track cleanup operations
/*
CREATE TABLE IF NOT EXISTS refresh_token_cleanup_log (
  cleanup_id SERIAL PRIMARY KEY,
  cleanup_at TIMESTAMP DEFAULT NOW(),
  expired_tokens_deleted INTEGER DEFAULT 0,
  revoked_tokens_deleted INTEGER DEFAULT 0,
  total_tokens_before INTEGER DEFAULT 0,
  total_tokens_after INTEGER DEFAULT 0
);

-- Log this cleanup
INSERT INTO refresh_token_cleanup_log (
  expired_tokens_deleted,
  revoked_tokens_deleted,
  total_tokens_before,
  total_tokens_after
)
SELECT
  (SELECT COUNT(*) FROM refresh_tokens WHERE expires_at < NOW() AND revoked_at IS NULL) AS expired_deleted,
  (SELECT COUNT(*) FROM refresh_tokens WHERE revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days') AS revoked_deleted,
  (SELECT COUNT(*) FROM refresh_tokens) AS before_count,
  (SELECT COUNT(*) FROM refresh_tokens WHERE revoked_at IS NULL AND expires_at >= NOW()) AS after_count;
*/

-- Optimization: Analyze table after cleanup
-- Updates query planner statistics
ANALYZE refresh_tokens;
