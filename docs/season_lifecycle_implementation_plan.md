# Implementation Plan — Season Lifecycle, Pre-Plant Planning, History & Zone Depth

**Companion to:** `docs/farmer_growth_cycle_research.md`
**Status:** Plan for review. No implementation started.

Covers the research-doc recommendations plus four new asks: pre-plant planning,
rotation-aware crop selection, multi-season history, and deeper field subdivision.

---

## 1. The one architectural decision everything depends on

**Today, a field *is* its current season.** `fields` holds `crop_type`, `planting_date`,
`variety` and `fertilizer_history` as single-valued columns:

```sql
fields(id, user_id, name, crop_type, polygon_coordinates, size_hectares,
       health_score, planting_date, variety, fertilizer_history, created_at)
```

So when a farmer plants maize after last year's soybean, they **overwrite** the soybean
season. There is nowhere for last year to live. This single design choice blocks, directly:

| Requested feature | Why it's blocked |
|---|---|
| Multi-season history ("go back 2-3 years") | No season entity to show history *of* |
| Rotation-aware crop advice | Rotation history is exactly the thing we overwrite |
| Residue-inoculum disease risk (research §3.1) | Needs `previous_crop`, which is the same data |
| Pre-plant planning | A planned season must exist *before* it's the field's live state |
| Yield-gap attribution (research §9) | Needs a closed season to attribute against |

One change unlocks all five. **Introduce `seasons` as a first-class entity; demote `fields`
to the permanent spatial record.** This is Phase 0 and everything else sequences behind it.

```
field  (permanent: boundary, name, soil, owner — never changes between crops)
  └── season (temporal: crop, variety, planned/actual planting date, establishment,
              inputs, harvest outcome, status)
        └── observations, zones, plan items, tasks, activities
```

`daily_logs` already carries per-date NDVI/EVI/soil-moisture/SAR keyed by `field_id`, so
**historical observations survive today with no season attribution.** Backfilling
`season_id` onto existing rows by date range is straightforward and lossless.

### 1.1 Migration strategy (non-negotiable: zero farmer-visible breakage)

The `fields` columns stay in place and become a **read-through cache of the active season**,
maintained by trigger or service-layer write. Every existing endpoint and screen keeps
working unchanged while new surfaces read `seasons` directly. Deprecate the mirrored columns
only once nothing reads them — likely a later cleanup, not part of this work.

`services/field_state/aggregator.py` is the natural place to make the cutover, since it is
already the canonical single source of truth. Point it at the active season and the
contradiction-free property extends to the new surfaces for free.

---

## 2. Phase 0 — The season entity

### Schema

```sql
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  status TEXT NOT NULL DEFAULT 'planned',
    -- planned → active → harvested → closed  (also: abandoned)
  season_label TEXT,               -- '2026/27 Summer'

  crop_type TEXT NOT NULL,
  variety TEXT,
  variety_id UUID REFERENCES crop_varieties(id),

  planned_planting_date DATE,      -- the pre-plant ask: a FUTURE date
  planting_date DATE,              -- actual, set when status → active
  transplant_date DATE,
  expected_harvest_date DATE,
  harvest_date DATE,

  -- Establishment (research §2) — captured at plan time, verified at emergence
  row_spacing_cm NUMERIC(5,1),
  in_row_spacing_cm NUMERIC(5,1),
  target_population_per_ha INTEGER,
  seed_rate_kg_ha NUMERIC(6,2),
  planting_depth_cm NUMERIC(4,1),
  emergence_date DATE,
  established_population_per_ha INTEGER,   -- from the Stand Check
  emergence_uniformity TEXT,               -- 'uniform' | 'moderate' | 'poor'

  -- Rotation & residue context (research §3.1)
  previous_crop TEXT,
  tillage_practice TEXT,                   -- 'conventional' | 'minimum' | 'no_till'
  residue_management TEXT,

  yield_tonnes_per_ha NUMERIC(8,3),        -- actual, at close
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX seasons_field_status_idx ON seasons(field_id, status);
-- At most one live season per field; any number of planned/closed.
CREATE UNIQUE INDEX seasons_one_active_idx
  ON seasons(field_id) WHERE status = 'active';

ALTER TABLE daily_logs            ADD COLUMN season_id UUID REFERENCES seasons(id);
ALTER TABLE field_inputs          ADD COLUMN season_id UUID REFERENCES seasons(id);
ALTER TABLE field_activities      ADD COLUMN season_id UUID REFERENCES seasons(id);
ALTER TABLE field_section_analysis ADD COLUMN season_id UUID REFERENCES seasons(id);
```

