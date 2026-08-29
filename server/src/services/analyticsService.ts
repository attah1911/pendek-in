import type { DeviceType, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

const DAY_MS = 86_400_000;
const TREND_DAYS = 30;

export type TrendRange = 'week' | 'month' | 'year';
const RANGE_DAYS: Record<TrendRange, number> = { week: 7, month: 30, year: 365 };

interface TrendPoint {
  date: string;
  count: number;
}

// ponytail: buckets by UTC calendar day, not the viewer's local day. Fine for MVP analytics.
export function bucketClicksByDay(timestamps: Date[], days = TREND_DAYS, now: Date = new Date()): TrendPoint[] {
  const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

  const counts = new Map<string, number>();
  for (const t of timestamps) {
    const key = dayKey(t);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const out: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(now.getTime() - i * DAY_MS));
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

export async function getClickTrend(shortUrlId: string, range: TrendRange): Promise<TrendPoint[]> {
  const days = RANGE_DAYS[range];
  const since = new Date(Date.now() - days * DAY_MS);
  const rows = await prisma.clickEvent.findMany({
    where: { shortUrlId, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  return bucketClicksByDay(
    rows.map((r) => r.createdAt),
    days,
  );
}

export async function getTopReferrers(shortUrlId: string): Promise<Array<{ referrer: string; count: number }>> {
  const groups = await prisma.clickEvent.groupBy({
    by: ['referrer'],
    where: { shortUrlId },
    _count: { _all: true },
  });
  return groups
    .map((g) => ({ referrer: g.referrer ?? 'Direct', count: g._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export async function getDeviceBreakdown(shortUrlId: string): Promise<Array<{ deviceType: DeviceType; count: number }>> {
  const groups = await prisma.clickEvent.groupBy({
    by: ['deviceType'],
    where: { shortUrlId },
    _count: { _all: true },
  });
  return groups.map((g) => ({ deviceType: g.deviceType, count: g._count._all }));
}

export async function getAggregate(userId: string): Promise<{
  totalUrls: number;
  totalClicks: number;
  bestUrl: { shortCode: string; originalUrl: string; clicks: number } | null;
}> {
  // ponytail: loads the user's URLs to sum clicks in one round trip. Swap to count() queries if a user ever has thousands.
  const urls = await prisma.shortUrl.findMany({
    where: { userId },
    select: { shortCode: true, originalUrl: true, _count: { select: { clicks: true } } },
  });

  const totalClicks = urls.reduce((sum, u) => sum + u._count.clicks, 0);
  const best = urls.length ? urls.reduce((a, b) => (b._count.clicks > a._count.clicks ? b : a)) : null;

  return {
    totalUrls: urls.length,
    totalClicks,
    bestUrl:
      best && best._count.clicks > 0
        ? { shortCode: best.shortCode, originalUrl: best.originalUrl, clicks: best._count.clicks }
        : null,
  };
}

export async function getUrlAnalytics(
  shortCode: string,
  requester: { id: string; role: Role },
  trendRange: TrendRange,
): Promise<{
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  trend: TrendPoint[];
  referrers: Array<{ referrer: string; count: number }>;
  devices: Array<{ deviceType: DeviceType; count: number }>;
}> {
  const url = await prisma.shortUrl.findUnique({
    where: { shortCode },
    select: { id: true, shortCode: true, originalUrl: true, userId: true },
  });
  if (!url) throw new AppError(404, 'NOT_FOUND', 'Link not found');
  if (url.userId !== requester.id && requester.role !== 'ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this link');
  }

  const [trend, referrers, devices] = await Promise.all([
    getClickTrend(url.id, trendRange),
    getTopReferrers(url.id),
    getDeviceBreakdown(url.id),
  ]);

  return {
    shortCode: url.shortCode,
    originalUrl: url.originalUrl,
    totalClicks: devices.reduce((sum, d) => sum + d.count, 0),
    trend,
    referrers,
    devices,
  };
}
