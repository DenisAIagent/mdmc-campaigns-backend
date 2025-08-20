"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.validateYouTubeUrl = exports.extractYouTubeVideoId = exports.fileSchemas = exports.alertSchemas = exports.billingSchemas = exports.campaignSchemas = exports.googleSchemas = exports.authSchemas = exports.commonSchemas = exports.validate = void 0;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const validate = (schema) => {
    return (req, res, next) => {
        try {
            if (schema.body) {
                req.body = schema.body.parse(req.body);
            }
            if (schema.query) {
                req.query = schema.query.parse(req.query);
            }
            if (schema.params) {
                req.params = schema.params.parse(req.params);
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errorMessage = error.errors
                    .map(err => `${err.path.join('.')}: ${err.message}`)
                    .join(', ');
                next(new errors_1.ValidationError(errorMessage));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validate = validate;
// Common validation schemas
exports.commonSchemas = {
    id: zod_1.z.string().cuid(),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
    pagination: zod_1.z.object({
        page: zod_1.z.string().transform(Number).pipe(zod_1.z.number().int().min(1)).default('1'),
        limit: zod_1.z.string().transform(Number).pipe(zod_1.z.number().int().min(1).max(100)).default('20'),
    }),
    googleCustomerId: zod_1.z.string().regex(/^[0-9]{10}$/, 'Must be 10 digits'),
    youtubeUrl: zod_1.z.string().url().refine((url) => {
        const patterns = [
            /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/,
            /^https:\/\/youtube\.com\/embed\//,
        ];
        return patterns.some(pattern => pattern.test(url));
    }, 'Must be a valid YouTube URL'),
    countries: zod_1.z.array(zod_1.z.string().length(2).toUpperCase()),
    dateRange: zod_1.z.object({
        from: zod_1.z.string().transform((str) => new Date(str)).pipe(zod_1.z.date()),
        to: zod_1.z.string().transform((str) => new Date(str)).pipe(zod_1.z.date()),
    }).refine((data) => data.from <= data.to, 'From date must be before or equal to to date'),
};
// Authentication schemas
exports.authSchemas = {
    signup: zod_1.z.object({
        email: exports.commonSchemas.email,
        password: exports.commonSchemas.password,
        firstName: zod_1.z.string().min(1).max(50),
        lastName: zod_1.z.string().min(1).max(50),
    }),
    login: zod_1.z.object({
        email: exports.commonSchemas.email,
        password: zod_1.z.string(),
    }),
    refreshToken: zod_1.z.object({
        refreshToken: zod_1.z.string(),
    }),
};
// Google integration schemas
exports.googleSchemas = {
    linkRequest: zod_1.z.object({
        customerId: exports.commonSchemas.googleCustomerId,
    }),
    oauthCallback: zod_1.z.object({
        code: zod_1.z.string(),
        state: zod_1.z.string().optional(),
    }),
};
// Campaign schemas
exports.campaignSchemas = {
    create: zod_1.z.object({
        clipUrl: exports.commonSchemas.youtubeUrl,
        clipTitle: zod_1.z.string().min(1).max(100),
        artistsList: zod_1.z.string().max(1000),
        countries: exports.commonSchemas.countries.min(1),
    }),
    update: zod_1.z.object({
        clipTitle: zod_1.z.string().min(1).max(100).optional(),
        artistsList: zod_1.z.string().max(1000).optional(),
        countries: exports.commonSchemas.countries.min(1).optional(),
    }),
    kpisQuery: zod_1.z.object({
        from: zod_1.z.string().optional(),
        to: zod_1.z.string().optional(),
        granularity: zod_1.z.enum(['daily', 'weekly', 'monthly']).default('daily'),
    }),
};
// Billing schemas
exports.billingSchemas = {
    checkoutSession: zod_1.z.object({
        campaignIds: zod_1.z.array(exports.commonSchemas.id).min(1),
        successUrl: zod_1.z.string().url().optional(),
        cancelUrl: zod_1.z.string().url().optional(),
    }),
};
// Alert schemas
exports.alertSchemas = {
    list: zod_1.z.object({
        isRead: zod_1.z.string().transform((val) => val === 'true').optional(),
        severity: zod_1.z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
    }),
};
// File upload validation
exports.fileSchemas = {
    upload: zod_1.z.object({
        file: zod_1.z.object({
            mimetype: zod_1.z.string(),
            size: zod_1.z.number().max(10 * 1024 * 1024), // 10MB
            originalname: zod_1.z.string(),
        }),
    }),
    csvUpload: zod_1.z.object({
        file: zod_1.z.object({
            mimetype: zod_1.z.enum(['text/csv', 'application/vnd.ms-excel']),
            size: zod_1.z.number().max(5 * 1024 * 1024), // 5MB
            originalname: zod_1.z.string().regex(/\.(csv|xlsx)$/i),
        }),
    }),
};
// Helper function to extract YouTube video ID
const extractYouTubeVideoId = (url) => {
    const patterns = [
        /youtube\.com\/watch\?v=([^&]+)/,
        /youtu\.be\/([^?]+)/,
        /youtube\.com\/embed\/([^?]+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
};
exports.extractYouTubeVideoId = extractYouTubeVideoId;
// Middleware to validate YouTube URL and extract video ID
const validateYouTubeUrl = (req, res, next) => {
    try {
        if (req.body.clipUrl) {
            const videoId = (0, exports.extractYouTubeVideoId)(req.body.clipUrl);
            if (!videoId) {
                throw new errors_1.ValidationError('Invalid YouTube URL format');
            }
            req.body.youtubeVideoId = videoId;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validateYouTubeUrl = validateYouTubeUrl;
// Helper function for route validation
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            // Merge validated data back to request
            if (validatedData.body)
                req.body = validatedData.body;
            if (validatedData.query)
                req.query = validatedData.query;
            if (validatedData.params)
                req.params = validatedData.params;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errorMessage = error.errors
                    .map(err => `${err.path.join('.')}: ${err.message}`)
                    .join(', ');
                next(new errors_1.ValidationError(errorMessage));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map