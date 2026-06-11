# Portfolio Alerts screen — pre-build audit (MVP PR 7, Step A)

## How Alerts differs from Today

Today is the full attention surface (pulse + whole portfolio grouped by urgency).
Alerts is narrower: **only the problems**, in two categories —

1. **Field health** — fields at `critical` or `high` urgency, concern-first.
2. **Data** — operational gaps in the *monitoring*: fields with no observation
   yet (`kurima_score == null`) or stale observations
   (`days_since_observation > 7`).

Category 2 is what makes Alerts non-redundant with Today (which de-emphasizes
monitoring gaps): it answers "where is my monitoring broken right now."

## Available `PortfolioPriority` fields (confirmed, PR 3 schema)

`urgency` (`critical|high|medium|low|awaiting_data`), `primary_concern`,
`recommended_action`, `days_since_observation` (nullable), `kurima_score`/
`kurima_label`/`kurima_color` (nullable), `grower_name`, `district`,
`field_id`, `size_hectares`. Everything Alerts needs is already in the
aggregate payload — **no backend change**, and `usePortfolioAggregate` is
shared with the other tabs (SWR dedupe → zero extra network).

## Derivation (new, pure, in `lib/portfolio-utils.ts`)

`STALE_OBSERVATION_DAYS = 7`. `deriveAlerts(priorities)` →
`{ health, awaiting, stale }` with these rules:

- **health** = urgency `critical` then `high`, score ascending within each
  (ties: size desc, then field_id).
- **awaiting** = `kurima_score == null` (and not already a health alert).
- **stale** = has a score BUT `days_since_observation > 7`, OR a scored field
  whose `days_since_observation` is null (unknown age counts as stale).
- **Health precedence:** a field appears in **at most one** list, and health
  wins over stale — a critical field with old data is a *health* alert; its
  staleness is shown in the row meta, not duplicated into Data. `awaiting` and
  `stale` are mutually exclusive by definition (null vs non-null score).
- `alertCounts(derived)` → `{ health, data, total }` for the header.

## Reuse

- **`FieldRowCard variant="priority"`** for the Field-health section (concern +
  recommended action are the point). When a health row is also stale, append
  `· last observed {d}d ago` to its meta — handled with a new optional
  `metaSuffix` prop on `FieldRowCard` (additive; Today/Fields/Growers unaffected
  since they don't pass it).
- **`FieldRowCard variant="roster"`** for the Data rows (compact), with a
  `metaSuffix` of "No satellite data yet" / "Last observed {d}d ago".
- Loading/error/empty-tenant patterns and the collapsed-group affordance mirror
  Today's stable group (expand at >5 rows).

## Out of scope (per spec)

No backend change, no acknowledge/dismiss state (read-only), no push/notify, no
changes to Today/Fields/Growers/consumer routes. Reports stays a placeholder.
