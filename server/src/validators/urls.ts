import { z } from 'zod';

// Aliases that would shadow or be shadowed by real API paths / client routes.
const RESERVED_ALIASES = new Set([
  'auth', 'urls', 'analytics', 'admin', 'health', 'api', 'login', 'register', 'dashboard',
]);

export const createUrlSchema = z.object({
  originalUrl: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), 'Only http and https URLs are allowed'),
  alias: z
    .string()
    .regex(/^[a-zA-Z0-9-]{3,32}$/, 'Alias must be 3-32 chars: letters, numbers, hyphens')
    .refine((a) => !RESERVED_ALIASES.has(a.toLowerCase()), 'This alias is reserved')
    .optional(),
  expiresAt: z
    .string()
    .datetime({ offset: true, message: 'expiresAt must be an ISO 8601 date string' })
    .refine((d) => new Date(d).getTime() > Date.now(), 'expiresAt must be in the future')
    .optional(),
});

export const shortCodeParamSchema = z.object({
  shortCode: z.string().min(3).max(32),
});

export const analyticsQuerySchema = z.object({
  range: z.enum(['week', 'month', 'year']).default('month'),
});

export const urlIdParamSchema = z.object({
  id: z.string().min(1),
});
