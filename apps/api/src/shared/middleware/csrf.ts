import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorHandler';

/**
 * CSRF Protection Middleware
 *
 * Generates and validates CSRF tokens for state-changing operations.
 * Uses double-submit cookie pattern for CSRF protection.
 */

declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

// Generate a random CSRF token
const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRF token options
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 64; // 32 bytes * 2 (hex encoding)

/**
 * CSRF Token Generation Middleware
 *
 * Generates a CSRF token if one doesn't exist and adds it to the request.
 * This should be applied to routes that need CSRF protection.
 */
export const csrfTokenMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get existing CSRF token from cookie
  const existingToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (existingToken && existingToken.length === CSRF_TOKEN_LENGTH) {
    // Use existing token
    req.csrfToken = existingToken;
  } else {
    // Generate new token
    const newToken = generateCSRFToken();
    req.csrfToken = newToken;

    // Set token in httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(CSRF_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  next();
};

/**
 * CSRF Validation Middleware
 *
 * Validates CSRF token for state-changing operations.
 * Should be applied to POST, PATCH, DELETE endpoints.
 */
export const csrfValidationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  // Safe methods don't need CSRF protection
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!cookieToken) {
    throw new AppError('CSRF token missing. Please refresh the page and try again.', 403);
  }

  // Get token from header
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!headerToken) {
    throw new AppError('CSRF token required. Please include X-CSRF-Token header.', 403);
  }

  // Validate token
  if (cookieToken !== headerToken) {
    throw new AppError('Invalid CSRF token. Please refresh the page and try again.', 403);
  }

  // Token is valid
  next();
};

/**
 * Combined CSRF Middleware
 *
 * Generates token if needed and validates for state-changing requests.
 * Use this for routes that need both token generation and validation.
 */
export const csrfMiddleware = [
  csrfTokenMiddleware,
  csrfValidationMiddleware
];

/**
 * CSRF Exclusion Middleware Factory
 *
 * Creates a middleware that applies CSRF protection except for specified paths.
 * Useful for routes that don't need CSRF protection (e.g., webhooks).
 *
 * @param excludedPaths - Array of paths to exclude from CSRF protection
 */
export const csrfWithExclusions = (excludedPaths: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if path is excluded
    const isExcluded = excludedPaths.some(path => {
      if (path.endsWith('*')) {
        // Wildcard match
        const prefix = path.slice(0, -1);
        return req.path.startsWith(prefix);
      }
      return req.path === path;
    });

    if (isExcluded) {
      return next();
    }

    // Apply CSRF validation
    return csrfValidationMiddleware(req, res, next);
  };
};

// Export token generation function for use in routes
export { generateCSRFToken };
