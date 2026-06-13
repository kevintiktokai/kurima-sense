# Institutional side — audit + map diagnosis (read-only pass)

**Date:** 2026-06-13 · **main @** `fd63d95` (#19) · **tests:** 181/181 pass.

## TL;DR — root cause of "map not showing"

The map **code is fully present, correct, and guarded on `main`**. The map only
renders when `NEXT_PUBLIC_ARCGIS_API_KEY` is present **at build time**; when it's
absent the component intentionally renders a calm **"Map unavailable — imagery
key not configured"** card (by design, PR C). The single consistent cause is
therefore **env-config (cause c): the ArcGIS key is not set for the environment
being viewed** (NEXT_PUBLIC vars are inlined per build, so it must be set for
*Production*, not only Preview, and the project re-deployed afterwards).

**→ Fix is an env action, not a code change:** set
`NEXT_PUBLIC_ARCGIS_API_KEY` in Vercel (Production + Preview) and redeploy.
**No code changes made. No PR opened.** (I could not programmatically read the
Vercel env — that MCP call needs your approval — but the code path makes this the
only code-consistent cause; confirm by checking whether the Map view shows the
"Map unavailable" card.)

## A. Map presence — candidate causes (evidence)

| Cause | Verdict | Evidence (`origin/main`) |
|---|---|---|
| a. Toggle/component not wired (later merge dropped it) | **FALSE** | `app/portfolio/fields/page.tsx:30` `const PortfolioMap = dynamic(() => import('@/components/portfolio/PortfolioMap'), { ssr:false })`; `:187` List\|Map toggle; `:210` `<PortfolioMap priorities={visible} />`. `git log -- app/portfolio/fields/page.tsx` → last touch is `4491ac2` (the map PR itself); #19 never touched it. |
| b. Wrong env var name in code | **FALSE** | `PortfolioMap.tsx:28` `const ARCGIS_KEY = process.env.NEXT_PUBLIC_ARCGIS_API_KEY` — exact spec name, static reference (so Next inlines it). |
| c. Key absent at build → graceful fallback | **TRUE (root cause)** | `PortfolioMap.tsx:90` `if (!ARCGIS_KEY …) return;` and `:169` `if (!ARCGIS_KEY) { …"Map unavailable"… }`. Env-config, not a code bug. |
| d. Toggle hidden/broken at a breakpoint | **FALSE** | Toggle renders unconditionally in the controls block whenever `data && state !== 'empty'`; no breakpoint gating. |
| e. Merge-conflict dropped map code | **FALSE** | `PortfolioMap.tsx` + `lib/map-utils.ts` present; fields page diff clean; only commit on the component is `612b83f`. |
| f. Build/runtime error silently no-ops | **FALSE** | `next build` clean; tests 181/181; `maplibre-gl` imported in a `dynamic ssr:false` client boundary; tile endpoint is the keyed Esri URL (`PortfolioMap.tsx:99`). |

## B. Portfolio surface completeness (all present on main)

| Surface | Present | Endpoint | Intended elements |
|---|---|---|---|
| Today | ✅ | `GET /portfolio/aggregate` | pulse + worst-first priority list |
| Fields (List + **Map**) | ✅ | aggregate | roster search/filter/sort + List\|Map toggle + MapLibre/Esri map, 4 layers, popups |
| Growers + `/[id]` | ✅ | `/tenants/me/growers` | roster + detail w/ inline fields, CRUD |
| Alerts | ✅ | aggregate (derived) | health + data alerts |
| Reports | ✅ | — | intentional placeholder |
| Field detail `/[id]` | ✅ | `/field/{id}/state` + `/field/{id}/season-accumulations` | score, trend, indices, alerts, action, grower header, **season GDD+precip charts** |

## C. Integration integrity (later merges did NOT erode earlier work)

- Season accumulation charts mounted on **portfolio** field detail — ✅ (`SeasonAccumulationCharts` imported + rendered in `app/portfolio/fields/[id]/page.tsx`).
- Map popup → field detail via `routeForField(id,'portfolio') + withFrom('Map')` — ✅ (`PortfolioMap.tsx`), so back label reads "← Back to Map".
- Filters feed **both** List and Map — ✅ (`<PortfolioMap priorities={visible} />`, same `sortFields(filterFields(...))` array as the list).
- Five-tab nav highlights active tab on detail routes — ✅ (`components/portfolio/nav.ts` delegates to `isTabActive`).
- No behavioural conflict observed between merged PRs on the institutional side.

## D. Delta table

| Intended element | Present? | Evidence | Severity | Action |
|---|---|---|---|---|
| Portfolio Map renders imagery | ⚠️ only if key set | `PortfolioMap.tsx:28/169` | **env-config** | **Fix now (env): set `NEXT_PUBLIC_ARCGIS_API_KEY` in Vercel + redeploy** |
| List\|Map toggle wired | ✅ | fields page :30/187/210 | — | none |
| All other portfolio surfaces | ✅ | §B | — | none |
| Integration points (C) | ✅ | §C | — | none |
| Guard test for map presence | ✅ already exists | `tests/portfolio-map.test.ts` | — | none (already protects against silent drop) |

## Report-only backlog (do NOT action in this pass)

1. **(env-config, blocker for the map)** `NEXT_PUBLIC_ARCGIS_API_KEY` must be set
   for the viewed Vercel environment and the app redeployed. This is the map fix.
2. **(degraded-risk, low)** The existing guard test asserts the dynamic import +
   `<PortfolioMap>` usage but not the *toggle button* itself; a future merge could
   drop the "Map" button while keeping the import. Could add one assertion later.
3. **(follow-up, documented)** Consumer field editor still uses **react-leaflet**;
   unifying it onto MapLibre remains the deferred follow-up (not in scope).
4. **(future, costed)** No Sentinel NDVI raster overlay — polygons/markers are
   coloured from payload values only, by design.
5. **(process)** Other Claude sessions are merging PRs into `main` (e.g. #19);
   worth coordinating so parallel work doesn't collide with institutional code.
