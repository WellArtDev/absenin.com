import { Router, Request, Response } from 'express';
import { getPrisma } from '../../shared/utils/database';
import { Logger } from '../../shared/middleware/logger';
import { AppError } from '../../shared/middleware/errorHandler';
import { csrfValidationMiddleware } from '../../shared/middleware/csrf';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

export const authRouter: Router = Router();

// Get JWT configuration from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Short-lived access token
const _REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'; // Long-lived refresh token
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
const _CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

// Configure cookie parser middleware
authRouter.use(cookieParser());

// Helper function to hash password
const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

// Helper function to verify password
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// Helper function to generate JWT access token
const generateAccessToken = (payload: any): string => {
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    tenantId: payload.tenantId,
    permissions: payload.permissions || [],
    roles: payload.roles || [],
    type: 'access',
    platformAdmin: payload.platformAdmin || false
  };

  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
};

// Helper function to generate refresh token
const generateRefreshToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Helper function to hash refresh token for storage
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Helper function to generate CSRF token
const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
// CSRF token will be generated per-session via csurf middleware
};

// Helper function to parse JWT from cookie
const getTokenFromCookie = (req: Request): string | null => {
  const token = req.cookies?.accessToken;
  return token || null;
};

// Helper function to parse JWT from Authorization header (for backward compatibility during migration)
const getTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// Middleware to check if user is authenticated (for protected routes)
export const requireAuth = (req: Request, _res: Response, next: Function) => {
  try {
    const token = getTokenFromCookie(req) || getTokenFromHeader(req);

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || decoded.type !== 'access') {
      throw new AppError('Invalid or expired token', 401);
    }

    // Attach user info to request
    req.user = decoded;

    // Set tenant from decoded token (full tenant object loaded by tenant middleware if needed)
    req.tenant = { tenant_id: decoded.tenantId } as any;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired', 401);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Authentication failed', 401);
  }
};

// Middleware to check CSRF token for sensitive operations
const _validateCSRF = (req: Request, _res: Response, next: Function) => {
  const csrfToken = req.cookies['csrf-token'] || req.headers['x-csrf-token'];

  if (!csrfToken) {
    throw new AppError('CSRF token missing', 403);
  }

  // Validate CSRF token from request body or header
  const requestToken = req.body?._csrf || req.headers['x-csrf-token'];

  if (!requestToken || requestToken !== csrfToken) {
    throw new AppError('Invalid CSRF token', 403);
  }

  next();
};

// POST /auth/login
authRouter.post('/login', csrfValidationMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, password }: { email: string; password: string } = req.body;

    if (!email || !password) {
      throw new AppError('Email dan password wajib diisi', 400);
    }

    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user || !user.is_active) {
      // Generic error message for security
      throw new AppError('Email atau password salah', 401);
    }

    // Verify password using bcrypt
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      // Generic error message for security
      throw new AppError('Email atau password salah', 401);
    }

    // Generate access token
    const accessToken = generateAccessToken({
      userId: user.user_id,
      email: user.email,
      tenantId: user.tenant_id,
      permissions: user.user_roles.flatMap((ur: any) =>
        ur.role.role_permissions.map((rp: any) => rp.permission.code)
      ),
      roles: user.user_roles.map((ur: any) => ur.role.role_id),
      platformAdmin: false
    });

    // Generate refresh token
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        user_id: user.user_id,
        token_hash: refreshTokenHash,
        user_agent: req.headers['user-agent'] || null,
        ip_address: req.ip || null,
        expires_at: expiresAt
      }
    });

    // Generate CSRF token
    const csrfToken = generateCSRFToken();

    // Set cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: 'lax' as const, // 'lax' for same-site requests, 'strict' for cross-site
      path: '/',
      maxAge: 15 * 60 * 1000 // 15 minutes for access token
    };

    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for refresh token
    };

    // Set access token cookie
    res.cookie('accessToken', accessToken, cookieOptions);

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    // Set CSRF token cookie
    res.cookie('csrf-token', csrfToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    Logger.info('User logged in successfully', { userId: user.user_id, email: user.email });

    // Return user info (no tokens in response body)
    return res.json({
      success: true,
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          tenant_id: user.tenant_id
        },
        csrf: csrfToken
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Login failed', { email: req.body?.email, error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Login error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Terjadi kesalahan saat login'
      }
    });
  }
});

