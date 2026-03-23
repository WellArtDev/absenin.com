const bcrypt = require('bcryptjs');

// Try common passwords against the hash
const dbHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhNj/L4sCFA/8E6iPv9zTw';
const passwords = [
  'Demo123!Absenin',
  'Password123!',
  'Admin123!',
  'demo123',
  'admin123',
  'password',
  'Password1!',
  'Demo@123'
];

console.log('Testing passwords against DB hash...\n');
for (const pwd of passwords) {
  const result = bcrypt.compareSync(pwd, dbHash);
  console.log(`${pwd}: ${result ? '✓ MATCH' : '✗ fail'}`);
}
