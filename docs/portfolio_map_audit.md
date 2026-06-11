# Portfolio Map View — audit (Depth Sprint PR C frontend, Step A)

## Stored polygon shape (confirmed from a live payload)

`GET /portfolio/aggregate` → `priorities[].polygon_coordinates` is:

```json
[{"lat": -17.189546, "lon": 31.470421},
 {"lat": -17.189546, "lon": 31.472753},
 {"lat": -17.191694, "lon": 31.472753},
 {"lat": -17.191694, "lon": 31.470421}]
```

- **`Array<{ lat: number, lon: number }>`** — objects, not `[lon,lat]` pairs, not a GeoJSON ring.
- **Open ring** — the first vertex is **not** repeated as the last, so `toGeoJSON` must close it.
- GeoJSON wants **`[lon, lat]`**, so each vertex maps `{lat,lon}` → `[lon, lat]`.
- `centroid` is `{ "lat", "lon" }` (or `null`); `latest_ndvi` / `latest_soil_moisture` are floats or `null`.

## What this PR builds

- `lib/map-utils.ts` — pure GeoJSON + layer/color helpers (no MapLibre import).
- `components/portfolio/PortfolioMap.tsx` — client-only MapLibre map over Esri
  World Imagery, dynamically imported (`ssr: false`) on the Fields page.
- `app/portfolio/fields/page.tsx` — a **List | Map** segmented toggle beside the
  sort control; both views share the same `filterFields` output.

## New dependency

**`maplibre-gl`** (pin a current stable major). Used directly in a thin client
component — no `react-map-gl` wrapper. Justified: the flagship demo surface needs
vector/raster GL rendering of polygons + markers with zoom-dependent layers,
which Leaflet (already vendored for the consumer field editor) does less cleanly,
and MapLibre's raster + paint-expression model fits the four switchable data
layers. Imagery via Esri ArcGIS raster tiles, key from
`NEXT_PUBLIC_ARCGIS_API_KEY` (already set in Vercel); attribution control
crediting Esri/Maxar is required and included.

## Existing map (consumer) — reuse decision

`components/field-map.tsx` (+ `field-map-wrapper.tsx`) is the "map-highlight UX"
PR B referenced: a **react-leaflet** map (`MapContainer`/`TileLayer`/`Polygon`)
for the consumer field **editor** (draw/GPS/area), dynamically imported
`ssr:false`. It is a **different mapping engine** (Leaflet, not MapLibre) with a
draw-oriented purpose.

**Decision: ship portfolio-only.** The MapLibre `PortfolioMap` is *not* a clean
drop-in for the Leaflet consumer screen (different library, different API,
different intent), so per Step A's condition the consumer screen is left
unchanged. Unifying both surfaces on one engine is a documented **follow-up**, not
this PR. No consumer files are touched here.

## Placement & state

Map is a **view toggle on `/portfolio/fields`** (List default), not a new nav
tab — the nav stays five tabs. View choice + active layer live in **component
state only** (no URL param, no storage). Filters (search / district / crop /
band) apply identically in both views: the map receives the same
`sortFields(filterFields(...))` array the list renders.

## Zoom regime (fields are 1.5–12 ha — invisible at province zoom)

Two MapLibre layers, no JS zoom listeners: **centroid circle markers** at
`maxzoom 12`, **polygon fill + stroke** at `minzoom 12`. Colour from the active
layer via `colorFor(layer, properties)` (a total function — grey `#9CA3AF` for
null/missing). Four layers: Score (default, `kurima_color`), NDVI (red→yellow→
green over 0.2–0.8), Moisture (tan→blue; domain documented in `map-utils.ts`),
Crop (categorical; tobacco variants share a family hue).

## Guardrails honoured

No new nav tab, no URL state, no hardcoded keys (env only), no extra tile
providers, no Sentinel raster overlays (colours come from payload values only),
no clustering lib. Missing-key and empty-filter states render calm notices, never
a broken map.
