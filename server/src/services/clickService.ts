import type { Request } from 'express';
import type { DeviceType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashIp } from '../lib/hash';

const BOT_PATTERN = /bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python-requests|axios|headless/i;
const MOBILE_PATTERN = /android|iphone|ipad|ipod|mobile|windows phone|webos|blackberry/i;

export function deviceFromUserAgent(userAgent: string | undefined): DeviceType {
  if (!userAgent) return 'UNKNOWN';
  if (BOT_PATTERN.test(userAgent)) return 'BOT';
  if (MOBILE_PATTERN.test(userAgent)) return 'MOBILE';
  return 'DESKTOP';
}

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

// Fire-and-forget from the redirect route — never awaited, never blocks the redirect.
export async function record(shortUrlId: string, req: Request): Promise<void> {
  const userAgent = req.headers['user-agent'];
  await prisma.clickEvent.create({
    data: {
      shortUrlId,
      ipHash: hashIp(clientIp(req)),
      userAgent: userAgent ?? null,
      referrer: req.headers.referer ?? null,
      deviceType: deviceFromUserAgent(userAgent),
    },
    select: { id: true },
  });
}