// POST /auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, full_name }: { email: string; password: string; full_name: string } = req.body;

    if (!email || !password || !full_name) {
      throw new AppError('Email, password, and full name are required', 400);
    }

    const prisma = getPrisma();
    const existingUser = await prisma.user.findFirst({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('Email sudah terdaftar', 409);
    }

    // Hash password using bcrypt
    const password_hash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        tenant_id: req.tenant?.tenant_id || '',
        email,
        password_hash,
        is_active: true
      }
    });

    Logger.info('User registered', { userId: user.user_id, email });

    return res.status(201).json({
      success: true,
      data: {
        user: {
          user_id: user.user_id,
          email: user.email
        }
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Registration failed', { email: req.body?.email, error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Registration error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Terjadi kesalahan saat registrasi'
      }
    });
  }
});

// POST /auth/refresh
authRouter.post('/refresh', csrfValidationMiddleware, async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new AppError('Refresh token tidak ditemukan', 401);
    }

    const prisma = getPrisma();

    // Look up refresh token in database
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token_hash: hashToken(refreshToken)
      },
      include: {
        user: {
          include: {
            user_roles: {
              include: {
                role: {
                  include: {
                    role_permissions: {
                      include: {
                        permission: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!storedToken) {
      throw new AppError('Refresh token tidak valid', 401);
    }

    // Check if token is expired
    if (storedToken.revoked_at || storedToken.expires_at < new Date()) {
      throw new AppError('Refresh token sudah kadaluars', 401);
    }

    if (!storedToken.user.is_active) {
      throw new AppError('User tidak aktif', 401);
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: storedToken.user.user_id,
      email: storedToken.user.email,
      tenantId: storedToken.user.tenant_id,
      permissions: storedToken.user.user_roles.flatMap((ur: any) =>
        ur.role.role_permissions.map((rp: any) => rp.permission.code)
      ),
      roles: storedToken.user.user_roles.map((ur: any) => ur.role.role_id),
      platformAdmin: false
    });

    // Generate new refresh token (rotation)
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);

    // Calculate new expiration date
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: {
        token_id: storedToken.token_id
      },
      data: {
        revoked_at: new Date()
      }
    });

    // Create new refresh token record
    await prisma.refreshToken.create({
      data: {
        user_id: storedToken.user.user_id,
        token_hash: newRefreshTokenHash,
        user_agent: req.headers['user-agent'] || null,
        ip_address: req.ip || null,
        expires_at: newExpiresAt
      }
    });

    // Generate new CSRF token
    const csrfToken = generateCSRFToken();

    // Set new cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 15 * 60 * 1000
    };

    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000
    };

    res.cookie('accessToken', newAccessToken, cookieOptions);
    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);
    res.cookie('csrf-token', csrfToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    Logger.info('Token refreshed', { userId: storedToken.user.user_id });

    return res.json({
      success: true,
      data: {
        csrf: csrfToken
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Token refresh failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Token refresh error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Terjadi kesalahan saat refresh token'
      }
    });
  }
});

// POST /auth/logout
authRouter.post('/logout', csrfValidationMiddleware, async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      const prisma = getPrisma();

      // Revoke refresh token in database
      await prisma.refreshToken.updateMany({
        where: {
          token_hash: hashToken(refreshToken)
        },
        data: {
          revoked_at: new Date()
        }
      });

      Logger.info('User logged out, refresh token revoked');
    }

    // Clear all auth cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    res.clearCookie('csrf-token', { path: '/' });

    return res.json({
      success: true,
      message: 'Logout berhasil'
    });

  } catch (error: any) {
    Logger.error('Logout error', error);

    // Clear cookies even if database operation fails
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    res.clearCookie('csrf-token', { path: '/' });

    return res.json({
      success: true,
      message: 'Logout berhasil'
    });
  }
});

// GET /auth/me
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { user_id: req.user.userId },
      select: {
        user_id: true,
        email: true,
        tenant_id: true,
        is_active: true,
        employee_id: true,
        created_at: true,
        employee: {
          select: {
            employee_id: true,
            full_name: true,
            nip: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError('User tidak ditemukan', 404);
    }

    return res.json({
      success: true,
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          tenant_id: user.tenant_id,
          employee: user.employee
        },
        permissions: req.user.permissions || [],
        roles: req.user.roles || []
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get user info failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get user info error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Terjadi kesalahan saat mengambil data user'
      }
    });
  }
});

// GET /auth/csrf-token
authRouter.get('/csrf-token', (_req: Request, res: Response) => {
  const csrfToken = generateCSRFToken();

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('csrf-token', csrfToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return res.json({
    success: true,
    data: {
      csrfToken
    }
  });
});

export default authRouter;
