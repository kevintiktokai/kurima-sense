# Portfolio Fields screen — pre-build audit (MVP PR 5, Step A)

## Reuse from MVP PR 3 (Today)

- **`usePortfolioAggregate()`** — same hook, same `GET /portfolio/aggregate`.
  SWR dedupe (30s) means Today ⇄ Fields navigation shares one network call.
  No backend change; the payload already carries all 40 fields and every field
  this screen filters on.
- **`lib/portfolio-utils.ts`** — already exports the types, `humanizeCrop`,
  `stripDemoPrefix` (applied in the fetcher), `selectScreenState`, the loading/
  error/empty patterns. This PR adds the pure filter/sort/search functions here.
- **Card visuals** — Today's `PriorityCard` (accent bar in `kurima_color`,
  score chip with band label, grey "Awaiting" chip, grower bold + field name,
  meta line) is exactly the row Fields needs, minus the action footer.

## Step D decision: extract `FieldRowCard`

`PriorityCard` is small and clean, so it generalizes well. Extracting to
**`components/portfolio/FieldRowCard.tsx`** with a `variant` prop:

- `variant="priority"` — meta `district · crop · ha`, plus `primary_concern`,
  `recommended_action` (arrow), and the `Day N · observed Nd ago` footer.
  Reproduces the current Today row **pixel-for-pixel**.
- `variant="roster"` — meta `district · crop · variety · ha`, plus
  `primary_concern` only. No action, no footer (a roster, not an action list).

`PriorityList` switches to `<FieldRowCard variant="priority">`; `PriorityCard`
is removed. Today's rendering is unchanged. Today's tests reference the card by
file path (`PriorityCard.tsx`) for source invariants — those path strings are
updated to `FieldRowCard.tsx` (an import-path-only change, the sole edit Step E
permits); the behavioural assertions (links to `/portfolio/fields/`, no client
re-sort, no emojis) still hold on the extracted file.

## Filterable fields on `PortfolioPriority`

Confirmed present: `district`, `crop_type`, `urgency`, `kurima_score`,
`kurima_label`, `size_hectares`, `grower_name`, `field_name`, `variety`.
Filter dimensions: **District** (`district`), **Crop** (`crop_type`, shown
humanized), **Health** (`kurima_label` + an `'awaiting'` pseudo-band for
null-score rows). Search matches `grower_name` OR `field_name`.

## What's new for Fields

- Pure `filterFields` / `sortFields` / `deriveFilterOptions` (+ a `debounce`
  util) in `lib/portfolio-utils.ts`.
- A flat, user-ordered list (no urgency dividers; sort controls order; default
  `score_asc` = worst first, awaiting always last).
- Controls row (debounced search, multi-select District/Crop/Health dropdowns
  from `deriveFilterOptions`, sort select), active-filter chips + "Clear all",
  a "Showing n of total" line, and an empty-filter-result state distinct from
  the empty-tenant state. All component `useState` — no URL params this PR.

States (loading skeleton, error retry, empty tenant, all-awaiting) reuse the
Today patterns; in all-awaiting the roster still renders with grey chips and the
Health filter offers "Awaiting".
