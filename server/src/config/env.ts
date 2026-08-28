import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  IP_HASH_SALT: z.string().min(8),
  // 'strict' works when the client and API are same-site (localhost, or app.x.com + api.x.com).
  // Cross-domain deploys (Vercel client + Railway API) need 'none' so the auth cookie is sent.
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),
  CLIENT_ORIGIN: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${missing}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
