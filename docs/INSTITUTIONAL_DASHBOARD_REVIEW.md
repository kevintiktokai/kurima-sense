# Institutional Dashboard — Product Audit, Architecture Review & Feature Completion

## Executive Summary

The Institutional Dashboard (`/portfolio`) had a solid analytical core — a single
`GET /portfolio/aggregate` data source feeding Today / Fields / Alerts, calm
loading/empty/error states, and grower CRUD — but it was effectively a
**read-only viewer**, not an operational tool, and its map was invisible in
production. This review closed the gap: the map is fixed (root cause found and
verified end-to-end), institutional users can now fully manage fields (edit,
assign, delete with safeguards), yield projection and soil intelligence reached
parity with the consumer app, and three entirely new enterprise capabilities
landed — **agronomist activity logging**, **user & team management with an
extensible role model**, and **field assignment with history and workload
visibility** — all on shared platform services rather than a parallel stack.

Backend: 370 tests passing (43 new). Frontend: 230 tests passing (9 new),
TypeScript clean, new code lints clean.

## Product Audit — where the dashboard had diverged

1. **Read-only surface.** The backend already tenant-scoped field PATCH/DELETE
   and yield projection (`field_scope_sql`), but the institutional UI never
   exposed them — an offtaker managing 40 growers could not fix a wrong planting
   date. Divergence was in the frontend, not the data model.
2. **Map not rendering** (root cause below).
3. **No operational model.** `tenant_members` had only owner/officer/viewer,
   no management endpoints, no assignment concept, and no professional activity
   record — nothing an agricultural company, NGO or lender actually runs teams on.
4. **Two map stacks** — react-leaflet (consumer capture) vs MapLibre GL
   (institutional analytics). Documented as intentional-for-now (draw-tools vs
   GL analytics), consolidation recommended below.
5. **Missing product voice.** No greeting/personalisation; "Today" opened
   coldly compared to the consumer dashboard's welcome section.

## GIS Improvements

**Root cause of the invisible map.** The MapLibre container was styled with
Tailwind's `absolute inset-0`. On construction MapLibre stamps its own
`maplibregl-map` class onto that element, and `maplibre-gl.css` declares
`.maplibregl-map { position: relative }` — same specificity as Tailwind's
`.absolute`, so whichever stylesheet loads later wins. When MapLibre's won, the
container lost `absolute`, collapsed to **0 px height**, and MapLibre fell back
to its 400×300 default canvas: the map mounted, fetched tiles, fired events —
and rendered invisibly.

**Fix.** Position/size moved to inline styles (`position:absolute; inset:0;
width/height:100%`), which no stylesheet ordering can override
(`components/portfolio/PortfolioMap.tsx`). Verified end-to-end in a headless
browser: full-size canvas, basemap tiles, score-coloured field markers, zoom
and attribution controls all render.

