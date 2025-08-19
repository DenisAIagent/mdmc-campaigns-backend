import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { redis } from '@/config/redis';
import { RateLimitError } from '@/utils/errors';

// Create a Redis store for rate limiting
class RedisStore {
  constructor(private prefix: string = 'rl:') {}

  async increment(key: string, windowMs: number): Promise<{ totalHits: number; timeToExpire: number }> {
    const redisKey = `${this.prefix}${key}`;
    const windowSeconds = Math.ceil(windowMs / 1000);
    
    const multi = redis.getClient().multi();
    multi.incr(redisKey);
    multi.expire(redisKey, windowSeconds);
    
    const results = await multi.exec();
    
    if (!results || results.length < 2) {
      throw new Error('Redis multi command failed');
    }
    
    const totalHits = results[0]?.[1] as number || 0;
    const timeToExpire = windowSeconds * 1000;
    
    return { totalHits, timeToExpire };
  }

  async decrement(key: string): Promise<void> {
    const redisKey = `${this.prefix}${key}`;
    await redis.getClient().decr(redisKey);
  }

  async resetKey(key: string): Promise<void> {
    const redisKey = `${this.prefix}${key}`;
    await redis.del(redisKey);
  }
}

// Custom rate limiter using Redis
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skipIf?: (req: Request) => boolean;
  message?: string;
}) => {
  const store = new RedisStore();
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        throw new RateLimitError(
          options.message || `Too many requests, please try again later. Limit: ${options.max} requests per ${options.windowMs / 1000} seconds`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Express rate limiter fallback (if Redis is unavailable)
const createExpressRateLimiter = (options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skipIf?: (req: Request) => boolean;
  message?: string;
}) => {
  return rateLimit({
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
export const globalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  keyGenerator: (req) => req.ip || 'unknown',
  message: 'Too many requests from this IP, please try again later.',
});

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    return `auth:${req.ip}:${email}`;
  },
  message: 'Too many authentication attempts, please try again later.',
});

export const apiRateLimit = createRateLimiter({
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

export const uploadRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 uploads per 10 minutes
  keyGenerator: (req) => `upload:${req.userId || req.ip}`,
  message: 'Too many file uploads, please try again later.',
});

export const webhookRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 webhook calls per minute
  keyGenerator: (req) => `webhook:${req.ip}`,
  message: 'Webhook rate limit exceeded.',
});

// Google Ads API rate limiting
export const googleAdsRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 Google Ads API calls per minute per user
  keyGenerator: (req) => `gads:${req.userId}`,
  skipIf: (req) => !req.userId,
  message: 'Google Ads API rate limit exceeded. Please try again later.',
});

// Stripe API rate limiting
export const stripeRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 Stripe API calls per minute per user
  keyGenerator: (req) => `stripe:${req.userId}`,
  skipIf: (req) => !req.userId,
  message: 'Payment processing rate limit exceeded. Please try again later.',
});

// Email sending rate limiting
export const emailRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 emails per hour per user
  keyGenerator: (req) => `email:${req.userId || req.ip}`,
  message: 'Email sending rate limit exceeded. Please try again later.',
});