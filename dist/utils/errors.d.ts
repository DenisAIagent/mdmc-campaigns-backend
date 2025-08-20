export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
export declare class ValidationError extends AppError {
    constructor(message: string);
}
export declare class BadRequestError extends AppError {
    constructor(message: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export declare class GoogleAdsApiError extends AppError {
    readonly googleError?: unknown;
    constructor(message: string, googleError?: unknown, statusCode?: number);
}
export declare class StripeError extends AppError {
    readonly stripeError?: unknown;
    constructor(message: string, stripeError?: unknown, statusCode?: number);
}
export declare class DatabaseError extends AppError {
    constructor(message: string);
}
export declare class ExternalServiceError extends AppError {
    readonly serviceName: string;
    readonly originalError?: unknown;
    constructor(serviceName: string, message: string, originalError?: unknown, statusCode?: number);
}
export declare const ErrorCodes: {
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly TOKEN_INVALID: "TOKEN_INVALID";
    readonly INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS";
    readonly RESOURCE_ACCESS_DENIED: "RESOURCE_ACCESS_DENIED";
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD";
    readonly CAMPAIGN_ALREADY_RUNNING: "CAMPAIGN_ALREADY_RUNNING";
    readonly CAMPAIGN_NOT_FOUND: "CAMPAIGN_NOT_FOUND";
    readonly PAYMENT_REQUIRED: "PAYMENT_REQUIRED";
    readonly GOOGLE_ADS_NOT_LINKED: "GOOGLE_ADS_NOT_LINKED";
    readonly AUDIENCE_CONFLICT: "AUDIENCE_CONFLICT";
    readonly GOOGLE_ADS_API_ERROR: "GOOGLE_ADS_API_ERROR";
    readonly STRIPE_ERROR: "STRIPE_ERROR";
    readonly EMAIL_SERVICE_ERROR: "EMAIL_SERVICE_ERROR";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
    readonly INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR";
};
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
//# sourceMappingURL=errors.d.ts.map