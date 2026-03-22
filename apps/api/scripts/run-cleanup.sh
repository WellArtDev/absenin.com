#!/bin/bash

/**
 * Run Refresh Token Cleanup Job
 *
 * This script runs the cleanup SQL and logs the results.
 *
 * Usage: ./run-cleanup.sh
 * Schedule: Add to crontab to run daily
 *
 * Crontab entry:
 *   0 2 * * * * /path/to/run-cleanup.sh >> /var/log/absenin/cleanup.log 2>&1
 */

set -e

# Configuration
DB_NAME="absenin"
LOG_DIR="/var/log/absenin"
LOG_FILE="$LOG_DIR/refresh-token-cleanup-$(date +%Y%m%d).log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Absenin Refresh Token Cleanup ===${NC}"
echo "Started at: $(date)"
echo ""

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR" 2>/dev/null || {
    echo -e "${RED}Error: Cannot create log directory: $LOG_DIR${NC}"
    exit 1
}

# Run cleanup SQL
echo -e "${YELLOW}Running cleanup job...${NC}"

SQL_FILE="$SCRIPT_DIR/cleanup-refresh-tokens.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}Error: Cleanup SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

# Run psql with output capture
OUTPUT=$(psql -U postgres -d "$DB_NAME" -f "$SQL_FILE" 2>&1)
EXIT_CODE=$?

# Output results
echo "$OUTPUT" | tee "$LOG_FILE"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Cleanup completed successfully${NC}"
else
    echo -e "${RED}✗ Cleanup failed with exit code: $EXIT_CODE${NC}"
fi

echo ""
echo "Log saved to: $LOG_FILE"
echo "Completed at: $(date)"

# Extract and display summary
echo ""
echo -e "${YELLOW}=== Cleanup Summary ===${NC}"
echo "$OUTPUT" | grep -E "(metric|value)" | column -t -s $'\t'

# Optional: Send alert if cleanup fails
# Uncomment and configure alerting
# if [ $EXIT_CODE -ne 0 ]; then
#   # Send email, Slack, or other notification
#   echo "Cleanup failed" | mail -s "Absenin Token Cleanup Alert" admin@absenin.com
# fi

exit $EXIT_CODE