Also fixed: `npm run dev` was completely broken on Next 16 (Turbopack default
vs the PWA plugin's webpack config) — the dev script now pins `--webpack` to
match the production build.

**Future GIS recommendations.** (1) Consolidate on MapLibre GL for both
surfaces (consumer capture needs a GL draw plugin such as
`@mapbox/mapbox-gl-draw`-compatible forks); (2) district/province choropleths
from the aggregate's district dimension; (3) NDVI/soil raster overlays via
tile services (the layer-switcher architecture already anticipates this);
(4) marker clustering beyond ~500 fields.

## Features Restored (parity with consumer)

- **Field editing** — name, crop (shared `CropSearchSelect`), variety (shared
  catalogue endpoint), planting date, via the same tenant-scoped
  `PATCH /fields/{id}` the consumer uses.
- **Field deletion** — two-step, type-the-field-name confirmation; cascade
  behaviour stated in the UI.
- **Yield projection** — `YieldProjectionCard` (shared component) against the
  existing `POST /fields/{id}/yield`; projected vs potential, confidence,
  recommended next actions.
- **Soil Intelligence** — the shared `SoilProfileCard` now also mounts on the
  institutional field page.

## New Enterprise Capabilities

### Agronomist Activity Management
`field_activities` table + routes; 11 professional activity types (visit,
inspection, recommendation, fertilizer/chemical/irrigation advice, pest/disease
observation, consultation, note, other) with notes, recommendation, visit date,
optional GPS and photo URL. Rendered as the field's permanent
**Field Activity Record** timeline with inline logging; author or team manager
can correct/delete records. A tenant-wide **Team activity** feed appears on
Today.

### User & Team Management
`/portfolio/team`: roster with role, status, per-member workload (assigned
fields, 30-day activity). Owners/admins can change roles, suspend/reactivate
(suspension removes tenant context platform-wide at auth time), remove members
(auto-unassigns their fields), and invite teammates via **code-based invites**
(no email infrastructure — the code is shared out-of-band and redeemed under
consumer **Settings → Join an organisation**, which upgrades the account and
routes it into the portfolio). Role vocabulary extended to
`owner / admin / manager / agronomist / field_officer / analyst` (legacy
`officer`/`viewer` remain valid). Safeguards: no self-demotion or
self-suspension, and the last owner/admin can never be demoted, suspended or
removed.

### Field Assignment
`field_assignments` table with one active assignment per field (partial unique
index) and full history (reassignment closes the old row). Assign/reassign/
unassign from the field's Manage card; assignment history endpoint; roster
gains **Assignee filter chips** with per-member field counts (workload
visibility); Team page shows workload per member.

## Dashboard Improvements (UX)

- Personalised time-of-day greeting on Today (same voice as the consumer
  welcome section).
- Team activity card on Today — the operational pulse.
- Team added to the shared nav (desktop sidebar + mobile bottom nav, single
  source in `components/portfolio/nav.ts`, tests updated).
- All new surfaces follow the established design language: neu-surface cards,
  token-driven colours, skeleton loading, labelled empty states, friendly error
  states with retry, and mobile-responsive layouts.

## Architecture

- **Permission tiers in one place** — `auth_roles.py` module-level sets
  (`MANAGE_TEAM_ROLES`, `ASSIGN_FIELD_ROLES`, `WRITE_FIELD_ROLES`) consumed by
  `user_can_manage_team` / `user_can_assign_fields` / `user_can_modify_field`;
  adding a role is a one-line change.
- **Canonical access gate reused** — activities/assignments use the same
  `resolve_access` (403-vs-404) pattern as scouting/soil/season routes.
- **RLS-ready** — all new tables ship the `ts_*` tenant policy shape from
  migration 008; suspended-member exclusion happens at token→tenant-context
  resolution so every downstream endpoint inherits it.
- **Self-healing schema** — migration 013 is mirrored in `init_db`, so every
  environment converges on deploy without a manual step (established pattern).
- **Shared components over duplication** — `YieldProjectionCard`,
  `SoilProfileCard`, `FieldActivityTimeline` live in `components/field/` usable
  by both surfaces; the institutional edit modal reuses the consumer's
  `CropSearchSelect` and the shared `api.updateField`/`api.deleteField`;
  assignee filtering logic is pure, tested code in `lib/portfolio-utils.ts`.

## Validation

- Backend: `pytest -q` → **370 passed, 2 skipped** (43 new team/permission tests).
- Frontend: `tsc --noEmit` → **0 errors**; `npm test` → **230 passed** (9 new);
  ESLint clean on all new/modified institutional code.
- Map fix verified visually in headless Chromium (canvas size, controls,
  coloured markers).
- No consumer-surface behaviour changed except additive Settings card; nav test
  updated for the sixth tab.

## Future Recommendations

1. **Ownership transfer** workflow (deliberately excluded from the grantable
   role list).
2. **Invite auto-acceptance** by matching the JWT email claim, removing the
   manual code entry step.
3. **Scheduled visits & follow-up reminders** — `farm_tasks` already models
   dated tasks; extend with assignee + reminder delivery.
4. **Recommendation tracking** — link a recommendation activity to a later
   verification (the input-verification pipeline is the natural join).
5. **Activity photo capture** — wire `photo_url` to the existing storage flow
   used by scouting.
6. **District/province roll-ups** on the map and Reports (choropleth +
   aggregate tables).
7. **Map stack consolidation** to MapLibre GL with a draw plugin.
8. **Audit log** — management actions (role changes, deletions) currently log
   via `user_events`; promote to a first-class, queryable audit trail.
