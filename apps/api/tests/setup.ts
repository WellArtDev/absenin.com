/**
 * Jest Test Setup
 *
 * Configures test environment, mocks, and global utilities
 */

import { PrismaClient } from '@prisma/client';

// Mock Prisma Client for tests
const _mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  refreshToken: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  $disconnect: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.CSRF_SECRET = 'test-csrf-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/absenin_test';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test cleanup
afterAll(async () => {
  // Cleanup any remaining connections
  const prisma = new PrismaClient();
  await prisma.$disconnect();
});
