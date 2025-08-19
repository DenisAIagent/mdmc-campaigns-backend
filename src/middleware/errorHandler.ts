import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { env } from '@/config/env';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
  timestamp: string;
  path: string;
  requestId?: string;
}

// Generate unique request ID for tracking
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Add request ID to all requests
export const addRequestId = (req: Request, res: Response, next: NextFunction): void => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || generateRequestId();
  res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
  next();
};

// Handle Prisma errors
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const target = error.meta?.target as string[] | undefined;
      const field = target ? target[0] : 'field';
      return new AppError(`Duplicate value for ${field}`, 409);
    
    case 'P2014':
      // Relation violation
      return new AppError('Invalid relation reference', 400);
    
    case 'P2003':
      // Foreign key constraint violation
      return new AppError('Related record not found', 400);
    
    case 'P2025':
      // Record not found
      return new AppError('Record not found', 404);
    
    default:
      logger.error('Unhandled Prisma error:', { code: error.code, message: error.message });
      return new AppError('Database operation failed', 500);
  }
};

// Handle Zod validation errors
const handleZodError = (error: ZodError): AppError => {
  const errorMessage = error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ');
  return new AppError(`Validation failed: ${errorMessage}`, 400);
};

// Main error handler
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;
  
  let appError: AppError;

  // Handle known error types
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(error);
  } else if (error instanceof ZodError) {
    appError = handleZodError(error);
  } else if (error instanceof SyntaxError && 'body' in error) {
    // JSON parsing error
    appError = new AppError('Invalid JSON format', 400);
  } else {
    // Unknown error
    appError = new AppError(
      env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      500,
      false
    );
  }

  // Log error
  const logLevel = appError.statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error:', {
    requestId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode: appError.statusCode,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.method !== 'GET' ? req.body : undefined,
      user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
    },
  });

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: getErrorCode(appError),
    message: appError.message,
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId,
  };

  // Add debug information in development
  if (env.NODE_ENV === 'development') {
    errorResponse.details = {
      stack: error.stack,
      name: error.name,
    };
  }

  // Send error response
  res.status(appError.statusCode).json(errorResponse);
};

// Map errors to error codes
const getErrorCode = (error: AppError): string => {
  switch (error.statusCode) {
    case 400:
      return ErrorCodes.VALIDATION_FAILED;
    case 401:
      return ErrorCodes.INVALID_CREDENTIALS;
    case 403:
      return ErrorCodes.INSUFFICIENT_PERMISSIONS;
    case 404:
      return ErrorCodes.CAMPAIGN_NOT_FOUND;
    case 409:
      return ErrorCodes.AUDIENCE_CONFLICT;
    case 429:
      return ErrorCodes.RATE_LIMIT_EXCEEDED;
    case 500:
    default:
      return ErrorCodes.INTERNAL_SERVER_ERROR;
  }
};

// Handle 404 errors for undefined routes
export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId: req.headers['x-request-id'] as string,
  };

  res.status(404).json(errorResponse);
};

// Handle uncaught exceptions and unhandled rejections
export const setupGlobalErrorHandlers = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};