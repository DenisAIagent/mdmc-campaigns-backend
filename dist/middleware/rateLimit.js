"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailRateLimit = exports.stripeRateLimit = exports.googleAdsRateLimit = exports.webhookRateLimit = exports.uploadRateLimit = exports.apiRateLimit = exports.authRateLimit = exports.globalRateLimit = exports.createRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const redis_1 = require("@/config/redis");
const errors_1 = require("@/utils/errors");
// Create a Redis store for rate limiting
class RedisStore {
    prefix;
    constructor(prefix = 'rl:') {
        this.prefix = prefix;
    }
    async increment(key, windowMs) {
        const redisKey = `${this.prefix}${key}`;
        const windowSeconds = Math.ceil(windowMs / 1000);
        const multi = redis_1.redis.getClient().multi();
        multi.incr(redisKey);
        multi.expire(redisKey, windowSeconds);
        const results = await multi.exec();
        if (!results || results.length < 2) {
            throw new Error('Redis multi command failed');
        }
        const totalHits = results[0]?.[1] || 0;
        const timeToExpire = windowSeconds * 1000;
        return { totalHits, timeToExpire };
    }
    async decrement(key) {
        const redisKey = `${this.prefix}${key}`;
        await redis_1.redis.getClient().decr(redisKey);
    }
    async resetKey(key) {
        const redisKey = `${this.prefix}${key}`;
        await redis_1.redis.del(redisKey);
    }
}
// Custom rate limiter using Redis
const createRateLimiter = (options) => {
    const store = new RedisStore();
    return async (req, res, next) => {
        try {
            // Skip rate limiting if condition is met
            if (options.skipIf && options.skipIf(req)) {
                return next();
            }
            // Generate key for rate limiting
            const key = options.keyGenerator
                ? options.keyGenerator(req)
                : req.ip || 'unknown';
            // Check rate limit
            const { totalHits, timeToExpire } = await store.increment(key, options.windowMs);
            // Set rate limit headers
            res.set({
                'X-RateLimit-Limit': options.max.toString(),
                'X-RateLimit-Remaining': Math.max(0, options.max - totalHits).toString(),
                'X-RateLimit-Reset': new Date(Date.now() + timeToExpire).toISOString(),
            });
            // Check if limit exceeded
            if (totalHits > options.max) {
                throw new errors_1.RateLimitError(options.message || `Too many requests, please try again later. Limit: ${options.max} requests per ${options.windowMs / 1000} seconds`);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.createRateLimiter = createRateLimiter;
// Express rate limiter fallback (if Redis is unavailable)
const createExpressRateLimiter = (options) => {
    return (0, express_rate_limit_1.default)({
        windowMs: options.windowMs,
        max: options.max,
        keyGenerator: options.keyGenerator,
        skip: options.skipIf,
        message: {
            error: 'Too Many Requests',
            message: options.message || 'Too many requests from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};
// Rate limiters for different endpoints
exports.globalRateLimit = (0, exports.createRateLimiter)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    keyGenerator: (req) => req.ip || 'unknown',
    message: 'Too many requests from this IP, please try again later.',
});
exports.authRateLimit = (0, exports.createRateLimiter)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login attempts per 15 minutes
    keyGenerator: (req) => {
        const email = req.body?.email || 'unknown';
        return `auth:${req.ip}:${email}`;
    },
    message: 'Too many authentication attempts, please try again later.',
});
exports.apiRateLimit = (0, exports.createRateLimiter)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // 1000 API calls per hour for authenticated users
    keyGenerator: (req) => {
        if (req.userId) {
            return `api:user:${req.userId}`;
        }
        return `api:ip:${req.ip}`;
    },
    skipIf: (req) => !req.userId, // Only apply to authenticated users
    message: 'API rate limit exceeded. Please try again later.',
});
exports.uploadRateLimit = (0, exports.createRateLimiter)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // 5 uploads per 10 minutes
    keyGenerator: (req) => `upload:${req.userId || req.ip}`,
    message: 'Too many file uploads, please try again later.',
});
exports.webhookRateLimit = (0, exports.createRateLimiter)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 webhook calls per minute
    keyGenerator: (req) => `webhook:${req.ip}`,
    message: 'Webhook rate limit exceeded.',
});
// Google Ads API rate limiting
exports.googleAdsRateLimit = (0, exports.createRateLimiter)({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 Google Ads API calls per minute per user
    keyGenerator: (req) => `gads:${req.userId}`,
    skipIf: (req) => !req.userId,
    message: 'Google Ads API rate limit exceeded. Please try again later.',
});
// Stripe API rate limiting
exports.stripeRateLimit = (0, exports.createRateLimiter)({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 Stripe API calls per minute per user
    keyGenerator: (req) => `stripe:${req.userId}`,
    skipIf: (req) => !req.userId,
    message: 'Payment processing rate limit exceeded. Please try again later.',
});
// Email sending rate limiting
exports.emailRateLimit = (0, exports.createRateLimiter)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 emails per hour per user
    keyGenerator: (req) => `email:${req.userId || req.ip}`,
    message: 'Email sending rate limit exceeded. Please try again later.',
});
//# sourceMappingURL=rateLimit.js.map