# Project: URL Shortener + Analytics Dashboard

You are building a full-stack URL shortener with analytics and an admin panel.
Read all five docs in the `docs/` folder before writing any code:
- `docs/PRD.md` — feature scope and actor permissions
- `docs/architecture.md` — system structure, folder layout, tech stack
- `docs/design.md` — visual tokens, component specs, layout wireframes
- `docs/schema.md` — database models, Redis keys, seed data
- `docs/rules.md` — code standards, naming, security rules

Follow `docs/rules.md` on every file you write. No exceptions.

---

## Project Structure to Create

```
url-shortener/
├── docs/               ← already exists, do not touch
├── client/             ← React frontend
├── server/             ← Express backend
└── CLAUDE.md           ← this file
```

---

## Phase 1 — Server Foundation

### 1.1 Init server

```bash
cd server
npm init -y
npm install express cors helmet dotenv bcryptjs jsonwebtoken nanoid zod ioredis
npm install @prisma/client prisma
npm install express-async-errors
npm install -D typescript ts-node-dev @types/express @types/node @types/bcryptjs @types/jsonwebtoken eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npx prisma init
```

Create `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

Create `server/package.json` scripts:
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node prisma/seed.ts",
    "db:generate": "prisma generate"
  }
}
```

### 1.2 Environment config

Create `server/.env.example`:
```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CLIENT_ORIGIN=http://localhost:5173
PORT=3000
```

Create `server/src/config/env.ts`:
- Use Zod to validate all vars above at startup
- Export a typed `env` object
- Throw and exit if any required var is missing

### 1.3 Database schema

Copy the Prisma schema from `docs/schema.md` into `server/prisma/schema.prisma`.
Run `npx prisma migrate dev --name init` after creating the schema.

### 1.4 Singleton clients

Create `server/src/lib/prisma.ts` — singleton PrismaClient.
Create `server/src/lib/redis.ts` — singleton ioredis client using `env.REDIS_URL`.
Create `server/src/lib/hash.ts` — export `hashIp(ip: string): string` using SHA-256 + a static salt from env.

### 1.5 App entry

Create `server/src/app.ts`:
- Import express, cors, helmet, cookie-parser
- Apply helmet, cors (origin: env.CLIENT_ORIGIN, credentials: true)
- Apply `express.json()`
- Mount routes (auth, urls, analytics, admin, redirect)
- Global error handler: catch Error, return `{ error: string, code: string }`
- Listen on env.PORT

---

## Phase 2 — Server: Auth

### 2.1 Validators

Create `server/src/validators/auth.ts`:
- `registerSchema` — email (valid format), password (min 8 chars)
- `loginSchema` — email, password

### 2.2 Auth routes

Create `server/src/routes/auth.ts`:

`POST /auth/register`
- Validate body with `registerSchema`
- Check email not already taken
- Hash password with bcrypt (rounds from env)
- Create user in DB
- Return `{ message: 'Account created' }`

`POST /auth/login`
- Validate body with `loginSchema`
- Find user by email
- Check `user.banned` → reject with 403 if true
- Compare password with bcrypt
- Sign JWT `{ id, role }` with env.JWT_SECRET, expires in env.JWT_EXPIRES_IN
- Set cookie: `token`, httpOnly, secure (prod only), sameSite strict
- Return `{ user: { id, email, role } }`

`POST /auth/logout`
- Clear `token` cookie
- Return `{ message: 'Logged out' }`

`GET /auth/me`
- Requires auth middleware
- Return `req.user`

### 2.3 Auth middleware

Create `server/src/middlewares/auth.ts`:
- Read JWT from `req.cookies.token`
- Verify with env.JWT_SECRET
- Attach `req.user: { id: string, role: Role }` to request
- Return 401 if missing or invalid

Create `server/src/middlewares/requireAdmin.ts`:
- Check `req.user.role === 'ADMIN'`
- Return 403 if not

Extend Express `Request` type in `server/src/types/express.d.ts` to include `user`.

---

## Phase 3 — Server: URL Shortening + Redirect

### 3.1 Validators

Create `server/src/validators/urls.ts`:
- `createUrlSchema` — originalUrl (valid URL), alias (optional, 3-32 chars, alphanumeric + hyphens), expiresAt (optional ISO date string)
- `shortCodeParamSchema` — shortCode (string, 3-32 chars)

### 3.2 Blacklist service

Create `server/src/services/blacklistService.ts`:
- `check(url: string): Promise<boolean>` — extract hostname, query Blacklist table
- Return true if domain is blacklisted

### 3.3 URL service

Create `server/src/services/urlService.ts`:
- `create({ originalUrl, alias, expiresAt, userId })` — check blacklist, generate nanoid if no alias, write to DB, cache in Redis (`url:{shortCode}` TTL 86400), return ShortUrl
- `getByShortCode(shortCode)` — Redis first, DB fallback, populate cache on miss
- `listByUser(userId)` — return user's URLs with click count
- `deleteById(id, userId)` — verify ownership, delete from DB, invalidate Redis key

### 3.4 Rate limiter middleware

