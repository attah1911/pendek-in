# pendek-in — URL Shortener + Analytics Dashboard

A full-stack URL shortener with per-user click analytics, custom aliases, expiry dates,
Redis-backed rate limiting, a domain blacklist, and an admin control panel. Guests can
shorten a handful of links per day; registered users get a dashboard with click trends,
referrer breakdowns, and device stats per link; admins can see every user and link,
deactivate abusive links, ban users, and blacklist domains.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript, Vite, React Router 7, TanStack Query 5, Zustand, Recharts, Tailwind CSS 3 |
| Backend | Node + Express 4 + TypeScript, Zod validation, `express-async-errors` |
| Database | PostgreSQL via Prisma 5 (hosted on Supabase) |
| Cache / rate limit | Redis via ioredis (hosted on Upstash) |
| Auth | JWT in an HTTP-only cookie, bcrypt password hashing |

---

## Project layout

```
url-shortener/
├── docs/       specs — PRD, architecture, design system, schema, rules
├── server/     Express API + Prisma schema + seed
└── client/     React SPA
```

---

## Local setup

**Prerequisites:** Node 20+, a PostgreSQL database, a Redis instance.
The free tiers of [Supabase](https://supabase.com) and [Upstash](https://upstash.com) work fine.

### 1. Server

```bash
cd server
npm install
cp .env.example .env      # then fill in the values (see table below)
npx prisma migrate deploy # apply migrations  (use `npm run db:migrate` in dev)
npm run db:seed           # optional: demo users, links, and click data
npm run dev               # http://localhost:3000
```

### 2. Client

```bash
cd client
npm install
npm run dev               # http://localhost:5173  (proxies /api -> localhost:3000)
```

Open **http://localhost:5173**.

### Seed accounts

`npm run db:seed` (idempotent) creates:

| Email | Password | Role |
|---|---|---|
| `admin@pendek-in.app` | `adminpassword` | ADMIN |
| `user@example.com` | `userpassword` | USER |

plus 3 demo links and ~137 click events for `user@example.com`, and 2 blacklisted domains.

---

## Environment variables

### `server/.env`

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. With Supabase, use the **transaction pooler** (port 6543, `?pgbouncer=true`). |
| `DIRECT_URL` | prod | Non-pooled connection for `prisma migrate` (Supabase **session pooler**, port 5432). |
| `REDIS_URL` | yes | `redis://` or `rediss://` (TLS). Upstash gives a `rediss://` URL. |
| `JWT_SECRET` | yes | ≥ 16 chars. Used to sign session JWTs. |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d`. |
| `BCRYPT_ROUNDS` | no | Default `12`. |
| `IP_HASH_SALT` | yes | ≥ 8 chars. Salt for the SHA-256 IP hash — raw IPs are never stored. |
| `COOKIE_SAMESITE` | no | `strict` (default) \| `lax` \| `none`. Keep `strict` — the client proxies the API (below), so it's always same-site. |
| `CLIENT_ORIGIN` | yes | Frontend origin, for CORS. `http://localhost:5173` in dev, the Vercel URL in prod. A trailing slash is stripped automatically. |
| `SHORT_URL_BASE` | no | Origin shown in generated short links (e.g. `https://pendek-in.onrender.com`). Unset → derived from the request. |
| `PORT` | no | Default `3000`. |
| `NODE_ENV` | no | `development` (default) \| `production` \| `test`. `production` sets `Secure` cookies. |

### client

No env vars. The client always calls `/api/*` on its own origin; that's proxied to the API
server — [vite.config.ts](client/vite.config.ts) locally, [client/vercel.json](client/vercel.json)
in production — so the browser only ever talks to one origin and the auth cookie stays first-party.

---

## Security decisions

The full rationale table is in [`docs/architecture.md`](docs/architecture.md#security-decisions).
Highlights:

- **Auth** — JWT in an `HttpOnly`, `SameSite` cookie (not `localStorage`); bcrypt rounds = 12;
  passwords capped at 72 bytes (bcrypt truncates silently past that).
- **Bans are immediate** — `requireAuth` re-checks the `banned` flag on every request, so a ban
  takes effect at once rather than whenever the 7-day JWT expires.
- **Rate limiting** — Redis `INCR` + `EXPIRE NX` per window. 5/day guest shortens (by hashed IP),
  50/day user shortens, 10/15min auth attempts, 200/min redirects. The limiter runs *before*
  auth and fails **open** if Redis is unreachable.
- **Blacklist** — checked inside `urlService.create` (cannot be bypassed by a route). Matches the
  submitted hostname *and its parent domains*, so blacklisting `evil.com` also blocks `x.evil.com`.
- **URL hygiene** — only `http`/`https` URLs are accepted (no `javascript:` / `data:`); custom
  aliases are restricted to `[a-zA-Z0-9-]{3,32}` and a reserved-word list.
- **Privacy** — click events store `SHA-256(ip + IP_HASH_SALT)`, never the raw IP. No password
  hash is returned by any endpoint.
- **Headers / CORS** — Helmet defaults; CORS locked to `CLIENT_ORIGIN` with credentials.
- **Redirects** — `302` (not `301`) so every click re-hits the server for analytics; expired or
  deactivated links return `410` with a styled page, unknown codes `404`.

---

## Deploy

| Piece | Service | Notes |
|---|---|---|
| API | Render | `New > Blueprint` reads `render.yaml` (rootDir `server`, migrates on build, `/health` check). Fill in the secret env vars. Note the service URL. |
| Client | Vercel | Root Directory `client`. No env vars. Edit the proxy destination in [`client/vercel.json`](client/vercel.json) to your Render URL. |
| Postgres | Supabase | Pooled `DATABASE_URL` for the app, `DIRECT_URL` (session pooler) for migrations. |
| Redis | Upstash | Copy the `rediss://` URL into `REDIS_URL`. |

**Same-origin by proxy.** `vercel.app` and `onrender.com` are different sites, so a cross-site
auth cookie would be blocked by most browsers. Instead the client only ever calls its own origin
(`/api/*`) and `client/vercel.json` rewrites that to the Render service. The cookie is first-party,
there's no CORS in the browser, and `SameSite=strict` just works. The one hardcoded value is the
Render URL in `vercel.json` — update it if you rename the service.

**On Render:** set `NODE_ENV=production`, `CLIENT_ORIGIN` to the Vercel URL, a strong `JWT_SECRET`
and `IP_HASH_SALT`, `DATABASE_URL` / `DIRECT_URL` / `REDIS_URL`, and `SHORT_URL_BASE` to this
service's own URL. Leave `COOKIE_SAMESITE` unset.

---

## Scripts

### server

| Command | Does |
|---|---|
| `npm run dev` | Watch-mode dev server (`ts-node-dev`) |
| `npm run build` / `npm start` | Compile to `dist/` / run compiled |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Seed demo data (idempotent) |
| `npm test` | Unit tests (`node --test`) |

### client

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Serve the production build |
| `npm run lint` | oxlint |
