import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { Logger } from './logger';
import { JwtPayload } from '@absenin/config';
import jwt from 'jsonwebtoken';

// Get JWT configuration from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenant?: { tenant_id: string; name: string; slug: string };
    }
  }
}

// Authentication middleware
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if already authenticated
    if (req.user) {
      return next();
    }

    // Get token from cookies/headers (cookies prioritized for new auth system)
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      Logger.warn('Authentication: No token provided');
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION',
          message: 'Authentication required'
        }
      });
    }

    // Verify token using JWT
    const prisma = new PrismaClient();
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

      if (!decoded || !decoded.userId || !decoded.email || !decoded.tenantId) {
        Logger.warn('Authentication: Invalid token payload');
        return res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION',
            message: 'Invalid token'
          }
        });
      }

      // Check if user exists and is active
      const user = await prisma.user.findUnique({
        where: { user_id: decoded.userId },
        select: {
          user_id: true,
          tenant_id: true,
          email: true,
          is_active: true,
          employee_id: true
        }
      });

      if (!user || !user.is_active) {
        Logger.warn('Authentication: User not found or inactive', { userId: decoded.userId });
        return res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION',
            message: 'User not found or inactive'
          }
        });
      }

      // Check tenant match if tenant is already in request
      if (req.tenant && req.tenant.tenant_id !== user.tenant_id) {
        Logger.warn('Authentication: User tenant mismatch', { userId: user.user_id, tenantId: user.tenant_id });
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION',
            message: 'User does not belong to the specified tenant'
          }
        });
      }

      // Attach user to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        tenantId: decoded.tenantId,
        permissions: decoded.permissions || [],
        roles: decoded.roles || [],
        platformAdmin: decoded.platformAdmin || false,
        exp: decoded.exp || 0,
        iat: decoded.iat || 0
      };

      return next();

    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        Logger.warn('Authentication: Token expired');
        return res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION',
            message: 'Token expired'
          }
        });
      }

      if (error.name === 'JsonWebTokenError') {
        Logger.warn('Authentication: Invalid token', { error: error.message });
        return res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION',
            message: 'Invalid token'
          }
        });
      }

      Logger.error('Authentication error', error);
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION',
          message: 'Invalid or expired token'
        }
      });
    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    Logger.error('Authentication middleware error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Authentication middleware error'
      }
    });
  }
};

// Platform admin middleware
export const platformAdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is platform admin
    if (!req.user || !req.user.platformAdmin) {
      Logger.warn('Platform admin: Insufficient permissions', { userId: req.user?.userId });
      return res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION',
          message: 'Insufficient permissions'
        }
      });
    }

    return next();

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

// Permission middleware
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
    // Find the permission
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

// Export auth middleware
export default authMiddleware;