Create `server/src/middlewares/rateLimiter.ts`:
- Export factory function `createRateLimiter({ max, windowSeconds, keyFn })`
- Uses Redis INCR + EXPIRE pattern
- Returns 429 with `{ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }` when over limit
- Instantiate and export:
  - `shortenGuestLimiter` — 5/day, key by hashed IP
  - `shortenUserLimiter` — 50/day, key by userId
  - `authLimiter` — 10/15min, key by hashed IP
  - `redirectLimiter` — 200/min, key by hashed IP

### 3.5 URL routes

Create `server/src/routes/urls.ts`:
- `POST /urls` — auth (optional, apply guest or user rate limiter accordingly) → validate → create
- `GET /urls` — auth required → list user's URLs
- `DELETE /urls/:id` — auth required → delete (verify ownership)

### 3.6 Redirect route

Create `server/src/routes/redirect.ts`:
- `GET /:shortCode` — redirectLimiter → getByShortCode → check active + expiry → fire async click record → `res.redirect(301, originalUrl)`
- Expired: 410. Not found: 404. Inactive: 410.

---

## Phase 4 — Server: Click Tracking + Analytics

### 4.1 Click service

Create `server/src/services/clickService.ts`:
- `record(shortUrlId, req)` — async, non-blocking
  - Hash IP using `hashIp`
  - Parse user agent → derive DeviceType (simple regex: mobile keywords → MOBILE, bot keywords → BOT, else DESKTOP)
  - Extract referrer from `req.headers.referer`
  - Write ClickEvent to DB

### 4.2 Analytics service

Create `server/src/services/analyticsService.ts`:
- `getClickTrend(shortUrlId)` — groupBy day, last 30 days, return `{ date, count }[]`
- `getTopReferrers(shortUrlId)` — groupBy referrer, top 5, return `{ referrer, count }[]`
- `getDeviceBreakdown(shortUrlId)` — groupBy deviceType, return `{ deviceType, count }[]`
- `getAggregate(userId)` — total URLs, total clicks, best URL (highest clicks)

### 4.3 Analytics routes

Create `server/src/routes/analytics.ts`:
- `GET /analytics/:shortCode` — auth → verify ownership (or admin) → return all four analytics payloads

---

## Phase 5 — Server: Admin

### 5.1 Admin service

Create `server/src/services/adminService.ts`:
- `listUsers()` — all users with URL count
- `listUrls()` — all URLs with owner email + click count
- `deactivateUrl(id)` — set active: false, invalidate Redis
- `reactivateUrl(id)` — set active: true, re-cache in Redis
- `banUser(id)` — set banned: true
- `addToBlacklist(domain, reason)` — create Blacklist record
- `getGlobalStats()` — total users, total URLs, total clicks, new users today

### 5.2 Admin routes

Create `server/src/routes/admin.ts` (all routes require auth + requireAdmin):
- `GET /admin/users`
- `POST /admin/users/:id/ban`
- `GET /admin/links`
- `POST /admin/links/:id/deactivate`
- `POST /admin/links/:id/reactivate`
- `POST /admin/blacklist`
- `GET /admin/stats`

### 5.3 Seed

Create `server/prisma/seed.ts`:
- Create admin user (email: admin@shrtn.io, password: adminpassword, role: ADMIN)
- Create test user (email: user@example.com, password: userpassword)
- Create 2 blacklist entries
- Create 3 sample short URLs for test user
- Create sample click events for analytics demo data

---

## Phase 6 — Client Foundation

### 6.1 Init client

