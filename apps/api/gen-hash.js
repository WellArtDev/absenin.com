const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('Demo123!Absenin', 12);
console.log(hash);
