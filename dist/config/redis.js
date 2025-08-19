"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
class RedisClient {
    client;
    isConnected = false;
    constructor() {
        this.client = new ioredis_1.default(env_1.env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            enableReadyCheck: true,
            maxLoadingTimeout: 1000,
            lazyConnect: true,
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('connect', () => {
            console.log('✅ Redis connected');
            this.isConnected = true;
        });
        this.client.on('ready', () => {
            console.log('✅ Redis ready');
        });
        this.client.on('error', (error) => {
            console.error('❌ Redis error:', error);
            this.isConnected = false;
        });
        this.client.on('close', () => {
            console.log('🔌 Redis connection closed');
            this.isConnected = false;
        });
        this.client.on('reconnecting', () => {
            console.log('🔄 Redis reconnecting...');
        });
    }
    async connect() {
        try {
            await this.client.connect();
        }
        catch (error) {
            console.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await this.client.quit();
        }
        catch (error) {
            console.error('Error disconnecting from Redis:', error);
        }
    }
    isHealthy() {
        return this.isConnected && this.client.status === 'ready';
    }
    getClient() {
        return this.client;
    }
    // Cache methods
    async get(key) {
        try {
            return await this.client.get(key);
        }
        catch (error) {
            console.error(`Redis GET error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            if (ttlSeconds) {
                await this.client.setex(key, ttlSeconds, value);
            }
            else {
                await this.client.set(key, value);
            }
            return true;
        }
        catch (error) {
            console.error(`Redis SET error for key ${key}:`, error);
            return false;
        }
    }
    async setJson(key, value, ttlSeconds) {
        try {
            const jsonValue = JSON.stringify(value);
            return await this.set(key, jsonValue, ttlSeconds);
        }
        catch (error) {
            console.error(`Redis SET JSON error for key ${key}:`, error);
            return false;
        }
    }
    async getJson(key) {
        try {
            const value = await this.get(key);
            if (!value)
                return null;
            return JSON.parse(value);
        }
        catch (error) {
            console.error(`Redis GET JSON error for key ${key}:`, error);
            return null;
        }
    }
    async del(key) {
        try {
            await this.client.del(key);
            return true;
        }
        catch (error) {
            console.error(`Redis DEL error for key ${key}:`, error);
            return false;
        }
    }
    async exists(key) {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error(`Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }
    async incr(key) {
        try {
            return await this.client.incr(key);
        }
        catch (error) {
            console.error(`Redis INCR error for key ${key}:`, error);
            return null;
        }
    }
    async expire(key, ttlSeconds) {
        try {
            await this.client.expire(key, ttlSeconds);
            return true;
        }
        catch (error) {
            console.error(`Redis EXPIRE error for key ${key}:`, error);
            return false;
        }
    }
    // Rate limiting
    async checkRateLimit(key, limit, windowSeconds) {
        try {
            const current = await this.incr(key);
            if (current === null) {
                return { allowed: false, remaining: 0, resetTime: Date.now() + windowSeconds * 1000 };
            }
            if (current === 1) {
                await this.expire(key, windowSeconds);
            }
            const remaining = Math.max(0, limit - current);
            const allowed = current <= limit;
            const resetTime = Date.now() + windowSeconds * 1000;
            return { allowed, remaining, resetTime };
        }
        catch (error) {
            console.error(`Redis rate limit error for key ${key}:`, error);
            return { allowed: true, remaining: limit, resetTime: Date.now() };
        }
    }
}
// Singleton instance
exports.redis = new RedisClient();
// Graceful shutdown
process.on('beforeExit', async () => {
    await exports.redis.disconnect();
});
process.on('SIGINT', async () => {
    await exports.redis.disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await exports.redis.disconnect();
    process.exit(0);
});
exports.default = exports.redis;
//# sourceMappingURL=redis.js.map