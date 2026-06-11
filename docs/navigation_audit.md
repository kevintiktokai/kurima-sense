# Navigation connectivity — connection graph audit (Depth Sprint PR B, Step A)

Additive only: turn every cross-entity reference into a navigable link; make
detail back-links contextual + deep-link safe; verify active-tab state. No
layout, data, route, or backend changes.

## Connection graph — Screen → references → Entity → linked? → action

### Consumer
| # | Reference | Entity | Linked now? | Action |
|---|---|---|---|---|
| 1a | Overview Crop Health card — worst field's `recommended_action` | that field | **No** (text) | link the action line → `/fields/{worst.id}` (from "Overview") |
| 1b | Overview Crop Health card — Avg KurimaScore | fields list | **No** | quiet "View all fields →" → `/dashboard/fields` |
| 2 | Plan items / activities | their field | **No** — items are scoped to the *selected* field; payload carries **no per-item `field_id`** | **data-gap**: add one section-level "View field →" → selected field (from "Plan"); skip per-item links (no backend change) |
| 3 | Weather/Climate | per selected field | n/a | Climate page is field-selectable already |
| 4 | Field detail → weather summary | Climate | **n/a** — consumer field detail has **no weather section** (Status, AI insight, Trends, Scouting only) | **data-gap**: no "View climate" link (nothing references climate there) |
| 5 | Field detail → AI "Ask Follow-up" | chat w/ field context | **Yes** ✅ | already `push('/dashboard/chat?initialMessage=…&fieldId=…')`; chat reads both params. No change |
| 6 | Fields list card | field detail | partial | card click toggles **map highlight**; navigation to detail is via the per-field analyze→open buttons (`/fields/{id}`). Existing UX, left unchanged |
| 7 | Field detail back | — | `router.back()` (line 221) | **unsafe on cold deep-link** → contextual `Link` via `parseFrom` (default Fields) |

### Portfolio
| # | Reference | Entity | Linked now? | Action |
|---|---|---|---|---|
| 8 | Field detail grower-context header | grower detail | **No** (text only) | link name → `/portfolio/growers/{grower_id}` (from "Field"), when `grower_id` present |
| 9 | Grower detail field rows | field detail | **Yes** ✅ (FieldRowCard) | add `from` = grower name |
| 10 | Today / Fields / Alerts rows | field detail | **Yes** ✅ | add `from` labels (Today / Fields / Alerts) |
| 11 | Field detail back | — | hardcoded `/portfolio/today` | contextual `parseFrom` (default Today) |
| 12 | Grower detail back | — | hardcoded `/portfolio/growers` | contextual `parseFrom` (default Growers) |

## Active-tab findings

- **Portfolio nav** (`isPortfolioNavActive`) already prefix-matches
  (`pathname.startsWith(href + '/')`), so **`/portfolio/fields/{id}` → Fields**
  and **`/portfolio/growers/{id}` → Growers** are already correct ✅. We extract
  the pure `isTabActive(pathname, tabHref)` helper and keep this behaviour.
- **Consumer nav** (`MobileNav`/`Sidebar`) prefix-matches for `/dashboard/*`
  routes — correct. **`/fields/[id]` is a standalone top-level route OUTSIDE the
  dashboard shell**, so it renders **no nav bar at all** — there is no tab to
  highlight there. Documented architectural note; not a routing change in this
  additive PR.

## Back-affordance findings

- Consumer `fields/[id]`: `router.back()` → replace with `parseFrom`-driven
  `Link` (explicit href; safe on cold deep links). Logic/hooks untouched.
- Portfolio `fields/[id]`: BackLink hardcoded → `parseFrom` (default Today).
- Portfolio `growers/[id]`: BackLink hardcoded → `parseFrom` (default Growers).

## Helper surface (`lib/nav-links.ts`)

`routeForField(id, audience)`, `routeForGrower(id)`, `withFrom(href, label?,
href?)` (encodes `f`/`fh`), `parseFrom(params, fallback)` (rejects any non
same-app-relative `fh` — no protocol, no `//`, no `:` — falling back to the
default), `isTabActive(pathname, tabHref)`. All pure + unit-tested.

## Guardrails honoured

Consumer links stay in the consumer tree, portfolio links in `/portfolio/*` —
the RoleGuard boundary is never crossed. Documented data-gap skips: per-item
plan field links (#2) and field-detail→climate (#4).
