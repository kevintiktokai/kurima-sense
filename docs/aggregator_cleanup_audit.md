# Aggregator Cleanup Audit — what's still hybrid

**Goal:** make `useFieldState` the single source of truth for every consumer
screen. Principle: **aggregator OR loading OR explicit error** — never a silent
fallback to pre-refactor logic. This is a *removal* pass; lines should net reduce.

## Field detail — `app/fields/[id]/page.tsx`

| Concern | Legacy source (before) | Aggregator source (after) |
|---|---|---|
| Legacy API calls | `api.getFields()`, `api.getFieldHistory()`, `api.generateYieldProjection()`, direct `fetch(/fields/{id}/insight)` | none — all from `fs` (header/export/scouting derive a view-model from `fs.field`) |
| NDVI value | `field.ndvi` | `fs.indices.current.ndvi` |
| NDVI label/colour | `cropThresholds` + `getNdviLabel/Color` `||` fallback | `fs.indices.current.ndvi_label / ndvi_color` |
| Soil moisture value | `field.soilMoisture` | `fs.water_balance.soil_moisture_pct` |
| Moisture label/colour | `cropThresholds` + `getMoistureLabel/Color` `||` fallback | `fs.water_balance.soil_moisture_label` + small colour map |
| Yield numbers/efficiency | `yieldData.projected_yield/yield_potential` | `fs.yield_projection.*` |
| Days since planted | `Date.now() - field.plantingDate` | `fs.season.days_since_planted` |
| Last satellite pass | `field.lastSatellitePass` | `fs.meta.as_of_satellite_pass` |
| Insight | `aiInsight` from `/fields/{id}/insight` `||` chain | `fs.kurima_score.*` only |
| Trend chart | `history` + timeline brush | `fs.indices.trend_30d` (brush/`filteredHistory` removed) |
| `cropThresholds` table (~33 lines) | present | **deleted** |
| Loading / error | rendered with legacy fallback values | explicit loading skeleton + explicit error state |

## Dashboard — `components/dashboard/Overview.tsx`
- `avgNdvi = mean(fields.ndvi)` → **AVG KurimaScore** via a new `useMultiFieldState(fieldIds)` (N capped-concurrency calls to `/field/{id}/state`; no batch endpoint exists — see Findings).
- Hard-coded "Low vigour — check field" → worst field's `kurima_score.recommended_action`.
- "No active risks" → aggregated `fs.alerts[]` across the portfolio.
- Yield efficiency → aggregated `fs.yield_projection`.

## Fields list — `components/dashboard/FieldManagement.tsx`
- `healthConfig[field.healthStatus]` map → `kurima_score.label`/`color` per field (via `useMultiFieldState`).
- Card NDVI (`field.ndvi`) / moisture (`field.soilMoisture`) → `fs.indices.current.ndvi` / `fs.water_balance.soil_moisture_pct`.

## Plan — `components/dashboard/CropPlan.tsx`
- `Confidence: {plan.confidence_score}%` → `fs.yield_projection.confidence_band (pct%)`.
- Plan items from `/fields/{id}/yield` → `fs.active_plan_items[]`; yield/days from `fs`.
- Banner above any item where `contextualized_to_current_conditions === false` or a high-severity `fs.alerts[]` exists.
- `ActivityLog.tsx`: `/ai/tasks*` is a distinct concern (manual task log) — left as-is.

## Weather — `app/dashboard/weather/page.tsx`
- Current weather → `fs.weather.current`; water balance → `fs.water_balance`; GDD → `fs.growing_degree_days`.
- Spray windows / alerts / historical have no aggregator equivalent — kept on `/climate/*` (see Findings).

## Dead-code / local interpretation tables to remove
- `cropThresholds` — only `app/fields/[id]/page.tsx` (production). **Delete.**
- Local `getNdvi*/getMoisture*` threshold branches — replace with aggregator-only.
- `healthStatus` map in `FieldManagement.tsx` — replace with `kurima_score`.
- `FieldData` legacy display fields (`ndvi`, `soilMoisture`, `healthStatus`, `lastSatellitePass`, `projected_yield`, `yield_potential`, `latestInsight`) remain in the type for create/list plumbing but are no longer the display source.

## Findings (surfaced, not fixed here)
1. **No batch endpoint.** `useMultiFieldState` issues N parallel `/field/{id}/state` calls capped at concurrency 5. A `POST /fields/state/batch` would be a backend follow-up.
2. **Aggregator does not return spray windows, weather alerts, or historical comparison.** Weather keeps `/climate/spray-window`, `/climate/alerts`, `/climate/historical` until the aggregator is extended.
3. **Aggregator `weather.next_5_days` returns up to 5 days**, the Weather screen shows 7. Extending the aggregator to 7 is a backend follow-up; the screen shows what the aggregator provides.
4. **Per-field test data:** whether two fields show identical NDVI is a function of `daily_logs` rows (backend); the centroid fix landed in the prior PR. If cards still look identical, that's a data/seed question for a separate backend investigation — not fixed here.
