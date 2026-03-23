import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    // Get user
    const user = await prisma.user.findFirst({
      where: { email: 'admin@demonusantara.co.id' }
    });

    if (!user) {
      console.log('User not found!');
      return;
    }

    console.log('User found:', user.email);
    console.log('Password hash:', user.password_hash.substring(0, 40));
    console.log('Active:', user.is_active);

    // Test password comparison with bcrypt
    const password = 'Demo123!Absenin';
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log('\nPassword comparison with bcrypt.compare():', isValid);

    // Test with bcryptjs
    const bcryptjs = require('bcryptjs');
    const isValid2 = bcryptjs.compareSync(password, user.password_hash);
    console.log('Password comparison with bcryptjs.compareSync():', isValid2);

    // Test hash prefix
    console.log('\nHash prefix:', user.password_hash.substring(0, 4));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
