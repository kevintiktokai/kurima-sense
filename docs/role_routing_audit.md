# Role Routing Audit — Workstream 2 (frontend)

Design input for routing consumers vs institutional users. **Consumers experience
zero change**; institutional users get a new `/portfolio` shell.

## 1. Login / session
- `app/auth/page.tsx` — `supabase.auth.signInWithPassword()`. On success it reads
  `profiles.full_name` and `router.push('/dashboard')` (or `/onboarding` if no
  profile). **This is the redirect we extend to route by role.**
- No `middleware.ts` — all auth/redirect logic is client-side.
- `AuthProvider` (`useAuth`) exposes `{ user, session, loading, signOut }`.
- `UserProfileProvider` (`useUserProfile`) fetches the whole `profiles` row,
  including `role`, client-side from Supabase.

## 2. Routes under `app/`
`auth`, `onboarding`, `dashboard` (+ `plan`/`chat`/`fields`/`weather`/`settings`),
landing `page.tsx`, `blog`, `for-buyers|lenders|insurers`, `privacy`, `terms`,
`offline`, `pwa-status`. **All keep working for consumers.** New tree: `app/portfolio/*`.

## 3. Navigation
- `components/dashboard/Sidebar.tsx` (desktop) + `components/dashboard/MobileNav.tsx`
  (mobile bottom nav). Items are hardcoded arrays (`{id, href, icon, label}`),
  Material Symbols icons, active state via `usePathname()` (`startsWith`).
- → Portfolio gets its own `PortfolioSidebar` / `PortfolioMobileNav` mirroring
  these patterns exactly (same tokens, same active logic).

## 4. Auth/role context
- `useAuth()` → session; `useUserProfile()` → profile incl. `role`.
- `lib/api-cache.ts:getAuthHeaders()` attaches the Supabase bearer token.
- **No `useUserRole` hook yet** → this PR adds one reading the canonical backend
  `GET /me/role` (Workstream-2 backend PR), so routing uses the same role source
  the backend enforces (not just the client-cached profile row).

## 5. Visual language (must match exactly)
`globals.css`: `--ee-bg #F4F1ED`, `--ee-surface #FFFFFF`, `--ee-text #2D3A30`,
`--ee-muted #8B9D8F`, `--ee-primary #0fb885`, `--ee-sun`, `--ee-water`;
`--font-heading 'Fraunces'`, `--font-body 'Hanken Grotesk'`; `--radius-ee-lg 24px`;
`--shadow-neu`. Material Symbols loaded in `app/layout.tsx`. The portfolio shell
reuses all of these — identical fonts/colours/spacing, slightly higher density.

## 6. Data layer / tests
- SWR (`swr@^2.3.8`); pattern in `hooks/useFieldState.ts` (revalidateOnFocus:false,
  dedupingInterval, shouldRetryOnError:false).
- Tests: `npm test` → `tsx --test 'tests/**/*.test.ts'` (node:test). UI isn't
  rendered in tests; we cover the **pure routing-decision function** and
  source/config invariants.

## 7. Routing design (this PR)
- `useUserRole()` → `{ role, institutionalType, tenantName, ... }` from `/me/role`,
  cached per session. **On failure → role treated as `consumer`** (safe default;
  never lock users out).
- `RoleGuard` wraps a layout: while loading → thin skeleton; unauthenticated →
  `/auth`; role ∈ allowed → render; else `router.replace(redirectTo)`. The
  decision is a pure function `decideAccess(...)` (unit-tested).
- `app/dashboard/layout.tsx` wrapped with `allowedRoles=['consumer','admin']`,
  `redirectTo="/portfolio/today"` (admin rides with consumer for now).
- `app/portfolio/layout.tsx` wrapped with `allowedRoles=['institutional']`,
  `redirectTo="/dashboard"`; 5 tabs (Today/Fields/Growers/Alerts/Reports) with
  labelled empty-state cards (content is Workstream 4).
- Login redirect: `consumer|admin → /dashboard`, `institutional → /portfolio/today`,
  role-fetch failure → `/dashboard` + a non-blocking banner.
