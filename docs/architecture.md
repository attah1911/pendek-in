# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│              Vercel CDN — Static + SSR-ready                 │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express API Server                        │
│                    Railway / Render                          │
│                                                             │
│   ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│   │  Auth Layer │  │ Rate Limiter │  │  Zod Validator  │  │
│   │  JWT Cookie │  │  (Redis)     │  │  (all routes)   │  │
│   └─────────────┘  └──────────────┘  └─────────────────┘  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                   Route Handlers                     │  │
│   │   /auth  /urls  /analytics  /admin  /{shortCode}    │  │
│   └───────────────────┬─────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌─────────────────┐         ┌─────────────────────┐
│   PostgreSQL    │         │        Redis         │
│   (Supabase)    │         │      (Upstash)       │
│                 │         │                      │
│  - users        │         │  - shortCode → url   │
│  - short_urls   │         │    (cache, TTL 24h)  │
│  - click_events │         │  - rate limit keys   │
│  - blacklist    │         │    (sliding window)  │
└─────────────────┘         └─────────────────────┘
```

---

## Folder Structure

```
url-shortener/
├── client/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── ui/           # primitives: Button, Input, Badge, etc.
│       │   └── shared/       # Navbar, ProtectedRoute, etc.
│       ├── hooks/            # useAuth, useUrls, useAnalytics
│       ├── lib/
│       │   ├── api.ts        # axios instance + interceptors
│       │   └── utils.ts
│       ├── pages/
│       │   ├── Home.tsx      # guest landing + shorten form
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── Dashboard.tsx # user URL list + aggregate stats
│       │   ├── Analytics.tsx # per-URL detail charts
│       │   └── admin/
│       │       ├── Overview.tsx
│       │       ├── Users.tsx
│       │       └── Links.tsx
│       ├── store/            # Zustand (auth state only)
│       ├── types/
│       └── main.tsx
│
└── server/
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── config/
        │   └── env.ts        # typed env vars via envalid or zod
        ├── lib/
        │   ├── prisma.ts     # singleton client
        │   ├── redis.ts      # singleton client
        │   └── hash.ts       # SHA-256 for IP hashing
        ├── middlewares/
        │   ├── auth.ts       # JWT verification
        │   ├── requireAdmin.ts
        │   └── rateLimiter.ts
        ├── routes/
        │   ├── auth.ts
        │   ├── urls.ts
        │   ├── analytics.ts
        │   ├── admin.ts
        │   └── redirect.ts
        ├── services/
        │   ├── urlService.ts
        │   ├── clickService.ts
        │   └── blacklistService.ts
        ├── validators/       # Zod schemas
        └── app.ts
```

---

## Request Flows

### Shorten URL (authenticated user)

```
POST /api/urls
│
├── rateLimiter (50/day per user, Redis)
├── auth middleware (verify JWT cookie)
├── Zod validate body { url, alias?, expiresAt? }
├── blacklistService.check(url)
├── urlService.create({ url, alias, userId })
│   ├── generate nanoid if no alias
│   ├── prisma.shortUrl.create()
│   └── redis.set(shortCode, originalUrl, EX 86400)
└── return { shortUrl, shortCode }
```

### Redirect

```
GET /{shortCode}
│
├── rateLimiter (200/min per IP, Redis)
├── redis.get(shortCode)
│   ├── HIT → resolve url
│   └── MISS → prisma.shortUrl.findUnique()
│               ├── not found → 404
│               └── expired  → 410
├── clickService.record(shortUrlId, req) → async, non-blocking
└── res.redirect(301, originalUrl)
```

### Analytics Query

```
GET /api/analytics/:shortCode
│
├── auth middleware
├── verify ownership (or admin)
├── prisma.clickEvent.groupBy(day, last 30 days)
├── prisma.clickEvent.groupBy(referrer, top 5)
├── prisma.clickEvent.groupBy(deviceType)
└── return aggregated payload
```

---

## Tech Stack

### Client
| Package | Role |
|---------|------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| TailwindCSS | Styling |
| React Router v6 | Routing |
| TanStack Query v5 | Server state, caching, refetch |
| Zustand | Auth state (minimal global state) |
| Recharts | Analytics charts |
| Lucide React | Icons |
| Axios | HTTP client |

### Server
| Package | Role |
|---------|------|
| Express + TypeScript | HTTP server |
| Prisma | ORM |
| PostgreSQL | Primary database |
| Redis (ioredis) | Cache + rate limiting |
| Zod | Runtime validation |
| bcrypt | Password hashing |
| jsonwebtoken | JWT sign/verify |
| helmet | Security headers |
| cors | CORS policy |
| nanoid | Short code generation |

### Infrastructure
| Service | Tier |
|---------|------|
| Vercel | Frontend deploy (free) |
| Railway or Render | Backend deploy (free tier) |
| Supabase | PostgreSQL (free tier) |
| Upstash | Redis (free tier, serverless) |

---

## Security Decisions

| Decision | Rationale |
|----------|-----------|
| HTTP-only cookie for JWT | Prevents XSS token theft vs localStorage |
| SameSite=Strict | Prevents CSRF on state-mutating requests |
| bcrypt rounds=12 | Balanced cost vs performance for auth endpoints |
| IP stored as SHA-256 | Privacy compliance, still useful for rate limit keying |
| Zod on all inputs | Single source of truth for shape + type safety |
| Helmet defaults | Sets X-Frame-Options, CSP baseline, HSTS |
| Redis rate limiter | Distributed-safe, survives server restarts |
| Blacklist service | Blocks known phishing/malware domains before DB write |

---

## Caching Strategy

```
Short code lookup:
  Redis (TTL 24h)
    └── miss → PostgreSQL → populate Redis

Invalidation:
  On URL delete or deactivate → redis.del(shortCode)
  On expiry → Redis TTL handles it naturally

Analytics:
  No cache (MVP) — queries are indexed and fast enough
  ponytail: add Redis cache for analytics if query latency spikes
```

---

## Environment Variables

```bash
# server/.env
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CLIENT_ORIGIN=http://localhost:5173
PORT=3000

# client/.env
VITE_API_URL=http://localhost:3000
```
