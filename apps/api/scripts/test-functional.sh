#!/bin/bash

# WhatsApp Functional Tests Script
# Usage: ./test-functional.sh

set -e errexit pipefail

echo "========================================"
echo "WhatsApp Functional Tests"
echo "========================================"

cd "$(dirname "$0")/.."

# Generate Prisma client
echo "📦 Generating Prisma client..."
pnpm db:generate

# Run functional tests
echo "🧪 Running WhatsApp functional tests..."
npx ts-node tests/whatsapp_functional_tests.ts

echo ""
echo "========================================"
echo "✅ All tests completed"
echo "========================================"
