import { Request, Response, NextFunction } from 'express';
import { Logger } from './logger';
import { ErrorType } from '@absenin/config';

// Custom error class
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public type: ErrorType = ErrorType.INTERNAL,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;

    // Ensure the name is correctly set
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Error handler middleware
export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  let error = err;
  let statusCode = 500;
  let type = ErrorType.INTERNAL;
  let message = 'Internal server error';

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    type = err.type;
    message = err.message;
    error = err;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    type = ErrorType.AUTHENTICATION;
    message = 'Invalid or expired token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    type = ErrorType.AUTHENTICATION;
    message = 'Token expired';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    type = ErrorType.AUTHORIZATION;
    message = 'Unauthorized';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    type = ErrorType.VALIDATION;
    message = 'Validation error';
    error = {
      type: ErrorType.VALIDATION,
      message: err.message,
      details: err.errors
    };
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    type = ErrorType.INTERNAL;
    message = 'Service unavailable';
  }

  // Log the error
  if (statusCode >= 500) {
    Logger.error(`Unhandled error: ${err.message}`, err);
  } else {
    Logger.warn(`Handled error: ${err.message}`, err);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      type: type,
      message: message,
      details: error.details || err.details
    }
  });
};

// Error handling utilities
export const handleValidationError = (err: any, res: Response) => {
  if (err.name === 'ValidationError') {
    Logger.warn('Validation error', err);
    return res.status(400).json({
      success: false,
      error: {
        type: ErrorType.VALIDATION,
        message: 'Validation error',
        details: err.errors
      }
    });
  }
};

export const handleAuthError = (err: any, res: Response) => {
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    Logger.warn('Authentication error', err);
    return res.status(401).json({
      success: false,
      error: {
        type: ErrorType.AUTHENTICATION,
        message: 'Invalid or expired token'
      }
    });
  }
};

export const handleNotFoundError = (req: Request, res: Response) => {
  Logger.warn('Endpoint not found', { path: req.path });
  res.status(404).json({
    success: false,
    error: {
      type: ErrorType.NOT_FOUND,
      message: 'Endpoint not found'
    }
  });
};

export const handleDatabaseError = (err: any, res: Response) => {
  if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
    Logger.error('Database connection error', err);
    return res.status(503).json({
      success: false,
      error: {
        type: ErrorType.INTERNAL,
        message: 'Database connection error'
      }
    });
  }
};

export const handlePermissionError = (req: Request, res: Response) => {
  Logger.warn('Permission denied', { path: req.path, userId: req.user?.userId });
  res.status(403).json({
    success: false,
    error: {
      type: ErrorType.AUTHORIZATION,
      message: 'Insufficient permissions'
    }
  });
};
