import { customAlphabet } from 'nanoid';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { AppError } from '../lib/errors';
import { isNotFound, isUniqueViolation } from '../lib/prismaErrors';
import * as blacklistService from './blacklistService';

const CACHE_TTL_SECONDS = 86400;
const CODE_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const generateCode = customAlphabet(CODE_ALPHABET, 6);

const urlSelect = {
  id: true,
  shortCode: true,
  originalUrl: true,
  expiresAt: true,
  active: true,
  createdAt: true,
} as const;

interface CreateInput {
  originalUrl: string;
  alias?: string;
  expiresAt?: string;
  userId?: string;
}

export interface ShortUrlResult {
  id: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: Date | null;
  active: boolean;
  createdAt: Date;
}

const cacheKey = (shortCode: string): string => `url:${shortCode}`;

function cacheTtl(expiresAt: Date | null): number {
  if (!expiresAt) return CACHE_TTL_SECONDS;
  const untilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  return Math.max(1, Math.min(CACHE_TTL_SECONDS, untilExpiry));
}

async function writeCache(entry: {
  id: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: Date | null;
}): Promise<void> {
  await redis.set(
    cacheKey(entry.shortCode),
    JSON.stringify({ id: entry.id, url: entry.originalUrl }),
    'EX',
    cacheTtl(entry.expiresAt),
  );
}

export async function create(input: CreateInput): Promise<ShortUrlResult> {
  // Security rule: blacklist check cannot be skipped — it lives here, not in the route.
  if (await blacklistService.check(input.originalUrl)) {
    throw new AppError(422, 'BLACKLISTED_DOMAIN', 'This domain is not allowed');
  }

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  const data = { originalUrl: input.originalUrl, expiresAt, userId: input.userId ?? null };

  if (input.alias) {
    try {
      const created = await prisma.shortUrl.create({ data: { ...data, shortCode: input.alias }, select: urlSelect });
      await writeCache(created);
      return created;
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppError(409, 'ALIAS_TAKEN', 'This alias is already in use');
      throw err;
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const created = await prisma.shortUrl.create({ data: { ...data, shortCode: generateCode() }, select: urlSelect });
      await writeCache(created);
      return created;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new AppError(500, 'CODE_GENERATION_FAILED', 'Could not generate a unique short code');
}

export async function getByShortCode(shortCode: string): Promise<{ id: string; originalUrl: string }> {
  const cached = await redis.get(cacheKey(shortCode));
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { id?: string; url?: string };
      if (parsed.id && parsed.url) return { id: parsed.id, originalUrl: parsed.url };
    } catch {
      // corrupt cache entry — fall through to the database
    }
  }

  const record = await prisma.shortUrl.findUnique({
    where: { shortCode },
    select: { id: true, originalUrl: true, active: true, expiresAt: true },
  });

  if (!record) throw new AppError(404, 'NOT_FOUND', 'Link not found');
  if (!record.active) throw new AppError(410, 'LINK_INACTIVE', 'This link has been deactivated');
  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
    throw new AppError(410, 'LINK_EXPIRED', 'This link has expired');
  }

  await writeCache({ id: record.id, shortCode, originalUrl: record.originalUrl, expiresAt: record.expiresAt });
  return { id: record.id, originalUrl: record.originalUrl };
}

export async function listByUser(userId: string): Promise<Array<ShortUrlResult & { clickCount: number }>> {
  const rows = await prisma.shortUrl.findMany({
    where: { userId },
    select: { ...urlSelect, _count: { select: { clicks: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(({ _count, ...url }) => ({ ...url, clickCount: _count.clicks }));
}

export async function deleteById(id: string, userId: string): Promise<void> {
  const record = await prisma.shortUrl.findUnique({ where: { id }, select: { userId: true, shortCode: true } });
  if (!record || record.userId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Link not found');
  }
  await prisma.shortUrl.delete({ where: { id } });
  await redis.del(cacheKey(record.shortCode));
}

// Admin deactivate/reactivate: flip active + keep the redirect cache in sync.
export async function setActive(id: string, active: boolean): Promise<void> {
  let url;
  try {
    url = await prisma.shortUrl.update({
      where: { id },
      data: { active },
      select: { id: true, shortCode: true, originalUrl: true, expiresAt: true },
    });
  } catch (err) {
    if (isNotFound(err)) throw new AppError(404, 'NOT_FOUND', 'Link not found');
    throw err;
  }

  if (active) await writeCache(url);
  else await redis.del(cacheKey(url.shortCode));
}
