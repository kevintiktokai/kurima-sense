# Responsive audit — tablet + desktop pass (Depth Sprint PR A, Step A)

Purely presentational. Mobile must stay pixel-identical. Breakpoints in use:
Tailwind defaults — `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Test widths:
**768 (iPad portrait), 1024 (iPad landscape), 1280, 1440 (laptop)**.

## Current approach (findings)

- **Root** (`app/layout.tsx`): viewport already sets `viewportFit: "cover"` ✅ —
  `env(safe-area-inset-*)` works in the installed PWA. No change needed there.
- **Dashboard shell** (`app/dashboard/layout.tsx`): `<Sidebar className="hidden
  lg:flex">` + `<main>` with `p-4 sm:p-6 lg:p-10` and a `max-w-[1600px] mx-auto`
  child wrapper. Bottom `MobileNav` is `lg:hidden`. **1600px is too wide** — at
  1440 content sprawls edge-to-edge; pages set no inner max-width of their own.
- **Portfolio shell** (`app/portfolio/layout.tsx`): `Sidebar hidden lg:flex`,
  content wrapper `px-5 lg:px-8`, and each page self-centers at
  `max-w-[800px] mx-auto`. Already reading-width; just bespoke per page.
- **Bottom navs**: consumer `MobileNav` centers its bar (`max-w-md mx-auto`) but
  has no `safe-area-inset-bottom`; `PortfolioMobileNav` is full-width
  `justify-around` with no max-width and no safe-area. Both `lg:hidden`.
- **Charts**: every recharts instance (field detail, weather, portfolio detail)
  already uses `ResponsiveContainer` with a fixed-height parent ✅ — they resize
  with width/orientation. No fixed numeric chart `width` props found.
- **Fixed widths > 400px**: `auth` decorative blur blobs `w-[500px]` (×2,
  `pointer-events-none`, clipped by `overflow-hidden` — harmless, justified).
  `plan` has `w-[170px]`/`w-[220px]` control widths (fit small screens; fine).
  No `100vw` usages anywhere. No `overflow-x` offenders besides intended
  `scrollbar-hide` horizontal strips (market ticker, chips).

## Per-screen failure modes & fix

| Screen | At 1024 / 1440 | Fix |
|---|---|---|
| `dashboard` (Overview) | grid sprawls to 1600px | wrap in `PageContainer variant="wide"` (max-w-5xl) |
| `dashboard/fields` (FieldManagement) | list/cards sprawl | `PageContainer wide` |
| `dashboard/plan` | content sprawls | `PageContainer wide` (calendar benefits from width) |
| `dashboard/weather` | grids ok but full-bleed | `PageContainer wide`; charts already responsive |
| `dashboard/chat` | message column + input stretch | `PageContainer reading`; input bar `safe-pb` |
| `dashboard/settings` | already `max-w-2xl` island | `PageContainer reading` (normalize) |
| `fields/[id]` (consumer, 734-line) | full-bleed at 1440; 12-col grid all `col-span-12` | `PageContainer wide`; 2-col lg arrangement noted below |
| `auth` | centered card already; fine | `PageContainer reading` around the card |
| `portfolio/today` | reading-width already | normalize to `PageContainer reading` |
| `portfolio/fields` · `growers` · `growers/[id]` · `alerts` | reading-width already | normalize to `PageContainer reading` |
| `portfolio/fields/[id]` | single-column reading | `PageContainer reading`; 2-col lg (60/40) |
| `portfolio/reports` | placeholder | `PageContainer reading` |
| Bottom navs | no safe-area; portfolio one un-centered | `safe-pb` + center within max-width |

## Field-detail 2-column (Step C) decisions

- **Portfolio field detail** (`portfolio/fields/[id]`, ours): clean to split —
  score + trend + concerns in the primary column (~62%), the current-indices
  snapshot + grower context in the secondary (~38%) at `lg`. Done.
- **Consumer field detail** (`fields/[id]`, 734 lines): the rows are designed
  full-bleed — the Status card carries its own 4-up inner grid, the AI-insight
  banner and the trend chart are full-width by design. Forcing a 60/40 split
  would compress the Status card's internal grid and squeeze the chart awkwardly.
  Per Step C's escape hatch this is a **documented exception**: we cap the page
  width (`PageContainer wide`) so it no longer sprawls, and leave the existing
  `lg:grid-cols-12` rows full-width. No logic touched.

## Out of scope (separately-designed layouts, not product shell)

Marketing/landing (`/`, `/for-buyers|insurers|lenders`, `/blog/*`), legal
(`/privacy`, `/terms`), and utility (`/offline`, `/onboarding`, `/pwa-status`)
pages have their own full-bleed hero/section layouts; wrapping them in a reading
container would harm them. Left unchanged.

## PageContainer contract

Adds **max-width + centering + safe-area horizontal insets only** — no base
mobile padding (existing layout padding is preserved, so mobile is pixel-
identical). Variants: `reading` (`md:max-w-2xl lg:max-w-3xl`) for single-column
screens, `wide` (`lg:max-w-5xl`) for multi-column. Safe-area via `safe-x`
utility (`env()` → 0 in portrait, the notch inset in landscape).
