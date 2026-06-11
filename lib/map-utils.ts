// Portfolio map — pure geo + layer/colour helpers (Depth Sprint PR C).
//
// No MapLibre import: GeoJSON conversion, bounds, and the four data-layer
// colour functions live here so they're unit-testable without a browser/GL
// context. The map component (components/portfolio/PortfolioMap.tsx) consumes
// these outputs.
//
// Stored polygon shape (confirmed live): Array<{lat, lon}>, OPEN ring (first
// vertex not repeated). GeoJSON wants [lon, lat] and a closed ring.

import type { PortfolioPriority } from '@/lib/portfolio-utils'

export type MapLayer = 'score' | 'ndvi' | 'moisture' | 'crop'
export const MAP_LAYERS: MapLayer[] = ['score', 'ndvi', 'moisture', 'crop']

export const MAP_LAYER_LABELS: Record<MapLayer, string> = {
    score: 'Score', ndvi: 'NDVI', moisture: 'Moisture', crop: 'Crop',
}

/** Grey for any field whose value for the active layer is null/missing. */
export const NULL_COLOR = '#9CA3AF'

// ---------------------------------------------------------------------------
// Feature property bag carried on every map feature
// ---------------------------------------------------------------------------

export interface FieldFeatureProps {
    field_id: string
    name: string
    grower_name: string | null
    kurima_score: number | null
    kurima_color: string | null
    urgency: string
    crop_type: string
    latest_ndvi: number | null
    latest_soil_moisture: number | null
    primary_concern: string
}

function propsOf(p: PortfolioPriority): FieldFeatureProps {
    return {
        field_id: p.field_id,
        name: p.field_name,
        grower_name: p.grower_name,
        kurima_score: p.kurima_score,
        kurima_color: p.kurima_color,
        urgency: p.urgency,
        crop_type: p.crop_type,
        latest_ndvi: p.latest_ndvi ?? null,
        latest_soil_moisture: p.latest_soil_moisture ?? null,
        primary_concern: p.primary_concern,
    }
}

// ---------------------------------------------------------------------------
// GeoJSON (minimal local types — avoids a @types/geojson dependency)
// ---------------------------------------------------------------------------

export interface PolygonFeature {
    type: 'Feature'
    geometry: { type: 'Polygon'; coordinates: number[][][] }
    properties: FieldFeatureProps
}
export interface PointFeature {
    type: 'Feature'
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: FieldFeatureProps
}
export interface FeatureCollection<F> {
    type: 'FeatureCollection'
    features: F[]
}

function ringFrom(polygon: Array<{ lat: number; lon: number }>): number[][] {
    // {lat,lon} -> [lon,lat]
    const ring = polygon
        .filter((v) => v && typeof v.lat === 'number' && typeof v.lon === 'number')
        .map((v) => [v.lon, v.lat] as [number, number])
    if (ring.length < 3) return []
    // Close the ring if the stored polygon doesn't repeat the first vertex.
    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]])
    return ring
}

/** FeatureCollection of Polygon features; fields without a usable polygon are skipped. */
export function toGeoJSON(priorities: PortfolioPriority[]): FeatureCollection<PolygonFeature> {
    const features: PolygonFeature[] = []
    for (const p of priorities) {
        const poly = p.polygon_coordinates
        if (!Array.isArray(poly) || poly.length < 3) continue
        const ring = ringFrom(poly)
        if (ring.length < 4) continue // 3 distinct + closing vertex
        features.push({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [ring] },
            properties: propsOf(p),
        })
    }
    return { type: 'FeatureCollection', features }
}

function centroidLonLat(p: PortfolioPriority): [number, number] | null {
    if (p.centroid && typeof p.centroid.lat === 'number' && typeof p.centroid.lon === 'number') {
        return [p.centroid.lon, p.centroid.lat]
    }
    // Fall back to a vertex mean if the payload omitted the centroid.
    const poly = p.polygon_coordinates
    if (Array.isArray(poly) && poly.length) {
        const pts = poly.filter((v) => v && typeof v.lat === 'number' && typeof v.lon === 'number')
        if (pts.length) {
            const lon = pts.reduce((s, v) => s + v.lon, 0) / pts.length
            const lat = pts.reduce((s, v) => s + v.lat, 0) / pts.length
            return [lon, lat]
        }
    }
    return null
}

/** FeatureCollection of Point features at field centroids (low-zoom markers). */
export function centroidFeatures(priorities: PortfolioPriority[]): FeatureCollection<PointFeature> {
    const features: PointFeature[] = []
    for (const p of priorities) {
        const c = centroidLonLat(p)
        if (!c) continue
        features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: propsOf(p) })
    }
    return { type: 'FeatureCollection', features }
}

