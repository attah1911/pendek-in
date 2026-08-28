import type { Request } from 'express';
import { env } from '../config/env';

// SHORT_URL_BASE when set, otherwise the incoming request's origin (behind a proxy that's the API host).
export function shortUrlBase(req: Request): string {
  return env.SHORT_URL_BASE ?? `${req.protocol}://${req.get('host')}`;
}

export const shortUrlFor = (req: Request, shortCode: string): string => `${shortUrlBase(req)}/${shortCode}`;
