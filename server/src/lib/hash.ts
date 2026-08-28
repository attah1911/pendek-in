import { createHash } from 'node:crypto';
import { env } from '../config/env';

// Security: raw IPs are never stored — only a salted SHA-256 digest (see PRD 5, schema.md ClickEvent).
export function hashIp(ip: string): string {
  return createHash('sha256').update(`${ip}${env.IP_HASH_SALT}`).digest('hex');
}
