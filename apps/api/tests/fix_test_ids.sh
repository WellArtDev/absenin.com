#!/bin/bash
# Add unique ID generation to all tests
sed -i 's/messageId: \`test_[A-Za-z0-9]*_[0-9]\{8\}/messageId: `test_\${Date.now()}_${RANDOM_ID}`' apps/api/tests/whatsapp_functional_tests.ts
