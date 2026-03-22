import { PrismaClient } from '@prisma/client';
import { Logger } from '../middleware/logger';

// Create a singleton Prisma client
let prisma: PrismaClient | null = null;

export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  return prisma;
};

// Graceful shutdown handler
export const disconnectPrisma = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    Logger.info('Prisma client disconnected');
  }
};

// Middleware to attach Prisma to request (optional)
export const prismaMiddleware = async (req: any, res: any, next: any) => {
  req.prisma = getPrisma();
  next();
};

// Health check for database
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    Logger.error('Database health check failed', error);
    return false;
  }
};
