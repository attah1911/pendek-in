# Development Rules
## URL Shortener Project

These rules apply to every file in this codebase. They are enforced during code review and should be followed from the first line written.

---

## Code Style

### General
- TypeScript strict mode on everywhere (`"strict": true`)
- No `any` — use `unknown` and narrow, or define a proper type
- No unused variables or imports (enforced by tsconfig + eslint)
- Prefer `const` over `let`; never use `var`
- Early return over nested conditionals
- Named exports over default exports (easier to grep and refactor)

### Naming
- Variables and functions: `camelCase`
- Types, interfaces, enums: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE` only for true module-level constants
- Files: `camelCase.ts` for modules, `PascalCase.tsx` for React components
- Route files: named after the resource (`urls.ts`, `auth.ts`, `admin.ts`)

### Comments
- No comments that describe what the code does — the code should say that
- Comments only for: non-obvious security decisions, known trade-offs, or `ponytail:` deferral notes
- No `// TODO` without a GitHub issue reference or `ponytail:` tag

---

## Backend Rules

### Express
- All route handlers thin — logic lives in service layer
- No business logic in middleware
- Every route validates its input with a Zod schema before any DB call
- Async route handlers wrapped in error boundary (use `express-async-errors` or wrapper util)
- Consistent error response shape everywhere:
  ```typescript
  { error: string, code: string }
  ```

### Zod Validators
- One file per route group in `src/validators/`
- Export named schemas: `createUrlSchema`, `loginSchema`, etc.
- Validate: `req.body`, `req.params`, `req.query` — all three where applicable

### Services
- Services return typed values, never raw Prisma types to routes
- Services throw typed errors that route handlers catch
- No `console.log` in services — use structured logging or remove entirely

### Prisma
- No raw SQL unless absolutely necessary (document why)
- Select only the fields needed — no `findMany` without `select`
- Transactions for any multi-step write operation

### Auth
- JWT secret from env only — never hardcoded
- Cookie options: `httpOnly: true`, `secure: true` (prod), `sameSite: 'strict'`
- Auth middleware attaches `req.user: { id, role }` — nothing else

### Environment
- All env vars typed and validated at startup via Zod in `src/config/env.ts`
- App fails fast if required env vars are missing — no silent fallbacks

---

## Frontend Rules

### React
- Functional components only
- Props typed with `interface`, not `type` (for extensibility)
- No prop drilling beyond 2 levels — use context or Zustand
- Forms: controlled components, no uncontrolled inputs
- No `useEffect` for data fetching — use TanStack Query

### TanStack Query
- Query keys as constants in a `queryKeys.ts` file
- Mutations invalidate relevant queries on success
- Error states handled in every `useQuery` consumer

### Axios
- Single axios instance in `src/lib/api.ts` with base URL and `withCredentials: true`
- Response interceptor for 401 → redirect to login
- No raw `fetch` calls anywhere

### Styling (Tailwind)
- Follow design tokens from `design.md` — no arbitrary hex values in className
- Extend Tailwind config with custom tokens (colors, font families, spacing)
- No inline `style` prop unless value is genuinely dynamic (e.g., chart dimensions)
- Class order: layout → spacing → typography → color → border → state variants

### Component Rules
- UI primitives in `src/components/ui/` — no business logic
- Page components in `src/pages/` — orchestrate data + layout, minimal JSX logic
- Shared layout components in `src/components/shared/`
- No component file longer than ~200 lines — split if needed

---

## Security Rules (non-negotiable)

- Never log raw IP addresses, passwords, or JWT tokens
- Never return password hash in any API response
- Blacklist check runs before every URL save — cannot be skipped
- Rate limiter runs before auth middleware on shorten endpoint — even authed users are limited
- Admin routes always check `req.user.role === 'ADMIN'` via `requireAdmin` middleware
- `active: false` URLs must return `410` on redirect — no bypasses
- Banned users must be rejected at login — blocked by `auth` middleware

---

## Git & File Rules

- Commit messages: `type(scope): description`  
  Examples: `feat(urls): add custom alias validation`, `fix(auth): reject banned users on login`
- One concern per commit — no "misc fixes" commits
- `.env` files never committed — always in `.gitignore`
- `prisma/migrations/` committed and never manually edited

---

## Ponytail Rules (Complexity Budget)

- No abstraction without two concrete use cases in this codebase right now
- No wrapper around a wrapper — if you're wrapping Express's `Router`, question it
- No custom utility that duplicates something Zod, Prisma, or the JS stdlib already does
- If a service file hits 150 lines, it's a signal to reconsider, not an automatic split
- Redis client is a singleton — do not create multiple connections
- Prisma client is a singleton — same rule

---

## File Reference

| Document | What it governs |
|----------|----------------|
| `PRD.md` | Feature scope and actor permissions |
| `architecture.md` | System structure, tech stack, request flows |
| `design.md` | Visual tokens, component specs, layout |
| `schema.md` | Database models, Redis keys, seed data |
| `rules.md` | This file — code standards and constraints |
