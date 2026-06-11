# Portfolio Today screen — pre-build audit (MVP PR 3, Step A)

## What exists

- **`app/portfolio/today/page.tsx`** (27 lines): Workstream 2 placeholder —
  `PortfolioPageHeader` ("Today") + three `EmptyStateCard`s (Priority Fields,
  Portfolio Summary, High-Severity Alerts). Entirely replaced by this PR.
- **`app/portfolio/layout.tsx`**: the institutional shell. `RoleGuard
  allowedRoles={['institutional']}` (redirect → `/dashboard`), desktop
  `PortfolioSidebar`, `PortfolioMobileNav`, sign-out header, content container
  `px-5 lg:px-8 … max-w-6xl` on the cream `--ee-bg`. Any page added under
  `/portfolio/*` (including `fields/[id]`) inherits the guard and chrome —
  no extra guard work needed.
- **Nav**: `components/portfolio/nav.ts` — `isPortfolioNavActive` uses
  `startsWith(href + '/')`, so `/portfolio/fields/{id}` correctly highlights
  the Fields tab.

## Auth + data plumbing

- **`lib/api-cache.ts` → `getAuthHeaders()`**: attaches the cached Supabase
  `access_token` as `Authorization: Bearer …`. Used by every fetcher.
- **`hooks/useUserRole.ts`**: the SWR pattern to copy — typed fetcher +
  `useSWR(url, fetcher, opts)` returning a flat result object.
  `usePortfolioAggregate` mirrors it (but with `revalidateOnFocus: true`,
  `dedupingInterval: 30000` per spec).

## Consumer field detail page (`app/fields/[id]/page.tsx`)

- **Guard**: NOT wrapped by a RoleGuard — there is no `app/fields/layout.tsx`;
  only `/dashboard/*` is guarded (`['consumer','admin']` → redirect
  `/portfolio/today`). So institutional users aren't technically blocked from
  `/fields/{id}` today, but it lives outside the portfolio shell (no sidebar,
  back goes to consumer surfaces, "Ask Follow-up" deep-links to
  `/dashboard/chat` which IS consumer-guarded).
- **Extractability**: monolithic (734 lines). The "main content" is
  interleaved with consumer-only features: localStorage scouting pins + modal,
  GeoJSON/KML/CSV export menu, Refresh Analysis (`api.analyzeField`), and an
  AI-chat CTA into the consumer route tree. Extracting a shared
  `FieldDetailView` would mean threading 6+ feature flags through it and
  touching consumer code, which this PR must not do.
- **Decision → Step E Option 2**: a focused institutional view at
  `app/portfolio/fields/[id]/page.tsx` that reuses `useFieldState`
  (`GET /field/{id}/state` — institutional tenant access already authorized by
  the Workstream 3 backend) and the same recharts KurimaScore trend pattern
  (recharts is an existing dependency). Scope: grower context header, score +
  band, trend chart, current indices, alerts, recommended action. No Plan tab,
  no AI advisory, no scouting/export. Grower name/district come from the
  portfolio aggregate (the `/field/{id}/state` payload has no grower fields —
  documented gap, no backend change).

## Backend payload (`GET /portfolio/aggregate`, backend PR 11)

Shape confirmed against `kurimasense-backend` `schemas.py` / `services/portfolio/aggregate.py`:
`tenant {id, name, institutional_type}` ·
`summary {total_fields, total_growers, total_hectares, score_distribution
{thriving strong adequate stressed distressed critical awaiting_data},
alerts_critical, alerts_high, average_kurima_score, fields_with_data,
fields_awaiting_data}` ·
`priorities[]` (worst-first; `urgency ∈ critical|high|medium|low|awaiting_data`;
`kurima_score`/`grower_*`/`district`/`days_*` nullable) · `generated_at`.
Field names carry a `DEMO_SEED: ` prefix in the demo tenant — stripped at the
hook level so the UI never renders it.

## Visual tokens (from `app/globals.css`)

Cream `--ee-bg #F4F1ED`, surface `--ee-surface #FFFFFF`, text `--ee-text
#2D3A30`, muted sage `--ee-muted #8B9D8F`, accent `--ee-primary #0fb885`,
shadows `--shadow-neu`, fonts `--font-heading` (Fraunces) / `--font-body`
(Hanken Grotesk), cards radius 24px. Band colours come from the API
(`kurima_color`); the distribution bar reuses the client's existing band
mirror (`scoreToLabel` in `lib/field-state-types.ts`) — no new hex values.

## Tests

`npm test` → `tsx --test 'tests/**/*.test.ts'` (node:test, no DOM). Pattern
from `role-routing.test.ts`: pure functions tested directly; UI checked via
source-invariant assertions. Pure helpers therefore live in
`lib/portfolio-utils.ts` (no supabase import) with an injectable-fetch
`fetchPortfolioAggregate` so the hook's data path is testable without React.
