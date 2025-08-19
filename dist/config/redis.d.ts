import Redis from 'ioredis';
declare class RedisClient {
    private client;
    private isConnected;
    constructor();
    private setupEventHandlers;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isHealthy(): boolean;
    getClient(): Redis;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<boolean>;
    setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>;
    getJson<T>(key: string): Promise<T | null>;
    del(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    incr(key: string): Promise<number | null>;
    expire(key: string, ttlSeconds: number): Promise<boolean>;
    checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
    }>;
}
export declare const redis: RedisClient;
export default redis;
//# sourceMappingURL=redis.d.ts.map