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
  // An Origin header never has a trailing slash — strip one if it's in the env value, or CORS won't match.
  CLIENT_ORIGIN: z
    .string()
    .url()
    .transform((s) => s.replace(/\/+$/, '')),
  // Origin shown in generated short links (e.g. https://pendek-in-api.onrender.com).
  // Unset → derived from the incoming request, which behind a proxy is the API host.
  SHORT_URL_BASE: z
    .string()
    .url()
    .transform((s) => s.replace(/\/+$/, ''))
    .optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// An empty value (KEY= from a copied .env.example) is treated as unset, so a default or
// .optional() applies instead of failing Zod's .url()/.enum() check on an empty string.
const present = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));
const parsed = envSchema.safeParse(present);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${missing}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
