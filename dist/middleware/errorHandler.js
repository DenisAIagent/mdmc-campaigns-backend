"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGlobalErrorHandlers = exports.notFoundHandler = exports.errorHandler = exports.addRequestId = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const env_1 = require("../config/env");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
// Generate unique request ID for tracking
const generateRequestId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
// Add request ID to all requests
const addRequestId = (req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || generateRequestId();
    res.setHeader('X-Request-ID', req.headers['x-request-id']);
    next();
};
exports.addRequestId = addRequestId;
// Handle Prisma errors
const handlePrismaError = (error) => {
    switch (error.code) {
        case 'P2002':
            // Unique constraint violation
            const target = error.meta?.target;
            const field = target ? target[0] : 'field';
            return new errors_1.AppError(`Duplicate value for ${field}`, 409);
        case 'P2014':
            // Relation violation
            return new errors_1.AppError('Invalid relation reference', 400);
        case 'P2003':
            // Foreign key constraint violation
            return new errors_1.AppError('Related record not found', 400);
        case 'P2025':
            // Record not found
            return new errors_1.AppError('Record not found', 404);
        default:
            logger_1.logger.error('Unhandled Prisma error:', { code: error.code, message: error.message });
            return new errors_1.AppError('Database operation failed', 500);
    }
};
// Handle Zod validation errors
const handleZodError = (error) => {
    const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
    return new errors_1.AppError(`Validation failed: ${errorMessage}`, 400);
};
// Main error handler
const errorHandler = (error, req, res, next) => {
    const requestId = req.headers['x-request-id'];
    let appError;
    // Handle known error types
    if (error instanceof errors_1.AppError) {
        appError = error;
    }
    else if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        appError = handlePrismaError(error);
    }
    else if (error instanceof zod_1.ZodError) {
        appError = handleZodError(error);
    }
    else if (error instanceof SyntaxError && 'body' in error) {
        // JSON parsing error
        appError = new errors_1.AppError('Invalid JSON format', 400);
    }
    else {
        // Unknown error
        appError = new errors_1.AppError(env_1.env.NODE_ENV === 'production' ? 'Internal server error' : error.message, 500, false);
    }
    // Log error
    const logLevel = appError.statusCode >= 500 ? 'error' : 'warn';
    logger_1.logger[logLevel]('Request error:', {
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
    const errorResponse = {
        error: getErrorCode(appError),
        message: appError.message,
        timestamp: new Date().toISOString(),
        path: req.path,
        requestId,
    };
    // Add debug information in development
    if (env_1.env.NODE_ENV === 'development') {
        errorResponse.details = {
            stack: error.stack,
            name: error.name,
        };
    }
    // Send error response
    res.status(appError.statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// Map errors to error codes
const getErrorCode = (error) => {
    switch (error.statusCode) {
        case 400:
            return errors_1.ErrorCodes.VALIDATION_FAILED;
        case 401:
            return errors_1.ErrorCodes.INVALID_CREDENTIALS;
        case 403:
            return errors_1.ErrorCodes.INSUFFICIENT_PERMISSIONS;
        case 404:
            return errors_1.ErrorCodes.CAMPAIGN_NOT_FOUND;
        case 409:
            return errors_1.ErrorCodes.AUDIENCE_CONFLICT;
        case 429:
            return errors_1.ErrorCodes.RATE_LIMIT_EXCEEDED;
        case 500:
        default:
            return errors_1.ErrorCodes.INTERNAL_SERVER_ERROR;
    }
};
// Handle 404 errors for undefined routes
const notFoundHandler = (req, res) => {
    const errorResponse = {
        error: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
        path: req.path,
        requestId: req.headers['x-request-id'],
    };
    res.status(404).json(errorResponse);
};
exports.notFoundHandler = notFoundHandler;
// Handle uncaught exceptions and unhandled rejections
const setupGlobalErrorHandlers = () => {
    process.on('uncaughtException', (error) => {
        logger_1.logger.error('Uncaught Exception:', error);
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
    process.on('SIGTERM', () => {
        logger_1.logger.info('SIGTERM received, shutting down gracefully');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        logger_1.logger.info('SIGINT received, shutting down gracefully');
        process.exit(0);
    });
};
exports.setupGlobalErrorHandlers = setupGlobalErrorHandlers;
//# sourceMappingURL=errorHandler.js.map