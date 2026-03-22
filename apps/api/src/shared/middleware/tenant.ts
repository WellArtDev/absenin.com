import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { Logger } from './logger';
import { JwtPayload } from '@absenin/config';

// Extend Express Request type to include tenant and user
declare global {
  namespace Express {
    interface Request {
      tenant?: { tenant_id: string; name: string; slug: string };
      user?: JwtPayload;
    }
  }
}

// Tenant middleware for multi-tenant isolation
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // For protection, behavior for protected routes layer only
    if (req.headers['x-tenant-id']) {
      const prisma = new PrismaClient();
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { tenant_id: req.headers['x-tenant-id'] as string },
          select: { tenant_id: true, name: true, slug: true }
        });

        if (!tenant) {
          Logger.warn('Tenant not found', { tenantId: req.headers['x-tenant-id'] });
          return res.status(404).json({
            success: false,
            error: {
              type: 'NOT_FOUND',
              message: 'Tenant not found'
            }
          });
        }

        // Verify user belongs to this tenant (for authenticated requests)
        if (req.user && req.user.tenantId !== tenant.tenant_id) {
          Logger.warn('User tenant mismatch', { userId: req.user.userId, tenantId: req.user.tenantId });
          return res.status(403).json({
            success: false,
            error: {
              type: 'AUTHORIZATION',
              message: 'User does not belong to the specified tenant'
            }
          });
        }

        req.tenant = tenant;
        return next();
      } finally {
        await prisma.$disconnect();
      }
    }

    // No tenant header but identity header must still be there and only be taken contextually from token if present
    if (req.user && req.user.tenantId) {
      const prisma = new PrismaClient();
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { tenant_id: req.user.tenantId },
          select: { tenant_id: true, name: true, slug: true }
        });

        if (!tenant) {
          Logger.warn('Tenant not found for user', { userId: req.user.userId, tenantId: req.user.tenantId });
          return res.status(404).json({
            success: false,
            error: {
              type: 'NOT_FOUND',
              message: 'Tenant not found for authenticated user'
            }
          });
        }

        req.tenant = tenant;
        return next();
      } finally {
        await prisma.$disconnect();
      }
    }

    // No tenant information found
    // This will also be reached for non-public routes lacking a token
    Logger.warn('Tenant not specified');
    return res.status(400).json({
      success: false,
      error: {
        type: 'BAD_REQUEST',
        message: 'Tenant not specified. Please provide X-Tenant-Id header.'
      }
    });

  } catch (error) {
    Logger.error('Tenant middleware error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Tenant middleware error'
      }
    });
  }
};

// Get tenant middleware (for endpoints that may or may not have tenant)
export const getTenantMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Check for tenant in subdomain
    const host = req.get('host') || '';
    let tenantSlug = '';

    if (host.includes('.')) {
      const parts = host.split('.');
      if (parts.length >= 2) {
        tenantSlug = parts[0];
      }
    }

    // Check for tenant header
    if (!tenantSlug && req.headers['x-tenant-slug']) {
      tenantSlug = req.headers['x-tenant-slug'] as string;
    }

    if (tenantSlug) {
      const prisma = new PrismaClient();
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { slug: tenantSlug },
          select: { tenant_id: true, name: true, slug: true }
        });

        if (tenant) {
          req.tenant = tenant;
        }
      } finally {
        await prisma.$disconnect();
      }
    }

    return next();

  } catch (error) {
    Logger.error('Get tenant middleware error', error);
    return next(error);
  }
};

// Platform admin middleware
export const platformAdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is platform admin
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      Logger.warn('Platform admin: No token provided');
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION',
          message: 'No token provided'
        }
      });
    }

    // Verify token
    const prisma = new PrismaClient();
    try {
      const decoded = await verifyToken(token);

      if (!decoded || !decoded.platformAdmin) {
        Logger.warn('Platform admin: Insufficient permissions');
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION',
            message: 'Insufficient permissions'
          }
        });
      }

      req.user = decoded;
      return next();

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    Logger.error('Platform admin middleware error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Platform admin middleware error'
      }
    });
  }
};

// Utility function to verify token (mock implementation)
const verifyToken = async (_token: string): Promise<any> => {
  // In a real implementation, this would verify the JWT token
  // For now, we'll mock it for testing purposes
  return {
    userId: 'platform_admin',
    email: 'admin@absenin.com',
    platformAdmin: true,
    exp: Math.floor(Date.now() / 1000) + 3600
  };
};

// Tenant-aware permission middleware
export const permissionMiddleware = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        Logger.warn('Permission check: No user in request');
        return res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION',
            message: 'Authentication required'
          }
        });
      }

      // Check if user has the required permission
      const prisma = new PrismaClient();
      try {
        const hasPermission = await checkUserPermission(req.user.userId, requiredPermission, req.tenant?.tenant_id);

        if (!hasPermission) {
          Logger.warn('Permission denied', { userId: req.user.userId, permission: requiredPermission });
          return res.status(403).json({
            success: false,
            error: {
              type: 'AUTHORIZATION',
              message: 'Insufficient permissions'
            }
          });
        }

        return next();

      } finally {
        await prisma.$disconnect();
      }

    } catch (error) {
      Logger.error('Permission middleware error', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL',
          message: 'Permission middleware error'
        }
      });
    }
  };
};

// Utility function to check user permission
const checkUserPermission = async (userId: string, permissionCode: string, _tenantId?: string): Promise<boolean> => {
  const prisma = new PrismaClient();
  try {
    const permission = await prisma.permission.findUnique({
      where: { code: permissionCode }
    });

    if (!permission) {
      return false;
    }

    // Get user's role IDs
    const userRoles = await prisma.userRole.findMany({
      where: { user_id: userId },
      select: { role_id: true }
    });

    const roleIds = userRoles.map((ur: any) => ur.role_id);

    // Check if any of these roles have the required permission
    const hasPermission = await prisma.rolePermission.count({
      where: {
        permission_id: permission.permission_id,
        role_id: { in: roleIds }
      }
    });

    return hasPermission > 0;

  } finally {
    await prisma.$disconnect();
  }
};

// Export tenant middleware
export default tenantMiddleware;
