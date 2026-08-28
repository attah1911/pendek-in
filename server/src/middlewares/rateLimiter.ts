import type { Request, RequestHandler } from 'express';
import { redis } from '../lib/redis';
import { hashIp } from '../lib/hash';

interface RateLimiterConfig {
  max: number;
  windowSeconds: number;
  keyFn: (req: Request) => string;
}

export function createRateLimiter({ max, windowSeconds, keyFn }: RateLimiterConfig): RequestHandler {
  return async (req, res, next) => {
    try {
      const key = keyFn(req);
      const count = await redis.incr(key);
      // EXPIRE ... NX sets the TTL only when the key has none — survives a crash between INCR and EXPIRE.
      await redis.expire(key, windowSeconds, 'NX');

      if (count > max) {
        res.status(429).json({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' });
        return;
      }
    } catch (err) {
      // ponytail: fail-open — a Redis blip must not 500 the route. Limits lapse only during an outage.
      console.error('rate limiter unavailable, allowing request', err);
    }
    next();
  };
}

const ipKey = (req: Request): string => hashIp(req.ip ?? req.socket.remoteAddress ?? 'unknown');

// ponytail: rolling 24h window, not a calendar-day reset (schema.md's "end of day") — avoids a timezone call.
const DAY_SECONDS = 86400;

export const shortenGuestLimiter = createRateLimiter({
  max: 5,
  windowSeconds: DAY_SECONDS,
  keyFn: (req) => `rl:shorten:ip:${ipKey(req)}`,
});

export const shortenUserLimiter = createRateLimiter({
  max: 50,
  windowSeconds: DAY_SECONDS,
  keyFn: (req) => `rl:shorten:user:${req.user?.id ?? 'anon'}`,
});

export const authLimiter = createRateLimiter({
  max: 10,
  windowSeconds: 15 * 60,
  keyFn: (req) => `rl:auth:${ipKey(req)}`,
});

export const redirectLimiter = createRateLimiter({
  max: 200,
  windowSeconds: 60,
  keyFn: (req) => `rl:redirect:${ipKey(req)}`,
});
