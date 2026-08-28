import Redis from 'ioredis';
import { env, isProd } from '../config/env';

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis = globalForRedis.redis ?? new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });

if (!isProd) globalForRedis.redis = redis;
