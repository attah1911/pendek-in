import { prisma } from '../lib/prisma';

// example.com blacklisted → also blocks evil.example.com. Stops at the last two labels (never matches a bare TLD).
export function domainCandidates(hostname: string): string[] {
  const labels = hostname.toLowerCase().split('.');
  if (labels.length < 2) return [hostname.toLowerCase()];
  const candidates: string[] = [];
  for (let i = 0; i <= labels.length - 2; i++) {
    candidates.push(labels.slice(i).join('.'));
  }
  return candidates;
}

export async function check(url: string): Promise<boolean> {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }

  const hit = await prisma.blacklist.findFirst({
    where: { domain: { in: domainCandidates(hostname) } },
    select: { id: true },
  });
  return hit !== null;
}
