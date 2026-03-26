# 0ne Cloud - Claude Code Instructions

## FIRST: Read Build State

**Before doing ANY work on this project, read:**
```
product/BUILD-STATE.md
```

This nimble hub shows what's active and points to the right feature BUILD-STATE.

**Structure:**
- `product/BUILD-STATE.md` → Quick resume + active feature index
- `product/sections/{feature}/BUILD-STATE.md` → Feature-specific implementation plans
- `product/COMPLETED-FEATURES.md` → Archived feature details (read only when needed)

---

## DO NOT TOUCH: Favicon / Icon (CRITICAL)

The favicon is `src/app/icon.svg` — an italic serif "O" in Monarch orange (#FF692D). It is referenced in `layout.tsx` metadata as `{ url: "/icon.svg", type: "image/svg+xml" }`.

**NEVER:**
- Replace, regenerate, or convert it to .ico/.png
- Remove or change the `icon` entry in layout.tsx metadata
- Create a new favicon.ico in public/
- "Fix" a "missing favicon" — it is NOT missing

This has been broken 15+ times by well-meaning build sessions. If you think the favicon is missing, you are wrong. Read `src/app/icon.svg` and `src/app/layout.tsx` to confirm.

---

## Build Protocol (CRITICAL)

### Multi-Agent Sequential Deployment

**For any non-trivial feature (3+ phases), use this pattern:**

1. **Each phase = 1 agent with fresh context**
   - Spawn a Task agent for each phase
   - Agent completes phase → commits (NO push) → returns
   - Main session orchestrates, agents execute

2. **Phase completion checklist:**
   - [ ] Code complete
   - [ ] Tests pass (if applicable)
   - [ ] Commit with descriptive message
   - [ ] Update BUILD-STATE checkboxes
   - [ ] NO push (Jimmy will push)

3. **Before deploying phases, ask:**
   > "Deploy all phases now, or pause between each?"

### Why Agents?

- **Fresh context window:** Each agent starts clean, avoiding context exhaustion
- **Parallel execution:** Multiple independent phases can run simultaneously
- **Atomic commits:** Each phase is a complete, reviewable unit
- **Resumability:** If interrupted, just deploy the next phase

### When to Use Agents

| Scenario | Approach |
|----------|----------|
| Single file change | Direct edit (no agent) |
| 2-3 related changes | Direct edit (no agent) |
| Multi-file feature phase | Use Task agent |
| Database + API + UI | Use Task agent |
| Research/exploration | Use Explore agent |

---

## Session Protocol

**At session START:**
1. Read `product/BUILD-STATE.md`
2. Identify current focus from "Active Features" table
3. Read the relevant section BUILD-STATE (if working on specific feature)
4. Continue from where it left off

**At session END:**
1. Update section BUILD-STATE checkboxes
2. Update root BUILD-STATE "Current Focus" if changed
3. Commit work (NO push unless asked)

---

## Project Overview

0ne Cloud is Jimmy's personal cloud app - a command center for business operations.

**Apps included:**
- KPI Dashboard - Business metrics and funnel tracking
- Skool Scheduler - Automated post publishing
- Skool Sync - Sync Skool messages with GoHighLevel CRM
- GHL Media Manager - Media library management
- Personal Expenses - Expense tracking with Plaid bank integration

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React + Tailwind CSS v4 |
| Components | Custom (shadcn/ui patterns) |
| Auth | Clerk |
| Database | Neon (PostgreSQL) via Drizzle ORM |
| Package Manager | bun (NEVER npm/yarn/pnpm) |

---

## Database (Neon + Drizzle ORM)

**Migrated from Supabase on 2026-03-25.** All queries use Drizzle ORM with Neon serverless driver.

**Schema:** `packages/db/src/schema/` — 9 domain-split files (kpi, skool, scheduler, dm-sync, personal, notifications, ghl, telemetry, system), 63 tables total.

**Client:** `packages/db/src/server.ts` — exports `db` (Drizzle instance) + Drizzle operators (eq, desc, etc.) + all schema tables.

**Import pattern:**
```typescript
import { db, eq, desc, and } from '@0ne/db/server'
import { contacts, skoolMembers } from '@0ne/db/server'
const data = await db.select().from(contacts).where(eq(contacts.id, id))
```

**KNOWN ISSUE:** `server.ts` re-exports schema, causing `neon()` to evaluate in browser when client components import from `@0ne/db/server`. A guard prevents the crash but the proper fix is separating client/server imports.

**Env var:** `NEON_POSTGRES_URL` (from Vercel Neon integration)

---

## Key Directories

```
0ne-cloud/
├── product/                 ← Specs and build tracking
│   ├── BUILD-STATE.md       ← Nimble hub (read FIRST)
│   ├── COMPLETED-FEATURES.md← Archived features
│   └── sections/            ← Per-feature BUILD-STATEs
├── apps/
│   └── web/                 ← Next.js app
│       └── src/
│           ├── app/         ← Pages (App Router)
│           ├── components/  ← Shared components
│           └── features/    ← Feature-specific code
├── packages/
│   ├── ui/                  ← Shared UI components
│   ├── db/                  ← Database client + schemas
│   └── auth/                ← Auth utilities
├── widget/                  ← iOS Scriptable widget (see below)
```

---

## Design System

- **Primary:** #FF692D (Monarch orange)
- **Background:** #F6F5F3 (warm cream)
- **Text:** #22201D (near-black)
- **Sidebar:** #1C1B19 (dark charcoal)
- **Border Radius:** 6px (0.375rem)
- **Shadows:** Subtle - `rgba(34,32,29,0.05)`

---

## Commands

```bash
# Start dev server
cd apps/web && bun dev

# Install dependencies
bun install

# Database migrations
psql "$DATABASE_URL" -f packages/db/schemas/{migration}.sql

# Run cron manually
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/{job}"
```

---

## iOS Widget (IMPORTANT - External Consumer)

**Location:** `widget/SheetWidget.js` (Scriptable iOS app)

**API endpoint:** `GET /api/widget/metrics` (`apps/web/src/app/api/widget/metrics/route.ts`)

**Auth:** Bearer token via `WIDGET_API_KEY` env var (NOT Clerk — widgets can't do browser sessions)

**What it returns:** 4 personal finance KPIs (Cash On Hand, Burn Rate, Runway Days, Runway Months)

**If you change the widget API:** The iPhone widget will break. Check:
- Response shape: `{ metrics: [{ label, value }], updatedAt }` must be preserved
- `WIDGET_API_KEY` env var must be set in Vercel
- Queries: `plaid_accounts` (balances) and `personal_expenses` (burn rate)

See `widget/README.md` for full architecture.

---

## Git Protocol

- **Commit after each phase** (not after each file)
- **NO push** unless Jimmy explicitly asks
- **Descriptive messages:** `Phase X: {what was built}`
- **Co-Author:** Include `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`

---

## Security Conventions (from 10/10 audit sweep, Mar 2026)

These patterns were established across an 8-session, 68-finding audit sweep + 2 independent re-audits. **Do not change these patterns** — they are deliberate and verified.

### Auth Patterns — Which Routes Use What

| Route Group | Auth Method | File |
|-------------|------------|------|
| Browser UI routes (kpi, skool, media, settings, dm-sync) | `requireAuth()` from `@/lib/auth-helpers` | `lib/auth-helpers.ts` |
| Admin routes (invites, run-sync) | `requireAdmin()` from `@/lib/auth-helpers` | `lib/auth-helpers.ts` |
| Cron routes (`/api/cron/*`) | `CRON_SECRET` via `secureCompare()` | `lib/security.ts` |
| Extension routes (`/api/extension/*`) | `validateExtensionAuth()` — Clerk + API key dual | `lib/extension-auth.ts` |
| Install/telemetry routes | `TELEMETRY_API_KEY` via `secureCompare()` | Each route |
| Widget route | `WIDGET_API_KEY` via `secureCompare()` | `widget/metrics/route.ts` |
| Download routes | `DOWNLOAD_TOKEN` via `secureCompare()` | Each route |
| GHL webhooks | Provider ID validation (fail-closed) + optional `GHL_WEBHOOK_SECRET` | Each webhook route |
| OAuth callback | None (public by design) | `auth/marketplace/callback` |

**Never add auth to:** webhook endpoints, OAuth callback, or cron routes (they have their own auth via CRON_SECRET).

### Security Utilities (`lib/security.ts`)

- **`secureCompare(a, b)`** — Timing-safe string comparison using `crypto.timingSafeEqual`. Handles different-length strings. Used for ALL token/secret comparisons. **Never use `===` for secrets.**
- **`safeErrorResponse(message, error, status?, headers?)`** — Returns JSON error that strips `details` in production, shows them in development. Used for ALL catch blocks. **Never return `String(error)` or `error.message` directly.**

### Encryption at Rest (`lib/encryption.ts`)

Shared AES-256-CBC encrypt/decrypt module. Used by:
- `lib/plaid-encryption.ts` — Plaid access tokens (`PLAID_ENCRYPTION_KEY`)
- `lib/ghl-encryption.ts` — GHL OAuth tokens (`GHL_ENCRYPTION_KEY`)
- `lib/cookie-encryption.ts` — Skool cookies (`COOKIE_ENCRYPTION_KEY`)

**All sensitive tokens must be encrypted before DB storage.** The `isEncrypted()` helper detects plaintext legacy values for backwards-compatible migration.

### CORS (`lib/extension-auth.ts`)

- **Extension routes:** Dynamic origin allowlist via `getCorsHeaders(request)` — allows `app.0neos.com`, `localhost:3000/3001`, and any `chrome-extension://` origin. **Never use `Access-Control-Allow-Origin: *` on routes with write operations.**
- **Static `corsHeaders` export** defaults to `app.0neos.com` (safe fallback for error responses without request context).
- **Telemetry/install routes:** No CORS headers (CLI-to-server, not browser).

### Security Headers (`next.config.ts`)

All routes get: CSP, HSTS (2yr + preload), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera/mic/geo disabled).

---

## Deliberate Decisions (DO NOT "FIX")

These look like bugs or bad practice but are intentional. Auditors will flag them. They are correct as-is.

### 1. GHL Conversation Provider webhooks have NO HMAC signatures
GHL's Conversation Provider webhook system does not support signature verification. This is a GHL platform limitation, not our bug. Security relies on: (1) provider ID validation (fail-closed), (2) optional `GHL_WEBHOOK_SECRET` header check, (3) URL secrecy. **Do not waste time trying to add HMAC verification — GHL doesn't send signatures for this webhook type.**

### 2. CSP includes `'unsafe-inline'` and `'unsafe-eval'`
Next.js requires `'unsafe-inline'` for its script injection pattern. `'unsafe-eval'` is needed for some runtime behaviors. Removing them breaks the app. The correct long-term fix is nonce-based CSP, which requires Next.js middleware changes. **Do not remove these CSP directives.**

### 3. `sync-skool-dms` has a dev-only auth bypass
```typescript
const isDev = process.env.NODE_ENV === 'development'
const bypassAuth = isDev && request.nextUrl.searchParams.get('dev') === 'true'
```
This is intentional for local development. It requires BOTH `NODE_ENV=development` AND `?dev=true` query param. Vercel always sets `NODE_ENV=production`. **This is not a security issue in production.**

### 4. `tag-skool-members` and `sync-ghl-payments` are NOT in vercel.json crons
These cron routes are designed to be triggered manually (on-demand), not on a schedule. They work when called directly with `CRON_SECRET`. **Do not add them to vercel.json.**

### 5. Dual admin check systems exist
`requireAdmin()` checks `publicMetadata.role === 'admin' | 'owner'`. The `@0ne/auth` package checks `permissions.isAdmin`. These serve different purposes — role is for 0ne Cloud admin, permissions is for per-app access control. **They are not redundant.** If consolidating, the `requireAdmin()` approach is preferred for API routes.

### 6. `@supabase/supabase-js` was fully removed (Mar 2026)
All active code uses Drizzle ORM with Neon. References to "Supabase" in SQL migration files and old product docs are historical artifacts. **Do not re-add Supabase or try to "complete" a migration that is already done.**

### 7. Drizzle `onConflictDoUpdate` must use `sql\`excluded."column"\``
In Drizzle ORM, `set: { email: contacts.email }` is a **self-reference no-op** (sets column to itself). The correct pattern for upserts is:
```typescript
import { rawSql } from '@0ne/db/server'
.onConflictDoUpdate({
  target: [table.uniqueColumn],
  set: { email: rawSql`excluded."email"` }
})
```
**This was the root cause of a critical data loss bug (GHL sync silently discarding all contact updates).**

### 8. Download routes use `fs/promises` (not Vercel Blob)
The `/api/download` and `/api/supdate/download` routes read `private/0ne.zip` via `fs.readFile`. This works on Vercel serverless (Node.js runtime, not edge) as long as the file is in the deployment bundle. Both routes have `existsSync` guards and return 503 if the file is missing. **Do not convert to Vercel Blob unless the zip exceeds the serverless bundle size limit.**

---

## Error Handling Pattern

Every API route catch block should follow this pattern:

```typescript
import { safeErrorResponse } from '@/lib/security'
import { AuthError } from '@/lib/auth-helpers'

try {
  const { userId } = await requireAuth()
  // ... route logic ...
} catch (error) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return safeErrorResponse('Descriptive message', error)
}
```

**Never:** `{ error: String(error) }`, `{ details: String(error) }`, or `{ error: error.message }`
