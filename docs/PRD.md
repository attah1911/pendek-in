# Product Requirements Document
## URL Shortener + Analytics Dashboard

**Version:** 1.0  
**Status:** Draft  
**Timeline:** 1 week MVP

---

## 1. Overview

A full-stack URL shortening service with per-user analytics, custom aliases, rate limiting, and an admin control panel. Built to demonstrate production-grade full-stack engineering: auth, security hardening, real-time data aggregation, and a polished dashboard UI.

---

## 2. Goals

- Allow users to shorten URLs with optional custom aliases
- Track click events with metadata (referrer, device, country, timestamp)
- Expose per-user analytics with charts and breakdowns
- Enforce security at every layer (auth, rate limiting, input validation, blacklist)
- Provide admin visibility and control over the entire platform

---

## 3. Actors & Permissions

| Actor | Description |
|-------|-------------|
| **Guest** | Unauthenticated visitor. Can shorten up to 5 URLs/day (rate-limited by IP). No dashboard access. |
| **User** | Registered account. Can manage own URLs, view own analytics, set expiry and custom alias. |
| **Admin** | Full platform access. Can view all URLs, manage users, deactivate any link, see global stats. |

---

## 4. Functional Requirements

### 4.1 Authentication

- Register with email + password (min 8 chars, bcrypt hashed)
- Login returns JWT stored in HTTP-only cookie
- Logout clears cookie server-side
- Protected routes reject unauthenticated requests with `401`
- Admin role assigned manually via DB or seed

### 4.2 URL Shortening

- Input: long URL (required), custom alias (optional), expiry date (optional)
- Output: `https://{domain}/{shortCode}`
- Short code: 6-char alphanumeric (nanoid), or user-provided alias (3–32 chars, alphanumeric + hyphens)
- Alias uniqueness enforced at DB level
- Validate URL format before saving
- Check URL against blacklist before saving

### 4.3 Redirect

- `GET /{shortCode}` resolves short code from Redis cache first, PostgreSQL fallback
- If expired → return `410 Gone`
- If not found → return `404`
- On successful redirect: fire async click event (do not block redirect)
- Click event records: `shortUrlId`, `ip` (hashed), `userAgent`, `referrer`, `timestamp`

### 4.4 Analytics (User)

- Per-URL stats:
  - Total clicks (all time)
  - Click trend chart (daily, last 30 days)
  - Top 5 referrers
  - Device type breakdown (mobile / desktop / bot)
- Aggregate stats (dashboard header):
  - Total URLs created
  - Total clicks across all URLs
  - Best performing URL

### 4.5 Admin Panel

- View all users (id, email, role, created at, URL count)
- View all URLs (with owner, click count, status, created at)
- Deactivate / reactivate any URL
- Ban user (sets `banned: true`, blocks login)
- View platform-wide click stats (total clicks, active URLs, new users today)
- Add URL to blacklist

### 4.6 Rate Limiting

| Actor | Limit |
|-------|-------|
| Guest (shorten) | 5 requests / day / IP |
| User (shorten) | 50 requests / day / account |
| Auth endpoints | 10 requests / 15 min / IP |
| Redirect | 200 requests / min / IP (anti-abuse) |

Rate limit state stored in Redis with TTL.

---

## 5. Non-Functional Requirements

### Security
- Passwords hashed with bcrypt (rounds: 12)
- JWT signed with `RS256` or `HS256` + secret rotation strategy documented
- HTTP-only, `SameSite=Strict` cookies
- IP stored as SHA-256 hash (no raw IP saved)
- CORS restricted to known origins
- Helmet.js for HTTP security headers
- Input sanitized with Zod schemas on every endpoint
- URL blacklist checked on every shorten request

### Performance
- Redis cache for short code → original URL lookup (TTL: 24h, invalidated on delete)
- Click tracking is fire-and-forget (non-blocking async)
- Analytics queries use indexed columns (`shortUrlId`, `createdAt`)

### Reliability
- Expired URLs return `410` not `404` (distinguishable for SEO/debugging)
- Graceful error responses with consistent JSON shape: `{ error: string, code: string }`

---

## 6. Out of Scope (MVP)

- Email verification
- OAuth (Google/GitHub login)
- QR code generation
- Link preview / OG metadata
- Team/workspace features
- Paid tiers / billing
- Geographic breakdown (country analytics)

---

## 7. Success Metrics (Portfolio Context)

- All security features demonstrably working (rate limit, auth, blacklist)
- Dashboard charts rendering real data
- Admin panel functional end-to-end
- Deployed and publicly accessible
- README documents architecture, security decisions, and how to run locally
