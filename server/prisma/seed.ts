import { randomBytes } from 'node:crypto';
import { PrismaClient, type DeviceType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const SAMPLE_CODES = ['demo-launch', 'demo-blog', 'demo-docs'];

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]!;
const fakeIpHash = (): string => randomBytes(16).toString('hex');

const DEVICES: DeviceType[] = ['DESKTOP', 'DESKTOP', 'MOBILE', 'MOBILE', 'BOT'];
const REFERRERS = [null, 'https://news.ycombinator.com/', 'https://twitter.com/', 'https://www.google.com/', 'https://www.reddit.com/'];
const UAS: Record<DeviceType, string> = {
  DESKTOP: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  MOBILE: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  BOT: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
  UNKNOWN: '',
};

function buildClicks(shortUrlId: string, count: number): Array<{
  shortUrlId: string;
  ipHash: string;
  userAgent: string;
  referrer: string | null;
  deviceType: DeviceType;
  createdAt: Date;
}> {
  const now = Date.now();
  return Array.from({ length: count }, () => {
    const device = pick(DEVICES);
    const daysBack = Math.floor(Math.random() * 30);
    return {
      shortUrlId,
      ipHash: fakeIpHash(),
      userAgent: UAS[device],
      referrer: pick(REFERRERS),
      deviceType: device,
      createdAt: new Date(now - daysBack * 86_400_000 - Math.floor(Math.random() * 86_400_000)),
    };
  });
}

async function main(): Promise<void> {
  // Re-runnable: clear the previous sample links (clicks cascade) before recreating them.
  await prisma.shortUrl.deleteMany({ where: { shortCode: { in: SAMPLE_CODES } } });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pendek-in.app' },
    update: { role: 'ADMIN', banned: false },
    create: { email: 'admin@pendek-in.app', password: await bcrypt.hash('adminpassword', BCRYPT_ROUNDS), role: 'ADMIN' },
    select: { id: true },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: { banned: false },
    create: { email: 'user@example.com', password: await bcrypt.hash('userpassword', BCRYPT_ROUNDS) },
    select: { id: true },
  });

  await prisma.blacklist.createMany({
    data: [
      { domain: 'malware.example.com', reason: 'known malware' },
      { domain: 'phishing.example.com', reason: 'phishing site' },
    ],
    skipDuplicates: true,
  });

  const [launch, blog, docs] = await Promise.all([
    prisma.shortUrl.create({
      data: { shortCode: 'demo-launch', originalUrl: 'https://example.com/launch-announcement', userId: user.id },
      select: { id: true },
    }),
    prisma.shortUrl.create({
      data: { shortCode: 'demo-blog', originalUrl: 'https://example.com/blog/how-we-scaled', userId: user.id },
      select: { id: true },
    }),
    prisma.shortUrl.create({
      data: {
        shortCode: 'demo-docs',
        originalUrl: 'https://example.com/docs/getting-started',
        userId: user.id,
        expiresAt: new Date(Date.now() + 90 * 86_400_000),
      },
      select: { id: true },
    }),
  ]);

  await prisma.clickEvent.createMany({
    data: [...buildClicks(launch.id, 90), ...buildClicks(blog.id, 35), ...buildClicks(docs.id, 12)],
  });

  const clicks = await prisma.clickEvent.count();
  console.log(`Seeded: admin=${admin.id} user=${user.id}, 3 links, ${clicks} total click events, 2 blacklist domains`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