RLS/tenancy follows the existing `fields` pattern exactly (`tenancy.py`, `arm_rls_gucs`) —
this is a new table in an established pattern, not a new security model.

### Backfill

1. One `season` per field with a `planting_date`, `status='active'`, copying
   crop/variety/dates across.
2. `daily_logs.season_id` by date ≥ that season's planting date.
3. Fields with no planting date get no season (they're unplanted) — and now have somewhere
   to put a *planned* one, which is the pre-plant feature.

### Endpoints

```
GET    /fields/{id}/seasons                 list, newest first
POST   /fields/{id}/seasons                 create a planned season
GET    /seasons/{id}
PATCH  /seasons/{id}
POST   /seasons/{id}/activate               planned → active (confirm actual planting date)
POST   /seasons/{id}/close                  harvested → closed, triggers retrospective
```

**Exit criteria:** every existing screen behaves identically; a field can hold one active
season plus any number of planned and closed ones; history queries return correctly
attributed observations.

---

## 3. Phase 1 — Pre-plant planning ("hold my hand before the field exists")

This is the new headline feature. The insight is that **the highest-leverage advice happens
before anything is in the ground**, and today the product has nothing to say until after
planting — by which point crop, variety, spacing and basal fertiliser are all locked.

### 3.1 Flow

```
Draw/select boundary
   └─ (no crop needed yet — this is the change; boundary alone is a valid state)
        ↓
  "Plan a season"
        ↓
  1. What & when     → crop + target planting window
  2. Crop advisor    → ranked crop options, rotation-aware        [§3.2]
  3. Variety advisor → ranked varieties for region/window/risk    [§3.3]
  4. Establishment   → target population → spacing in field units [§3.4]
  5. Fertiliser plan → basal + splits, costed, calendared         [§3.5]
  6. Review          → full pre-plant brief, saved as a planned season
        ↓
  Countdown to planting window; at planting, confirm actual date → activate
```

Every step is skippable with a sane default. A farmer who knows exactly what they're
planting should be able to get from boundary to planned season in under a minute; the
advisory depth is there for those who want it.

### 3.2 Crop advisor — rotation-aware

Inputs we already have or gain in Phase 0: polygon → natural region, soil profile
(`services/soil_intelligence/`), rainfall outlook (`climate_service`), **rotation history
(now queryable from `seasons`)**, and the 40+ crop profiles.

Output — a ranked list, each with an explicit reason:

> **Soybean — strongly recommended**
> You've grown maize here three seasons running. Soybean is a non-host for Grey Leaf Spot
> and Diplodia, both of which carry over in maize residue, and it fixes nitrogen for next
> season's maize. Region IIb suits it. *Trade-off: lower gross margin than maize at current
> prices.*
>
> **Maize — possible, with cost**
> A fourth consecutive maize crop means high GLS and Diplodia inoculum. If you plant it,
> budget for a preventive fungicide at V10–VT and avoid susceptible varieties (SC 637,
> SC 513). Expect ~R fungicide cost you would not carry after a rotation break.

Note this is the research doc's §3.1 finding made concrete: **the crop profiles already
encode this** (`"Rotate with soybean, groundnut, or sunflower (non-host)"`, `"Bury crop
residue by ploughing (reduces inoculum 60-80%)"`). We are surfacing knowledge we already
have, not inventing agronomy.

Implementation: new `services/planning/crop_advisor.py`. Pure and rule-driven over the crop
profiles and rotation history — **not** an LLM call for the ranking itself. The LLM writes
the *explanation prose*; the ranking must be deterministic, auditable and testable. This
matters for trust (research §3.6: farmers discount advice from anyone with a stake, and
unexplainable advice reads as a sales pitch).

### 3.3 Variety advisor

`crop_varieties` already holds `days_to_maturity`, `yield_potential_low/high`, and a
`characteristics` JSONB with disease resistance and drought tolerance. Crop profiles hold
per-disease `resistant_varieties` / `susceptible_varieties`.

Rank on: maturity length vs. remaining season from the planned date; disease resistance
weighted by *this field's* residue-inoculum risk; drought tolerance vs. region and outlook;
yield potential. Show the trade-off honestly — a long-season high-potential variety planted
late is a worse bet than a medium-season one, and that reasoning should be visible.

### 3.4 Establishment plan

The research doc's flagship, and it belongs here because **this is where spacing is actually
decided.** Compute target population from region + variety + soil + rainfall outlook
(Zimbabwe range 36,000–60,000/ha), then translate into field-executable units:

> Target **44,000 plants/ha** → **90 cm rows, one plant every 25 cm**
> Field check: 4 paces along a row should hold about 16 plants
> Plant 2 seeds per station, thin at V3
> Seed needed for your 2.4 ha: ~**26 kg**

Persist as `target_population_per_ha`, `row_spacing_cm`, `in_row_spacing_cm`,
`seed_rate_kg_ha`, `planting_depth_cm`. These become the baseline the Stand Check (Phase 2)
verifies against, and the denominator that disambiguates the KurimaScore (research §2.4).

### 3.5 Fertiliser plan — called out as "one of the most important parts"

Agreed, and the knowledge is already there and unused. `FertilizerSchedule` on every
`CropProfile` carries `basal`, `top_dress_1`, `top_dress_2`, `foliar`, `liming` and notes;
`NutrientRequirement` carries N/P/K/S/Zn/B per stage with `timing` and `scientific_basis`.
No screen renders any of it.

Generate a **costed, calendared programme** adjusted for soil profile (pH → lime need,
P-lockup below `critical_ph_low`), target population, region and expected rainfall:

| When | Product | Rate | Amount for 2.4 ha | Why |
|---|---|---|---|---|
| At planting | Compound D | 300 kg/ha | 720 kg | P for root establishment; band and cover |
| ~3–4 wks (V4–V6) | AN | 150 kg/ha | 360 kg | Split 1 — sandy soil leaches; see below |
| ~6–7 wks (V8–V10) | AN | 150 kg/ha | 360 kg | Split 2 — carries ear-size determination |
| If pH < 5.2 | Lime | per soil test | — | Below this, applied P is locked up |

The split-application logic is not decoration. The research found **29–40 kg N/ha leaching
from the top 40 cm within two weeks under heavy rainfall on Zimbabwean sandy loam**. On sand,
a single large top-dress is partly a donation to the water table. The plan should say so, in
those terms, with the rainfall forecast attached at the time of application.

Total input cost lands here too, which makes this the natural place to show expected margin
and gives the crop advisor's trade-offs real numbers.

### 3.6 Frontend

New route group `app/fields/[id]/plan-season/` as a stepper. `FieldManagement.tsx` needs the
"create field without a crop" path opened up — currently crop and planting date are captured
in the same form as the boundary. New `components/planning/` for the advisor cards.

---

## 4. Phase 2 — In-season execution (research doc Tier 1 & 2)

### 4.1 The Stand Check

Guided task fired 10–14 days after emergence. Count a measured row length, compare against
the Phase 1 target, get a decision with economics:

> Counted 31 plants where 44 were expected → **~31,000/ha against a 44,000 target (70%)**
> Gap-filling is still viable for about 5 more days.
> Replanting costs ~X in seed and 12 days of season; at this stage the projection favours
> **gap-filling the worst patches, then accepting.** Revised ceiling: 4.8 t/ha (was 6.1).

Writes `established_population_per_ha` and `emergence_uniformity`, which then feed
`compute_score`. **This is where the thin-stand/stressed-stand ambiguity resolves** — the
score gains its missing denominator.

`VisionAnalyzer` extension (stand count from photo) belongs here, but explicitly as an
*assist to* the manual count, not a replacement, until validated against manual counts in
the field. Ship the manual path first; it works offline and needs no validation.

### 4.2 Windows, not to-dos

Add to plan items: `window_opens`, `window_closes`, `irreversible`, `cost_of_missing`.
Populate from `GrowthStageRequirements` (`day_range`, `key_activities`, `risks` — already
present per stage). Rank the plan by irreversible-cost-per-day rather than date, and render
closing windows distinctly from ordinary tasks.

The three that matter most, with their research-backed costs: emergence assessment (~2-week
window, then gone), the critical weed period (4–6 weeks after emergence; weeds at 12″ = 22%
loss), and N top-dress timing relative to rain.

### 4.3 Execution quality

Capture rate, method, product and timing-relative-to-rain on the handful of high-leverage
operations, not just a completion tick. Feeds the existing calibration loop and turns
outcome data from "what happened" into "what worked".

### 4.4 Post-harvest phase

Extend the season past harvest: drying to 12.5% moisture, LGB/weevil protection, sell-vs-store
against `market_service`. Renders `harvest_moisture`, `storage_conditions` and
`post_harvest_notes` already sitting on every crop profile. 20–30% of the crop is at risk in
this window and the app currently goes quiet exactly when it opens.

---

## 5. Phase 3 — Multi-season history

**The satellite side is already solved and this is the happy surprise of the audit.**
`tools/get_crop_health.py` runs against the **Copernicus Data Space Ecosystem Statistics
API** with an arbitrary `timeRange` and `aggregationInterval: P1D`. CDSE is free, and the
Sentinel-2 archive runs to 2015. So *"go back two or three years"* needs **no new vendor, no
new contract, and no new integration** — just a wider date range on a call we already make,
plus somewhere to put the results (Phase 0).

### 5.1 Backfill

A job that, for each field with a boundary, requests NDVI/EVI history back N years and
writes `daily_logs` rows attributed to the season covering each date. Points to watch:

- **Cost/quota.** CDSE has processing-unit quotas. Backfill is bounded per field, so meter
  it, run it as a background job, and make depth configurable (start at 3 years).
- **Cloud.** `maxCloudCoverage: 80` already set; `_to_float` already handles CDSE's `"NaN"`
  for fully-clouded intervals. Sparse history is expected and should render as gaps, not
  zeros.
- **Boundary changes.** History is only valid for the current boundary. If a boundary is
  edited, either re-fetch or mark prior history as belonging to the old geometry. Worth
  deciding explicitly rather than discovering later.
- **Pre-purchase history.** A farmer's field existed before they joined. We can show them
  three years of their own field's history *on day one* — a genuinely strong onboarding
  moment, and a real differentiator.

### 5.2 What the farmer sees

Season-over-season comparison on the field page:

- NDVI curves for 2–3 seasons overlaid on a **days-after-planting** x-axis (not calendar —
  that's what makes seasons comparable).
- Per-season summary: crop, variety, planting date, establishment, peak NDVI, yield, and the
  KurimaScore trace.
- Plain-language deltas: *"Your 2025/26 maize hit peak NDVI 11 days earlier than 2024/25 and
  yielded 1.2 t/ha more. You planted 9 days earlier and got a fuller stand."*
- **Field-level trend across crops** — is this field improving or degrading over time,
  independent of what was planted?

This closes the loop back to Phase 1: history *is* the input to next season's crop advisor,
and the retrospective is what makes a farmer renew.

---

## 6. Phase 4 — Zone depth

**Partly built already.** `field_sections.py` does Sutherland–Hodgman polygon clipping into a
grid with compass names; `field_section_analysis` stores per-zone NDVI/EVI/cloud;
`section_routes.py` exposes `GET /fields/{id}/sections` and `POST .../analyze`;
`FieldZoneAnalysis.tsx` renders zones on the map with a worst-zone highlight. `MAX_GRID = 3`
(9 zones), with a good comment on why: *"beyond that zones stop being walkable guidance."*

That constraint is right and should survive — a farmer cannot act on 64 abstract squares.
Getting to "the smallest trackable unit" is therefore **not** about a finer grid. Four
changes, in order of value:

**(a) Zone-level diagnosis, not just zone-level NDVI.** Today a zone gets a number. It should
get an explanation, and the inputs for one already exist: soil profile varies within a field
(terrain provider gives slope/aspect), scouting pins have lat/lon and can be attributed to a
zone, and irrigation coverage is spatial.

> *North-East zone: NDVI 0.42 vs 0.68 field average. This zone sits lower with heavier clay
> and has been slowest to recover after rain — consistent with waterlogging rather than
> nutrition. Two scouting pins here logged yellowing 9 days ago.*

**(b) Zone history.** With Phase 0 + 3, zones become comparable across seasons. *"The
North-East corner has underperformed in all three seasons"* is a different and much more
valuable statement than *"the North-East is stressed today."* One is weather; the other is a
soil problem worth fixing, and it justifies a soil test or drainage work.

**(c) Named management zones.** Let farmers name and persist irregular zones that match how
they actually farm — "the vlei", "behind the dam", "the rocky corner" — rather than only
machine-generated grid squares. This is the real answer to "smallest trackable unit": the
unit should be *the farmer's* unit, not a geometric one. Requires a `field_zones` table with
user-drawn polygons; `field_sections.py` geometry generalises to arbitrary rings.

**(d) Zone-targeted actions.** Plan items and tasks gain an optional `zone_id`, so
recommendations become *"top-dress the North-East block first, it's 10 days behind"* rather
than a whole-field instruction.

Scheduled re-analysis is also worth adding — section analysis currently only runs when
someone presses the button, so zone data goes stale silently. `services/notifications/scheduler.py`
is the existing pattern to hang it on.

---

## 7. Sequencing & dependencies

```
Phase 0  seasons entity + backfill          ← blocks everything
   ├── Phase 1  pre-plant planning          ← needs planned seasons + rotation history
   │      └── Phase 2  in-season execution  ← Stand Check verifies Phase 1's targets
   ├── Phase 3  multi-season history        ← needs season attribution on daily_logs
   │      └── Phase 4b  zone history        ← needs both
   └── Phase 4a/c/d  zone depth             ← independent of 1-3, can run in parallel
```

**Recommended order:** Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4.

Rationale: Phase 1 is the strongest new user-facing story and Phase 0 is small, so the
combination is a fast path to something demonstrable. Phase 3 is deliberately later despite
being technically easy — history is much more compelling once seasons carry establishment
and input data, otherwise it's just NDVI squiggles. Phase 4a can be pulled forward and run in
parallel by a second workstream if there's capacity; it has no dependency on 0–3.

**Suggested first slice if you want something shippable fast:** Phase 0 + the establishment
fields + Phase 1 steps 4–5 (establishment plan + fertiliser plan). That alone gives a farmer
a costed, spaced, calendared pre-plant brief — and captures the data the rest of the system
has been missing.

---

## 8. Risks and open questions

**Data-entry burden is the main risk to the whole plan.** Every phase asks the farmer for
more. The research is explicit that unclear or heavy interfaces drive abandonment. Mitigation:
never block on any field, default aggressively from region/crop/variety, and make the
*value* visible before the ask — the confidence-and-data-gaps framing from research §3.6
("I'm 60% confident because I have no stand count") turns a demand into an invitation. This
should be treated as a design constraint on every screen, not a Phase 5 item.

**Agronomic review.** Target-population logic, fertiliser programmes and the replant
economics should be reviewed by a qualified agronomist before shipping. The generic maize
data in this plan is illustrative; the per-crop, per-region numbers need sign-off. This is
advice farmers spend real money acting on.

**Rotation history is empty on day one.** The crop advisor is weakest for exactly the new
users we most want to impress. Mitigation: let farmers enter past seasons retrospectively
during onboarding (2 minutes, high value), and pair it with the satellite backfill from
Phase 3 — which can *corroborate* what they say they planted, and is a nice demonstration of
the product's memory.

**Open questions for you:**
1. History depth — 3 years, or further? Drives CDSE quota and backfill cost.
2. Boundary edits vs. historical validity — re-fetch, or freeze old geometry?
3. Should planned seasons be shareable with institutional users (lenders/buyers want
   forward visibility of cropping intent — this may be a commercial feature, not just a
   farmer one)?
4. Fertiliser costing needs a price source. Static table, admin-maintained, or a feed?

---

## 9. What this adds up to

Today the product picks the farmer up after planting and puts them down at harvest, and
inside that window it can see a lot but not the things the farmer actually controls.

This plan extends both ends and deepens the middle: **plan before the seed is bought,
verify the establishment that sets the ceiling, track the windows that close, follow the
crop into the shed, and remember every season so next year's advice is built on this
field's own history rather than a regional average.**

The recurring theme from the research holds throughout — most of the agronomy is already
written down in `crop_profiles/`. What has been missing is a place to put the farmer's
own facts, and a season entity to hang them on.
