import Redis from 'ioredis';
import { env } from './env';

class RedisClient {
  private client: Redis;
  private isConnected = false;

  constructor() {
    this.client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxLoadingTimeout: 1000,
      lazyConnect: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
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

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }

  isHealthy(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  getClient(): Redis {
    return this.client;
  }

  // Cache methods
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      return await this.set(key, jsonValue, ttlSeconds);
    } catch (error) {
      console.error(`Redis SET JSON error for key ${key}:`, error);
      return false;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Redis GET JSON error for key ${key}:`, error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async incr(key: string): Promise<number | null> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error);
      return null;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      await this.client.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
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
    } catch (error) {
      console.error(`Redis rate limit error for key ${key}:`, error);
      return { allowed: true, remaining: limit, resetTime: Date.now() };
    }
  }
}

// Singleton instance
export const redis = new RedisClient();

// Graceful shutdown
process.on('beforeExit', async () => {
  await redis.disconnect();
});

process.on('SIGINT', async () => {
  await redis.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redis.disconnect();
  process.exit(0);
});

export default redis;