/** [[minLon,minLat],[maxLon,maxLat]] over all geometry, or null if none. */
export function portfolioBounds(
    priorities: PortfolioPriority[],
): [[number, number], [number, number]] | null {
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
    let seen = false
    const consider = (lon: number, lat: number) => {
        seen = true
        if (lon < minLon) minLon = lon
        if (lat < minLat) minLat = lat
        if (lon > maxLon) maxLon = lon
        if (lat > maxLat) maxLat = lat
    }
    for (const p of priorities) {
        const poly = p.polygon_coordinates
        if (Array.isArray(poly)) {
            for (const v of poly) {
                if (v && typeof v.lat === 'number' && typeof v.lon === 'number') consider(v.lon, v.lat)
            }
        }
        const c = centroidLonLat(p)
        if (c) consider(c[0], c[1])
    }
    if (!seen) return null
    return [[minLon, minLat], [maxLon, maxLat]]
}

// ---------------------------------------------------------------------------
// Colour ramps
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function rgbToHex(r: number, g: number, b: number): string {
    const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
    return `#${c(r)}${c(g)}${c(b)}`
}
function lerpColor(a: string, b: string, t: number): string {
    const [ar, ag, ab] = hexToRgb(a)
    const [br, bg, bb] = hexToRgb(b)
    return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

/** Piecewise ramp across sorted [stopValue, hex] points; clamps to the ends. */
function ramp(value: number, stops: Array<[number, string]>): string {
    if (value <= stops[0][0]) return stops[0][1]
    const lastStop = stops[stops.length - 1]
    if (value >= lastStop[0]) return lastStop[1]
    for (let i = 0; i < stops.length - 1; i++) {
        const [v0, c0] = stops[i]
        const [v1, c1] = stops[i + 1]
        if (value >= v0 && value <= v1) return lerpColor(c0, c1, (value - v0) / (v1 - v0))
    }
    return lastStop[1]
}

// NDVI ramp: red -> yellow -> green over 0.2..0.8.
export const NDVI_DOMAIN: [number, number] = [0.2, 0.8]
const NDVI_STOPS: Array<[number, string]> = [
    [0.2, '#D84315'], [0.5, '#FBC02D'], [0.8, '#2E7D32'],
]

// Soil-moisture ramp: tan -> blue over 10..50 % (demo logs are %; below 10 reads
// dry/tan, above 50 saturated/blue).
export const MOISTURE_DOMAIN: [number, number] = [10, 50]
const MOISTURE_STOPS: Array<[number, string]> = [
    [10, '#C8A98A'], [50, '#5C9EAD'],
]

// Crop categorical palette — all tobacco variants share one family hue, distinct
// from the other crops.
const TOBACCO_HUE = '#8B6B3A'
const CROP_COLORS: Record<string, string> = {
    maize: '#E0A82E',
    cotton: '#6B8FA3',
    soybean: '#5A8F4E',
    soybeans: '#5A8F4E',
    groundnut: '#C2703D',
    groundnuts: '#C2703D',
    wheat: '#C9A227',
}
const CROP_DEFAULT = '#8B9D8F'

export function cropColor(cropType: string | null | undefined): string {
    if (!cropType) return NULL_COLOR
    if (cropType.startsWith('tobacco')) return TOBACCO_HUE
    return CROP_COLORS[cropType] ?? CROP_DEFAULT
}

/** Legend entries for the Crop layer (label + swatch). */
export const CROP_LEGEND: Array<{ label: string; color: string }> = [
    { label: 'Tobacco', color: TOBACCO_HUE },
    { label: 'Maize', color: CROP_COLORS.maize },
    { label: 'Cotton', color: CROP_COLORS.cotton },
    { label: 'Soybean', color: CROP_COLORS.soybean },
    { label: 'Groundnut', color: CROP_COLORS.groundnut },
]

/** Gradient + min/max labels for the index layers (NDVI / Moisture). */
export const INDEX_LEGENDS: Record<'ndvi' | 'moisture', { min: string; max: string; from: string; mid?: string; to: string }> = {
    ndvi: { min: '0.2', max: '0.8', from: '#D84315', mid: '#FBC02D', to: '#2E7D32' },
    moisture: { min: '10%', max: '50%', from: '#C8A98A', to: '#5C9EAD' },
}

/**
 * Colour for a field under the active layer. **Total** — always returns a hex
 * string; null/missing inputs (and unknown crops with no crop_type) → grey.
 */
export function colorFor(
    layer: MapLayer,
    props: Pick<FieldFeatureProps, 'kurima_color' | 'latest_ndvi' | 'latest_soil_moisture' | 'crop_type'>,
): string {
    switch (layer) {
        case 'score':
            return props.kurima_color || NULL_COLOR
        case 'ndvi':
            return props.latest_ndvi == null ? NULL_COLOR : ramp(props.latest_ndvi, NDVI_STOPS)
        case 'moisture':
            return props.latest_soil_moisture == null ? NULL_COLOR : ramp(props.latest_soil_moisture, MOISTURE_STOPS)
        case 'crop':
            return cropColor(props.crop_type)
        default:
            return NULL_COLOR
    }
}