```bash
cd client
npm create vite@latest . -- --template react-ts
npm install react-router-dom axios @tanstack/react-query zustand recharts lucide-react
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

### 6.2 Tailwind config

Extend `tailwind.config.js` with all design tokens from `docs/design.md`:
- Colors: bg, surface, surface-2, border, border-focus, all text variants, accent, accent-dim, accent-hover, success, warning, danger, danger-dim
- Font families: display (DM Sans), body (Inter), mono (JetBrains Mono)
- Border radius: sm (4px), md (6px), lg (8px)

Add Google Fonts link in `index.html`: DM Sans (600,700), Inter (400,500), JetBrains Mono (400,500).

### 6.3 Core setup

Create `client/src/lib/api.ts`:
- Axios instance, baseURL from `import.meta.env.VITE_API_URL`
- `withCredentials: true`
- Response interceptor: on 401, redirect to `/login`

Create `client/src/types/index.ts` with all shared types:
- `User`, `ShortUrl`, `ClickEvent`, `AnalyticsPayload`, `GlobalStats`

Create `client/src/store/authStore.ts` — Zustand:
- State: `user: User | null`, `isLoading: boolean`
- Actions: `setUser`, `clearUser`, `fetchMe` (calls GET /auth/me on app load)

Create `client/src/lib/queryKeys.ts` — all TanStack Query key constants.

### 6.4 UI primitives

Create these in `client/src/components/ui/`, styled exactly per `docs/design.md` tokens:

`Button.tsx` — variants: primary, secondary, danger, ghost. Size: default (36px height). Accepts `isLoading` prop (show spinner, disable).

`Input.tsx` — controlled, accepts label, error message, placeholder. Focus ring per design.

`Badge.tsx` — variants: active, inactive, expired, banned. Monospace font.

`Card.tsx` — surface background, border, radius-md, padding.

`Table.tsx` — thead uppercase, tbody row hover, border separators. No outer shadow.

`StatCard.tsx` — label (uppercase, text-xs, secondary), value (text-3xl, display font), trend (text-xs, success/danger).

`ShortCodeDisplay.tsx` — the signature element:
- Monospace font, accent color
- Left border 2px accent
- Background accent-dim
- Copy button (Lucide Copy → Check on click, revert after 1.5s)
- No border-radius

### 6.5 Shared components

`Navbar.tsx` — logo left, Login + Register (guest) or user menu + logout (auth).
`Sidebar.tsx` — nav links with Lucide icons per design.md icon table. Collapses on mobile.
`ProtectedRoute.tsx` — redirect to /login if no user in auth store.
`AdminRoute.tsx` — redirect to /dashboard if role !== ADMIN.
`Layout.tsx` — sidebar + main content area.

---

## Phase 7 — Client Pages

### 7.1 Home (Guest Landing)

`client/src/pages/Home.tsx`:
- Centered, max-width 640px
- Headline: "Shorten anything." (DM Sans, text-2xl, bold)
- Subline: "One clean link. Real analytics." (text-secondary)
- URL input + Shorten button (inline row)
- On success: render ShortCodeDisplay below form
- Guest rate limit note: "5 free shortens per day · Sign up for more" (text-xs, muted)
- If user is logged in, redirect to /dashboard

### 7.2 Auth Pages

`client/src/pages/Login.tsx` — email + password form, link to register, error display.
`client/src/pages/Register.tsx` — email + password form, link to login, error display.

Both pages: centered card layout, max-width 400px.

### 7.3 Dashboard

`client/src/pages/Dashboard.tsx`:
- Stat cards row: Total URLs, Total Clicks, Best Performing URL
- Inline shorten form (compact — input + button in one row)
- On shorten success: show ShortCodeDisplay, refetch URL list
- URL table columns: Short Code | Original URL (truncated) | Clicks | Created | Status | Actions
- Row actions: Analytics (BarChart2 icon → /analytics/:shortCode), Delete (Trash2 icon, confirm)
- Empty state: "No links yet. Shorten your first URL above."

### 7.4 Analytics Detail

`client/src/pages/Analytics.tsx`:
- Header: ShortCodeDisplay + original URL below it
- Back link to Dashboard
- Click Trend: Recharts LineChart, last 30 days, x-axis = date, y-axis = clicks
- Top Referrers: horizontal bar chart or simple ranked list with counts
- Device Breakdown: three stat cards (Mobile / Desktop / Bot) with counts + percentage

### 7.5 Admin Pages

`client/src/pages/admin/Overview.tsx`:
- Stat cards: Total Users, Total URLs, Total Clicks, New Users Today

`client/src/pages/admin/Users.tsx`:
- Table: ID | Email | Role | Status | Created | URLs | Actions
- Ban action: ShieldOff icon, confirm dialog, calls POST /admin/users/:id/ban
- Banned users show banned badge

`client/src/pages/admin/Links.tsx`:
- Table: Short Code | Original URL | Owner | Clicks | Status | Created | Actions
- Deactivate/Reactivate toggle action
- Add to blacklist button on each row

---

## Phase 8 — Final

### 8.1 Error handling

- Add error boundaries in React (wrap routes)
- All API errors surface user-readable messages (not raw error codes)
- 410 Gone on redirect shows a clean "This link has expired or been deactivated." page
- 404 on redirect shows a clean "Link not found." page

### 8.2 Environment

Create `client/.env.example`:
```
VITE_API_URL=http://localhost:3000
```

### 8.3 README

Create `README.md` at project root covering:
- What this project is (1 paragraph)
- Tech stack (table)
- Local setup instructions (step by step)
- Environment variables (both client and server)
- How to run seed data
- Security decisions (reference architecture.md)
- Deploy notes (Vercel + Railway/Render + Supabase + Upstash)

### 8.4 Final checklist

Before finishing, verify:
- [ ] All routes return consistent `{ error, code }` shape on failure
- [ ] No raw IP stored anywhere
- [ ] No password hash returned in any response
- [ ] Rate limiters active on shorten + auth + redirect routes
- [ ] Blacklist check runs on every URL create
- [ ] Admin routes all require ADMIN role
- [ ] Redis invalidated on URL delete and deactivate
- [ ] Expired URLs return 410, not 404
- [ ] HTTP-only cookie set correctly
- [ ] CORS restricted to CLIENT_ORIGIN only
- [ ] .env files in .gitignore

---

## Notes

- Ponytail mode active: no speculative abstractions, no wrapper around a wrapper, no config for values that never change.
- Follow rules.md on every file: TypeScript strict, early return, named exports, Zod on all inputs.
- Comments only for non-obvious security decisions or `ponytail:` deferral notes.
- If a decision is ambiguous, pick the simpler option and note it with a `ponytail:` comment.
