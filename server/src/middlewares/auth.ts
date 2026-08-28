import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

interface TokenPayload {
  id: string;
  role: Role;
}

export function readTokenPayload(decoded: unknown): TokenPayload | null {
  if (typeof decoded !== 'object' || decoded === null) return null;
  const record = decoded as Record<string, unknown>;
  if (typeof record.id !== 'string') return null;
  if (record.role === 'USER' || record.role === 'ADMIN') {
    return { id: record.id, role: record.role };
  }
  return null;
}

function verifyToken(token: string | undefined): TokenPayload | null {
  if (!token) return null;
  try {
    return readTokenPayload(jwt.verify(token, env.JWT_SECRET));
  } catch {
    return null;
  }
}

// Security: a ban must take effect immediately, not whenever the 7-day JWT expires — so every
// authenticated request re-checks it (one indexed PK lookup). Unknown user id → treat as banned.
async function isBanned(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { banned: true } });
  return user?.banned ?? true;
}

const unauthenticated = { error: 'Authentication required', code: 'UNAUTHENTICATED' };

export const requireAuth: RequestHandler = async (req, res, next) => {
  const payload = verifyToken(req.cookies?.token);
  if (!payload) {
    res.status(401).json(unauthenticated);
    return;
  }
  if (await isBanned(payload.id)) {
    res.status(403).json({ error: 'This account has been suspended', code: 'ACCOUNT_BANNED' });
    return;
  }

  req.user = payload;
  next();
};

// Populates req.user when a valid, non-banned token is present, but never rejects — for routes open
// to guests and users alike. A banned user is silently treated as a guest.
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const payload = verifyToken(req.cookies?.token);
  if (payload && !(await isBanned(payload.id))) {
    req.user = payload;
  }
  next();
};
