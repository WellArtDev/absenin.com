const bcrypt = require('bcryptjs');

// Update user with known working password
const password = 'password';
const hash = bcrypt.hashSync(password, 12);
console.log('Password:', password);
console.log('Hash:', hash);

// Or use default simple password
const pwd = 'demo123';
const hash2 = bcrypt.hashSync(pwd, 12);
console.log('\nPassword:', pwd);
console.log('Hash:', hash2);
