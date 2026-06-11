# Portfolio Growers screen — pre-build audit (MVP PR 6, Step A)

## Backend API (verified against `kurimasense-backend/grower_routes.py` + `schemas.py`)

Router prefix `/tenants/me/growers` (operates on the caller's primary tenant):

| Method | Path | Body | Returns | Role |
|---|---|---|---|---|
| POST | `/tenants/me/growers` | `{name, phone?, email?, coordinates?, notes?}` | `Grower` | owner/officer |
| GET | `/tenants/me/growers` | — | **bare `Grower[]`** (excludes soft-deleted) | any member |
| GET | `/tenants/me/growers/{id}` | — | `Grower` (404 if missing/deleted) | any member |
| PATCH | `/tenants/me/growers/{id}` | partial of create | `Grower` | owner/officer |
| DELETE | `/tenants/me/growers/{id}` | — | `204` (soft delete: sets `deleted_at`) | owner/officer |

`Grower = { id, tenant_id, name, phone?, email?, coordinates?, claimed_by_user_id?, created_by_user_id?, notes?, created_at, updated_at }` — matches the prompt. List is an **unwrapped array** (not `{growers: [...]}`).

**Role gate:** write routes raise `403 "Viewers cannot modify growers"`. Per spec this PR does **not** build role-gated UI — `useGrowers` mutation helpers surface 403 as a friendly "You don't have permission to modify growers" inline error. Gap noted: a viewer still sees the Add/Edit/Remove controls and only discovers the limit on submit; role-aware control hiding is deferred.

## Reuse from PR 3 / PR 5

- **`usePortfolioAggregate()`** — the priorities array carries `grower_id`, `size_hectares`, `kurima_score/label/color`. Per-grower stats (field count, total ha, worst score) are derived **client-side** by joining the growers list against these priorities — no backend change.
- **`FieldRowCard variant="roster"`** — reused as-is on the grower detail page for the grower's fields.
- **`lib/portfolio-utils.ts`** — already has `humanizeCrop`, `sortFields` (reused `score_asc` for a grower's fields), `debounce`, `scoreToLabel` (band mirror for worst-field chip), and the state patterns. This PR adds `mergeGrowerStats`, `searchGrowers`, `sortGrowersDefault`, and form validation helpers here (pure, testable).

## Auth headers

`lib/api-cache.ts → getAuthHeaders()` already returns `{ 'Content-Type': 'application/json', Authorization: 'Bearer …' }`, so POST/PATCH JSON bodies and DELETE work without extra header plumbing. Mutation helpers in `useGrowers` accept an injectable `fetch`/headers getter so they're unit-testable.

## Modal pattern

No shared modal/dialog primitive exists in the portfolio shell; the consumer field page uses an inline centered-card overlay with a `rgba(45,58,48,0.4)` backdrop + blur. This PR mirrors that pattern (tokens-only) for `GrowerForm` and the delete confirm, rather than introducing a dependency.

## Data sourcing

- Roster: `useGrowers()` (list) + `usePortfolioAggregate()` (stats join).
- Detail `/portfolio/growers/[id]`: must work on a **cold deep-link**, so it
  fetches the single grower directly via `GET /tenants/me/growers/{id}`
  (`useGrower(id)`) rather than depending on the roster being visited; fields
  come from the aggregate filtered by `grower_id`.
- After any mutation, refresh **both** the growers list and the aggregate
  (grower_name shows in field rows).
