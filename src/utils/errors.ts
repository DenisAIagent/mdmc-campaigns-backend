export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
  }
}

export class GoogleAdsApiError extends AppError {
  public readonly googleError?: unknown;

  constructor(message: string, googleError?: unknown, statusCode: number = 502) {
    super(message, statusCode);
    this.googleError = googleError;
  }
}

export class StripeError extends AppError {
  public readonly stripeError?: unknown;

  constructor(message: string, stripeError?: unknown, statusCode: number = 502) {
    super(message, statusCode);
    this.stripeError = stripeError;
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500);
  }
}

export class ExternalServiceError extends AppError {
  public readonly serviceName: string;
  public readonly originalError?: unknown;

  constructor(serviceName: string, message: string, originalError?: unknown, statusCode: number = 502) {
    super(message, statusCode);
    this.serviceName = serviceName;
    this.originalError = originalError;
  }
}

// Error codes for client-side handling
export const ErrorCodes = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // Authorization
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',
  
  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Business Logic
  CAMPAIGN_ALREADY_RUNNING: 'CAMPAIGN_ALREADY_RUNNING',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  GOOGLE_ADS_NOT_LINKED: 'GOOGLE_ADS_NOT_LINKED',
  AUDIENCE_CONFLICT: 'AUDIENCE_CONFLICT',
  
  // External Services
  GOOGLE_ADS_API_ERROR: 'GOOGLE_ADS_API_ERROR',
  STRIPE_ERROR: 'STRIPE_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  
  // System
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];