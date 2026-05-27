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
