const bcrypt = require('bcryptjs');

// Test with the hash in database
const dbHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhNj/L4sCFA/8E6iPv9zTw';
const password = 'Demo123!Absenin';

console.log('Testing with DB hash ($2b$):');
console.log('Result:', bcrypt.compareSync(password, dbHash));

// Test with generated hash
const genHash = '$2a$12$2KLHPvpNWjkvPgrxG9pA2.tZ78NvIV4iFQdRyPWc5894LXxuLq5lW';
console.log('\nTesting with generated hash ($2a$):');
console.log('Result:', bcrypt.compareSync(password, genHash));

// Generate new hash with rounds=10
const newHash = bcrypt.hashSync(password, 10);
console.log('\nNew hash with rounds=10:', newHash);
console.log('Compare:', bcrypt.compareSync(password, newHash));
