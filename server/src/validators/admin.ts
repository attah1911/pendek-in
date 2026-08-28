import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().min(1),
});

const DOMAIN_RE = /^([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/i;

export const addBlacklistSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(DOMAIN_RE, 'Must be a bare domain, e.g. phishing.example.com'),
  reason: z.string().trim().min(1).max(200).optional(),
});
