"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = exports.ExternalServiceError = exports.DatabaseError = exports.StripeError = exports.GoogleAdsApiError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ForbiddenError = exports.BadRequestError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}
exports.ValidationError = ValidationError;
class BadRequestError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}
exports.BadRequestError = BadRequestError;
class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403);
    }
}
exports.ForbiddenError = ForbiddenError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429);
    }
}
exports.RateLimitError = RateLimitError;
class GoogleAdsApiError extends AppError {
    googleError;
    constructor(message, googleError, statusCode = 502) {
        super(message, statusCode);
        this.googleError = googleError;
    }
}
exports.GoogleAdsApiError = GoogleAdsApiError;
class StripeError extends AppError {
    stripeError;
    constructor(message, stripeError, statusCode = 502) {
        super(message, statusCode);
        this.stripeError = stripeError;
    }
}
exports.StripeError = StripeError;
class DatabaseError extends AppError {
    constructor(message) {
        super(message, 500);
    }
}
exports.DatabaseError = DatabaseError;
class ExternalServiceError extends AppError {
    serviceName;
    originalError;
    constructor(serviceName, message, originalError, statusCode = 502) {
        super(message, statusCode);
        this.serviceName = serviceName;
        this.originalError = originalError;
    }
}
exports.ExternalServiceError = ExternalServiceError;
// Error codes for client-side handling
exports.ErrorCodes = {
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
};
//# sourceMappingURL=errors.js.map