import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { isNotFound, isUniqueViolation } from '../lib/prismaErrors';
import * as urlService from './urlService';

export async function listUsers(): Promise<
  Array<{ id: string; email: string; role: Role; banned: boolean; createdAt: Date; urlCount: number }>
> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      banned: true,
      createdAt: true,
      _count: { select: { shortUrls: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return users.map(({ _count, ...user }) => ({ ...user, urlCount: _count.shortUrls }));
}

export async function listUrls(): Promise<
  Array<{
    id: string;
    shortCode: string;
    originalUrl: string;
    active: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    ownerEmail: string | null;
    clickCount: number;
  }>
> {
  const urls = await prisma.shortUrl.findMany({
    select: {
      id: true,
      shortCode: true,
      originalUrl: true,
      active: true,
      expiresAt: true,
      createdAt: true,
      user: { select: { email: true } },
      _count: { select: { clicks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return urls.map(({ user, _count, ...url }) => ({
    ...url,
    ownerEmail: user?.email ?? null,
    clickCount: _count.clicks,
  }));
}

export const deactivateUrl = (id: string): Promise<void> => urlService.setActive(id, false);
export const reactivateUrl = (id: string): Promise<void> => urlService.setActive(id, true);

export async function banUser(id: string): Promise<void> {
  try {
    await prisma.user.update({ where: { id }, data: { banned: true }, select: { id: true } });
  } catch (err) {
    if (isNotFound(err)) throw new AppError(404, 'NOT_FOUND', 'User not found');
    throw err;
  }
}

export async function addToBlacklist(domain: string, reason?: string): Promise<{ id: string; domain: string }> {
  try {
    return await prisma.blacklist.create({
      data: { domain, reason: reason ?? null },
      select: { id: true, domain: true },
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, 'ALREADY_BLACKLISTED', 'This domain is already blacklisted');
    throw err;
  }
}

export async function getGlobalStats(): Promise<{
  totalUsers: number;
  totalUrls: number;
  totalClicks: number;
  newUsersToday: number;
}> {
  // ponytail: "today" = server-local midnight. Good enough for an admin overview.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalUsers, totalUrls, totalClicks, newUsersToday] = await Promise.all([
    prisma.user.count(),
    prisma.shortUrl.count(),
    prisma.clickEvent.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
  ]);

  return { totalUsers, totalUrls, totalClicks, newUsersToday };
}
