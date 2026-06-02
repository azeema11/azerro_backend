import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
});

redisClient.on('connect', () => {
    console.log('Successfully connected to Redis');
});

export default redisClient;

/**
 * Resilient wrappers that catch Redis errors and treat them as cache misses
 * so callers can fall through to DB without try-catch boilerplate.
 */

export async function safeGet(key: string): Promise<string | null> {
    try {
        return await redisClient.get(key);
    } catch (err) {
        console.error(`Redis GET failed for key "${key}":`, err);
        return null;
    }
}

export async function safeSetex(key: string, ttl: number, value: string | number): Promise<void> {
    try {
        await redisClient.setex(key, ttl, value);
    } catch (err) {
        console.error(`Redis SETEX failed for key "${key}":`, err);
    }
}

export async function safeMget(keys: string[]): Promise<(string | null)[]> {
    try {
        return await redisClient.mget(keys);
    } catch (err) {
        console.error(`Redis MGET failed for ${keys.length} keys:`, err);
        return new Array(keys.length).fill(null);
    }
}

/**
 * Execute a batch of SETEX commands via a non-atomic pipeline.
 * Commands may interleave with other Redis operations and partial
 * successes are allowed — appropriate for independent cache writes.
 * On failure, logs the error and silently continues.
 */
export async function safeBatchSetex(
    entries: { key: string; ttl: number; value: string | number }[]
): Promise<void> {
    try {
        const pipeline = redisClient.pipeline();
        for (const { key, ttl, value } of entries) {
            pipeline.setex(key, ttl, value);
        }
        await pipeline.exec();
    } catch (err) {
        console.error(`Redis batch SETEX failed for ${entries.length} entries:`, err);
    }
}

export async function safeDel(...keys: string[]): Promise<void> {
    try {
        await redisClient.del(...keys);
    } catch (err) {
        console.error(`Redis DEL failed for ${keys.length} keys:`, err);
    }
}

export async function safeIncr(key: string): Promise<number | null> {
    try {
        return await redisClient.incr(key);
    } catch (err) {
        console.error(`Redis INCR failed for key "${key}":`, err);
        return null;
    }
}

export async function safeExpire(key: string, ttl: number): Promise<void> {
    try {
        await redisClient.expire(key, ttl);
    } catch (err) {
        console.error(`Redis EXPIRE failed for key "${key}":`, err);
    }
}

export async function safeTtl(key: string): Promise<number> {
    try {
        const ttl = await redisClient.ttl(key);
        return Math.max(0, ttl);
    } catch (err) {
        console.error(`Redis TTL failed for key "${key}":`, err);
        return 0;
    }
}

/**
 * Atomic INCR + conditional EXPIRE via Lua script.
 * Sets the TTL only when the key is first created (count == 1),
 * so a crash between INCR and EXPIRE can never lose the TTL.
 */
export async function safeIncrWithTTL(key: string, ttl: number): Promise<number | null> {
    try {
        const result = await redisClient.eval(
            `local v = redis.call("INCR", KEYS[1])
             if v == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
             return v`,
            1, key, ttl
        );
        return result as number;
    } catch (err) {
        console.error(`Redis INCR+TTL failed for key "${key}":`, err);
        return null;
    }
}

/**
 * Cache-aside helper: returns cached JSON if present, otherwise runs fn(),
 * caches the result as JSON, and returns it.
 */
export async function withCache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const cached = await safeGet(key);
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch {
            await safeDel(key);
        }
    }
    const result = await fn();
    await safeSetex(key, ttl, JSON.stringify(result));
    return result;
}
