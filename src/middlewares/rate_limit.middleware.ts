import { Request, Response, NextFunction } from 'express';
import { safeIncrWithTTL } from '../utils/redis';
import { AuthRequest } from './auth.middleware';

/**
 * Generic rate limiter using Redis counters.
 * On Redis failure, allows the request through (fail-open).
 */
export function rateLimit(opts: {
    keyPrefix: string;
    windowSeconds: number;
    maxRequests: number;
    keyFn?: (req: Request) => string;
}) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const identifier = opts.keyFn
            ? opts.keyFn(req)
            : (req as AuthRequest).userId || req.ip || 'unknown';

        const key = `ratelimit:${opts.keyPrefix}:${identifier}`;
        const count = await safeIncrWithTTL(key, opts.windowSeconds);

        if (count === null) {
            return next();
        }

        if (count > opts.maxRequests) {
            return res.status(429).json({
                error: 'Too many requests',
                retryAfterSeconds: opts.windowSeconds,
            });
        }

        next();
    };
}

export const authRateLimit = rateLimit({
    keyPrefix: 'auth',
    windowSeconds: 900,
    maxRequests: 10,
    keyFn: (req) => req.body?.email || req.ip || 'unknown',
});

export const aiRateLimit = rateLimit({
    keyPrefix: 'ai',
    windowSeconds: 86400,
    maxRequests: 50,
});
