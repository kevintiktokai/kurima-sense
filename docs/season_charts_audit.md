# Season accumulation charts — audit (Depth Sprint PR D frontend)

Two cumulative-curve cards — **Accumulated Precipitation** and **Growing
Degree-Days** — added to both field-detail surfaces, fed by the backend
`GET /field/{id}/season-accumulations` (PR D backend). Same recharts/token/card
treatment as the existing KurimaScore trend chart. No new deps, no emojis.

## Existing trend chart (the pattern to mirror)

Both pages render a recharts `AreaChart` inside a `neu-surface` / `--ee-surface`
card (radius 24px, `--shadow-neu`) at `ResponsiveContainer width="100%"
height="100%"` over a fixed-height parent (`h-64` consumer, `h-56` portfolio),
with `--ee-muted` axis ticks, dashed reference lines, a rounded white tooltip,
and `connectNulls`. The new charts reuse this exactly (line/area cumulative
curves), so they sit visually identical to the trend card.

## Insertion points

- **Consumer** (`app/fields/[id]/page.tsx`): an **additive** full-width row in
  the existing `lg:grid-cols-12` flow, inserted **between Row 3 (Crop Health
  Trends) and Row 4 (Field Scouting)** as a new `lg:col-span-12` block that just
  renders `<SeasonAccumulationCharts fieldId surface="consumer" />`. The
  component owns its own data hook, so the page gains **one import + one JSX
  block and nothing else** — zero changes to the page's hooks/handlers/logic, so
  the PR A/B source invariants for that file keep passing.
- **Portfolio** (`app/portfolio/fields/[id]/page.tsx`): in the **primary (left)
  column**, immediately **below the Health Trend chart** (inside the
  `space-y-5` left column of the PR A two-column grid), before the column closes.

## Error / loading presentation (matched per surface)

- **Loading**: a card with a pulsing chart-height block (mirrors the page
  skeletons; consumer page otherwise shows a full-screen loader, portfolio shows
  skeleton cards — the component's own skeleton fits both).
- **Error**:
  - *Consumer* → **render nothing** (silent absence beats a broken card on the
    primary user surface).
  - *Portfolio* → a quiet one-line retry card.
- **Missing planting date (422)**:
  - *Consumer* → nothing.
  - *Portfolio* → a calm single-line note: "Add a planting date to see season
    weather accumulation."
- **Empty series (planted today / no days yet)** → treated like no-data: nothing
  on consumer, the calm note on portfolio.

## Hook + component

- `hooks/useSeasonAccumulations.ts` — SWR, `getAuthHeaders`, typed to the
  response, `dedupingInterval: 60000`, `revalidateOnFocus: false` (historical
  data changes at most daily). Returns `{ data, isLoading, error }`.
- `components/field/SeasonAccumulationCharts.tsx` — renders the two cards from
  the payload; `ResponsiveContainer` + min-heights (PR A chart rules); x-axis as
  **sparse month ticks** (pure helper); tooltips showing date + daily &
  cumulative values; headline stats `"{total_precip_mm} mm over {days_elapsed}
  days"` and `"+{total_gdd} GDD"` with a `"Base {gdd_base_c}°C, cap {gdd_cap_c}°C
  since planting"` caption. A `surface: 'consumer' | 'portfolio'` prop drives the
  error/missing-data branch differences. Pure tick/format helpers live in
  `lib/season-chart-utils.ts` for unit testing.
