# Smart Bookmark App

A production-style bookmark workspace built with Next.js App Router and Supabase.

Users sign in with Google, manage private bookmarks, and see near-realtime updates across tabs.

## Project Overview

Smart Bookmark is designed for a hiring assignment with emphasis on:

1. Clean API contract consistency
2. Secure per-user data privacy
3. Reliable realtime behavior with fallback handling
4. Operational observability endpoints (`/api/health`, `/api/status`, `/api/ready`)
5. Deployment readiness on Vercel

## Features Implemented

1. Google OAuth only authentication (no local password auth)
2. Private bookmarks per user (RLS + server-side user scoping)
3. Add bookmark (`title`, `url`)
4. Delete own bookmark
5. Cross-tab realtime updates
6. Disconnected realtime fallback polling (5s interval while disconnected)
7. Custom production-safe `not-found` page
8. Structured API error handling with request ID correlation

## Tech Stack

1. Next.js 16 (App Router, TypeScript)
2. React 19
3. Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
4. PostgreSQL (Supabase managed)
5. Tailwind CSS
6. Zod validation
7. Vitest (unit tests)

## Architecture Flow

`Google OAuth` -> `App Route/API Route` -> `Service Layer` -> `Supabase Postgres + RLS` -> `Realtime` -> `UI sync`

Detailed flow:

1. User clicks login (`signInWithOAuth`) from `/`.
2. Supabase redirects back to `/auth/callback`.
3. Callback exchanges code for session and redirects to home.
4. Home server component loads user + initial bookmarks.
5. Client UI performs CRUD via `/api/bookmarks` and `/api/bookmarks/[id]`.
6. API validates input/params, enforces rate limit, calls service methods.
7. Services query Supabase with `user_id` constraints.
8. Realtime subscription pushes change signals; UI refetches.
9. If realtime disconnects, client polling fallback keeps list fresh.

## API Response Contract

All API responses follow the same shape:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Defined in:

- `src/lib/response/formatter.ts`

## API Endpoints

1. `GET /api/bookmarks`
   - Returns current user's bookmarks
2. `POST /api/bookmarks`
   - Creates bookmark for current user
3. `DELETE /api/bookmarks/[id]`
   - Deletes bookmark if it belongs to current user
4. `GET /api/health`
   - Liveness probe (process alive)
5. `GET /api/status`
   - Runtime status + circuit state view
6. `GET /api/ready`
   - Dependency readiness probe (Supabase REST + Supabase Auth)

Notes:

1. All API routes return `Cache-Control: no-store`.
2. All API routes are wrapped in `handleRoute` for unified error mapping.

## Database Schema Overview

Defined in `supabase/schema.sql`.

`public.bookmarks` table:

1. `id uuid primary key default gen_random_uuid()`
2. `title text not null`
3. `url text not null`
4. `user_id uuid not null references auth.users(id) on delete cascade`
5. `created_at timestamptz not null default timezone('utc', now())`

Constraints:

1. `title` length between 1 and 200 (trimmed)
2. `url` length between 1 and 2048 (trimmed)

Index:

1. `(user_id, created_at desc)`

## RLS Privacy Explanation

RLS is enabled on `public.bookmarks` and policies enforce owner-only access:

1. Select own rows only (`auth.uid() = user_id`)
2. Insert only with own `user_id`
3. Delete own rows only

This is reinforced by service-layer filtering (`eq('user_id', user.id)`).

## Realtime Implementation + Degraded Polling Fallback

Realtime implementation:

1. Client subscribes to `bookmarks` table changes
2. Subscription starts after `supabase.auth.getSession()` resolves
3. Events (`INSERT/UPDATE/DELETE`) trigger refetch callback

Disconnected fallback:

1. If connection state becomes `disconnected`, hook starts polling every 5 seconds
2. Polling stops automatically when state returns to `connected`
3. Interval is cleaned up on unmount

Files:

- `src/hooks/useRealtimeBookmarks.ts`
- `src/components/bookmark-list.tsx`

## Health / Ready / Status Endpoints

1. `/api/health`
   - Liveness only (`alive`, timestamp)
2. `/api/status`
   - Uptime + dependency circuit status snapshot
3. `/api/ready`
   - Checks Supabase REST reachability
   - Checks Supabase Auth `getSession()`
   - Uses retry + timeout + circuit-breaker guard

## Rate Limiting + Request ID Logging

Rate limiting:

1. In-memory, per-IP, per-namespace limiter
2. Current route limits:
   - `bookmarks:read` = 120/min
   - `bookmarks:create` = 30/min
   - `bookmarks:delete` = 30/min

Request ID logging:

1. `handleRoute` assigns/propagates request ID (`x-request-id`)
2. Logs request start, completion, and mapped failures
3. Response includes `x-request-id`

## Logging & Monitoring

1. All API routes are wrapped by the global route handler (`handleRoute`).
2. Each API request is correlated with an `x-request-id` header.
3. Structured logs capture:
   - request start
   - endpoint invoked
   - response status and response time (`durationMs`)
   - mapped error code/status on failures
4. This makes failures traceable across retries and readiness checks, especially for dependency health investigation.

## Timeout Handling

