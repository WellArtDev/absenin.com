import { PrismaClient } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Create test user
    const password = 'Test123!';
    const passwordHash = bcryptjs.hashSync(password, 12);

    console.log('Creating test user with password:', password);
    console.log('Password hash:', passwordHash);

    // Test password comparison
    const isValid = bcryptjs.compareSync(password, passwordHash);
    console.log('Password comparison test:', isValid);

    // Insert user
    await prisma.$executeRawUnsafe(`
      INSERT INTO users (user_id, tenant_id, email, password_hash, is_active, created_at, updated_at)
      VALUES ('test-user-001', 'demo-tenant-001', 'test@demonusantara.co.id', '${passwordHash}', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password_hash = '${passwordHash}',
        is_active = true,
        updated_at = NOW()
    `);

    console.log('Test user created successfully');
    console.log('Email: test@demonusantara.co.id');
    console.log('Password: Test123!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
