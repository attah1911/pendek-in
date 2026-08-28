# Database Schema

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  banned    Boolean  @default(false)
  createdAt DateTime @default(now())

  shortUrls ShortUrl[]

  @@index([email])
}

model ShortUrl {
  id          String    @id @default(cuid())
  shortCode   String    @unique
  originalUrl String
  userId      String?
  expiresAt   DateTime?
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())

  user        User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  clicks      ClickEvent[]

  @@index([shortCode])
  @@index([userId])
}

model ClickEvent {
  id         String   @id @default(cuid())
  shortUrlId String
  ipHash     String
  userAgent  String?
  referrer   String?
  deviceType DeviceType @default(UNKNOWN)
  createdAt  DateTime @default(now())

  shortUrl   ShortUrl @relation(fields: [shortUrlId], references: [id], onDelete: Cascade)

  @@index([shortUrlId])
  @@index([shortUrlId, createdAt])
}

model Blacklist {
  id        String   @id @default(cuid())
  domain    String   @unique
  reason    String?
  createdAt DateTime @default(now())

  @@index([domain])
}

enum Role {
  USER
  ADMIN
}

enum DeviceType {
  MOBILE
  DESKTOP
  BOT
  UNKNOWN
}
```

---

## Table Notes

### `User`
- `role` defaults to `USER`; set to `ADMIN` via seed or manual update
- `banned: true` blocks login at auth middleware level
- `password` stores bcrypt hash, never plaintext

### `ShortUrl`
- `userId` is nullable — guest shortens produce ownerless records
- `active: false` = admin-deactivated (redirect returns 410)
- `expiresAt` nullable; if set and in the past, redirect returns 410
- `shortCode` is either nanoid-generated or user-provided alias

### `ClickEvent`
- `ipHash` = SHA-256(rawIp + salt), never stores raw IP
- `deviceType` derived from user agent parsing at write time (keeps query simple)
- Composite index on `(shortUrlId, createdAt)` covers the 30-day trend query

### `Blacklist`
- Stores domains, not full URLs (e.g., `phishing.example.com`)
- Checked by extracting hostname from submitted URL before saving

---

## Key Queries

### Click trend (last 30 days)

```typescript
const trend = await prisma.clickEvent.groupBy({
  by: ['createdAt'],
  where: {
    shortUrlId,
    createdAt: { gte: thirtyDaysAgo },
  },
  _count: true,
})
```

Grouped by day in application layer (truncate date from createdAt).

### Top referrers

```typescript
const referrers = await prisma.clickEvent.groupBy({
  by: ['referrer'],
  where: { shortUrlId },
  _count: true,
  orderBy: { _count: { referrer: 'desc' } },
  take: 5,
})
```

### Device breakdown

```typescript
const devices = await prisma.clickEvent.groupBy({
  by: ['deviceType'],
  where: { shortUrlId },
  _count: true,
})
```

---

## Redis Keys

| Key pattern | Value | TTL |
|-------------|-------|-----|
| `url:{shortCode}` | `originalUrl` string | 86400s (24h) |
| `rl:shorten:user:{userId}` | count (incr) | until end of day (dynamic TTL) |
| `rl:shorten:ip:{ipHash}` | count (incr) | until end of day (dynamic TTL) |
| `rl:auth:{ipHash}` | count (incr) | 900s (15 min) |
| `rl:redirect:{ipHash}` | count (incr) | 60s |

Rate limit keys use `INCR` + `EXPIRE` on first hit pattern.

---

## Seed Data

```typescript
// prisma/seed.ts

const admin = await prisma.user.create({
  data: {
    email: 'admin@shrtn.io',
    password: await bcrypt.hash('adminpassword', 12),
    role: 'ADMIN',
  },
})

const testUser = await prisma.user.create({
  data: {
    email: 'user@example.com',
    password: await bcrypt.hash('userpassword', 12),
  },
})

await prisma.blacklist.createMany({
  data: [
    { domain: 'malware.example.com', reason: 'known malware' },
    { domain: 'phishing.example.com', reason: 'phishing site' },
  ],
})
```