1. External dependency checks in `/api/ready` are guarded with explicit timeout handling.
2. Supabase REST reachability and Supabase Auth `getSession()` checks are wrapped in dependency-guard retry logic.
3. Dependency checks fail fast with mapped `503` responses instead of hanging indefinitely.
4. The readiness flow uses retry + circuit state so transient outages do not block indefinitely.

## Input Validation and Payload Limits

Validation:

1. Body schema: zod `bookmarkSchema`
2. Route params schema: zod `bookmarkIdParamSchema`

Payload safety:

1. `POST /api/bookmarks` enforces `Content-Type: application/json`
2. Request body max size: 16 KB
3. Invalid JSON and oversized payloads are mapped to consistent API failures

## Data Handling & Safety

1. Bookmark payloads are schema-validated with Zod before persistence.
2. Backend enforces:
   - required fields (`title`, `url`)
   - URL format validation
   - trimmed input normalization
   - max length constraints
3. Route params (`id`) are validated before service-layer execution.
4. Malformed or invalid payloads are rejected before database writes.

## Security Headers and No-Store Caching

Configured in `next.config.ts`:

1. `X-Content-Type-Options: nosniff`
2. `X-Frame-Options: DENY`
3. `Referrer-Policy: strict-origin-when-cross-origin`
4. `Permissions-Policy: camera=(), microphone=(), geolocation=()`
5. `poweredByHeader: false`

API caching:

1. API responses are explicitly `Cache-Control: no-store`

## Circuit Breaker for Supabase Dependency

Implemented in `src/lib/http/dependency-guard.ts` and used in `/api/ready`:

1. Retry attempts: 2
2. Backoff delay: incremental from 250ms
3. Failure threshold: 3
4. Cooldown: 15s
5. If open, dependency returns mapped 503 with retry metadata

## OAuth Flow Explanation

1. Login button calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
2. Redirect target is `/auth/callback`
3. Callback route exchanges `code` for session
4. Session cookies are managed by Supabase SSR client and proxy middleware

## Setup Instructions

### 1) Supabase project setup

1. Create a Supabase project.
2. Run SQL from `supabase/schema.sql` in SQL editor.
3. Ensure Realtime publication includes `public.bookmarks`.

### 2) Google OAuth configuration

1. In Supabase: `Authentication -> Providers -> Google`.
2. Enable provider and set Google client ID/secret.
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-domain>/auth/callback`
4. Set Auth site URL for local/prod accordingly.

### 3) Environment variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required:

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4) Local development run

```bash
nvm use
npm ci
npm run dev
```

Open `http://localhost:3000`.

### 5) Production deployment (Vercel)

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add env vars in Vercel project settings.
4. Redeploy.
5. Update Supabase Auth site/redirect URLs with production domain.
6. Verify login and callback in production.

## Manual QA Checklist

Use `docs/QA-CHECKLIST.md` as the full runbook.

Minimum pre-submit checks:

1. Login with Google works
2. Bookmark create/delete works
3. Cross-tab realtime sync works
4. Privacy isolation works across different users
5. `npm run lint`, `npm run test:unit`, and `npm run build` pass

## Troubleshooting

1. **Missing public env in browser**
   - Ensure `.env.local` has both `NEXT_PUBLIC_` values.
   - Restart dev server after env changes.
2. **Realtime disconnected often**
   - Verify Supabase project is active and websocket reachable.
   - Check RLS and publication in Supabase.
   - UI polling fallback should still refresh every 5s when disconnected.
3. **OAuth callback issues**
   - Verify redirect URLs in Supabase Auth config exactly match deployed domain.
4. **503 from `/api/ready`**
   - Inspect dependency reachability and circuit state in `/api/status`.

## Known Issues

1. Supabase Realtime websocket connectivity can be blocked on some corporate/VPN networks.
2. Google OAuth callback success depends on correct Supabase Auth site URL and redirect configuration.
3. When realtime drops, polling fallback activates to keep bookmark state synchronized.

## Testing Surface

Manual smoke verification includes:

1. Valid create/delete bookmark flows with authenticated users.
2. Invalid payload rejection (bad URL, malformed JSON, missing required values).
3. Unauthorized access handling (`401` on protected API access without valid auth session).
4. Supabase dependency outage simulation via `/api/ready` checks.
5. Timeout behavior validation for dependency checks in readiness flow.

## Problems Faced and How Solved

1. **Black/blank-looking initial UI states**
   - Added clear card-based states, empty state messaging, and status panel.
2. **Realtime cross-tab delay edge cases**
   - Delayed subscription until session resolution and queued callbacks.
3. **Hydration mismatch on timestamps**
   - Removed server/client non-deterministic initial render mismatch for time values.
4. **Client env runtime crash from dynamic env key access**
   - Switched to static public env access in browser client.
5. **Submission reproducibility gaps**
   - Added schema/policy scripts and documented setup flow.

## Assumptions and Limitations

1. Rate limiting is in-memory and not distributed across replicas.
2. Only create/list/delete flows are implemented (no bookmark edit).
3. Realtime depends on Supabase Realtime publication and auth session validity.
4. Unit tests are intentionally scoped to validation + response formatter only (no E2E/integration tests).

## Realtime Degraded Mode

If Supabase Realtime websocket connectivity is unavailable
(e.g. corporate/VPN network restrictions), the client
automatically switches to a 5-second polling fallback to
maintain cross-tab bookmark consistency.
