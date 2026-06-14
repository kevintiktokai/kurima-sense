// Portfolio map tests (Depth Sprint PR C frontend). Run: npm test.
// Pure geo + colour helpers tested directly; the GL component + page wiring get
// source-invariant checks (node:test has no DOM/WebGL).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
    toGeoJSON,
    centroidFeatures,
    portfolioBounds,
    colorFor,
    cropColor,
    NULL_COLOR,
    MAP_LAYERS,
    NDVI_DOMAIN,
    MOISTURE_DOMAIN,
} from '../lib/map-utils'
import type { PortfolioPriority } from '../lib/portfolio-utils'

// A field fixture; polygon copied from a live payload shape (Array<{lat,lon}>,
// open ring).
function field(id: string, p: Partial<PortfolioPriority> = {}): PortfolioPriority {
    return {
        field_id: id, field_name: `F${id}`, grower_id: 'g', grower_name: 'Grower',
        district: 'Bindura', natural_region: 'II', crop_type: 'tobacco_flue_cured', variety: 'KRK26',
        size_hectares: 6, kurima_score: 50, kurima_label: 'Adequate', kurima_color: '#FBC02D',
        primary_concern: 'c', recommended_action: 'a', urgency: 'medium',
        days_since_observation: 2, planting_date: null, days_since_planting: null,
        polygon_coordinates: [
            { lat: -17.189546, lon: 31.470421 },
            { lat: -17.189546, lon: 31.472753 },
            { lat: -17.191694, lon: 31.472753 },
            { lat: -17.191694, lon: 31.470421 },
        ],
        centroid: { lat: -17.19062, lon: 31.471587 },
        latest_ndvi: 0.5, latest_soil_moisture: 30,
        ...p,
    }
}

// ---------------------------------------------------------------------------
// toGeoJSON
// ---------------------------------------------------------------------------

test('toGeoJSON converts the real stored shape to [lon,lat] and closes the ring', () => {
    const fc = toGeoJSON([field('a')])
    assert.equal(fc.type, 'FeatureCollection')
    assert.equal(fc.features.length, 1)
    const ring = fc.features[0].geometry.coordinates[0]
    // 4 stored vertices + 1 closing vertex
    assert.equal(ring.length, 5)
    // [lon, lat] order — first coord is the longitude (~31), not the latitude (~-17)
    assert.equal(ring[0][0], 31.470421)
    assert.equal(ring[0][1], -17.189546)
    // ring closed: last === first
    assert.deepEqual(ring[ring.length - 1], ring[0])
})

test('toGeoJSON carries through the needed properties', () => {
    const f = toGeoJSON([field('a', { grower_name: 'Tariro', kurima_score: 28, kurima_color: '#D84315' })]).features[0]
    const pr = f.properties
    assert.equal(pr.field_id, 'a')
    assert.equal(pr.grower_name, 'Tariro')
    assert.equal(pr.kurima_score, 28)
    assert.equal(pr.kurima_color, '#D84315')
    assert.equal(pr.crop_type, 'tobacco_flue_cured')
    assert.equal(pr.latest_ndvi, 0.5)
    assert.equal(pr.latest_soil_moisture, 30)
})

test('toGeoJSON skips fields without a usable polygon', () => {
    assert.equal(toGeoJSON([field('a', { polygon_coordinates: null })]).features.length, 0)
    assert.equal(toGeoJSON([field('a', { polygon_coordinates: [] })]).features.length, 0)
    assert.equal(toGeoJSON([field('a', { polygon_coordinates: [{ lat: -17, lon: 31 }, { lat: -17, lon: 31.1 }] })]).features.length, 0) // <3
})

test('toGeoJSON does not double-close an already-closed ring', () => {
    const closed = [
        { lat: -17.0, lon: 31.0 }, { lat: -17.0, lon: 31.1 },
        { lat: -17.1, lon: 31.1 }, { lat: -17.0, lon: 31.0 },
    ]
    const ring = toGeoJSON([field('a', { polygon_coordinates: closed })]).features[0].geometry.coordinates[0]
    assert.equal(ring.length, 4) // unchanged — already closed
})

// ---------------------------------------------------------------------------
// centroidFeatures + bounds
// ---------------------------------------------------------------------------

test('centroidFeatures uses the payload centroid as [lon,lat]', () => {
    const pts = centroidFeatures([field('a')])
    assert.equal(pts.features.length, 1)
    assert.deepEqual(pts.features[0].geometry.coordinates, [31.471587, -17.19062])
})

test('centroidFeatures falls back to a vertex mean when centroid missing', () => {
    const pts = centroidFeatures([field('a', { centroid: null })])
    const [lon, lat] = pts.features[0].geometry.coordinates
    assert.ok(Math.abs(lon - 31.471587) < 1e-3)
    assert.ok(Math.abs(lat - -17.19062) < 1e-3)
})

test('portfolioBounds spans all geometry; null when none', () => {
    const b = portfolioBounds([
        field('a', { polygon_coordinates: [{ lat: -17.2, lon: 31.4 }, { lat: -17.2, lon: 31.5 }, { lat: -17.3, lon: 31.5 }], centroid: null }),
        field('b', { polygon_coordinates: [{ lat: -17.0, lon: 31.0 }, { lat: -17.0, lon: 31.1 }, { lat: -17.1, lon: 31.1 }], centroid: null }),
    ])
    assert.ok(b)
    const [[minLon, minLat], [maxLon, maxLat]] = b!
    assert.equal(minLon, 31.0)
    assert.equal(maxLon, 31.5)
    assert.equal(minLat, -17.3)
    assert.equal(maxLat, -17.0)
    assert.equal(portfolioBounds([field('x', { polygon_coordinates: null, centroid: null })]), null)
})

// ---------------------------------------------------------------------------
// colorFor — total function across every layer × {value, boundary, null}
// ---------------------------------------------------------------------------

const baseProps = { kurima_color: '#FBC02D', latest_ndvi: 0.5, latest_soil_moisture: 30, crop_type: 'tobacco_flue_cured' }

test('colorFor: score layer uses kurima_color, grey when null', () => {
    assert.equal(colorFor('score', { ...baseProps }), '#FBC02D')
    assert.equal(colorFor('score', { ...baseProps, kurima_color: null }), NULL_COLOR)
})

test('colorFor: ndvi ramp incl. boundaries + null', () => {
    assert.equal(colorFor('ndvi', { ...baseProps, latest_ndvi: NDVI_DOMAIN[0] }), '#D84315') // low → red
    assert.equal(colorFor('ndvi', { ...baseProps, latest_ndvi: NDVI_DOMAIN[1] }), '#2E7D32') // high → green
    assert.equal(colorFor('ndvi', { ...baseProps, latest_ndvi: 0.1 }), '#D84315') // clamped below
    assert.equal(colorFor('ndvi', { ...baseProps, latest_ndvi: 0.9 }), '#2E7D32') // clamped above
    assert.equal(colorFor('ndvi', { ...baseProps, latest_ndvi: null }), NULL_COLOR)
    // a mid value is a real hex, not grey/undefined
    const mid = colorFor('ndvi', { ...baseProps, latest_ndvi: 0.5 })
    assert.match(mid, /^#[0-9a-fA-F]{6}$/)
    assert.notEqual(mid, NULL_COLOR)
})

test('colorFor: moisture ramp incl. boundaries + null', () => {
    assert.equal(colorFor('moisture', { ...baseProps, latest_soil_moisture: MOISTURE_DOMAIN[0] }), '#C8A98A')
    assert.equal(colorFor('moisture', { ...baseProps, latest_soil_moisture: MOISTURE_DOMAIN[1] }), '#5C9EAD')
    assert.equal(colorFor('moisture', { ...baseProps, latest_soil_moisture: null }), NULL_COLOR)
    assert.match(colorFor('moisture', { ...baseProps, latest_soil_moisture: 30 }), /^#[0-9a-fA-F]{6}$/)
})

test('colorFor: crop layer + grey when crop_type missing', () => {
    assert.match(colorFor('crop', { ...baseProps }), /^#[0-9a-fA-F]{6}$/)
    assert.equal(colorFor('crop', { ...baseProps, crop_type: '' }), NULL_COLOR)
})

test('colorFor is total — always a 6-digit hex for every layer', () => {
    for (const layer of MAP_LAYERS) {
        const c = colorFor(layer, { kurima_color: null, latest_ndvi: null, latest_soil_moisture: null, crop_type: '' })
        assert.match(c, /^#[0-9a-fA-F]{6}$/, `${layer} null → hex`)
    }
})

// ---------------------------------------------------------------------------
// crop palette: tobacco family consistent, distinct from others
// ---------------------------------------------------------------------------

test('crop palette: tobacco variants share a family hue, distinct from other crops', () => {
    const flue = cropColor('tobacco_flue_cured')
    const burley = cropColor('tobacco_burley')
    assert.equal(flue, burley) // same family hue
    for (const other of ['maize', 'cotton', 'soybean', 'groundnut']) {
        assert.notEqual(cropColor(other), flue, `${other} must differ from tobacco`)
    }
    // the non-tobacco crops are mutually distinct too
    const others = ['maize', 'cotton', 'soybean', 'groundnut'].map(cropColor)
    assert.equal(new Set(others).size, others.length)
})

// ---------------------------------------------------------------------------
// Source invariants — component + page wiring
// ---------------------------------------------------------------------------

const mapSrc = readFileSync('components/portfolio/PortfolioMap.tsx', 'utf8')
const pageSrc = readFileSync('app/portfolio/fields/page.tsx', 'utf8')

test('map component reads the imagery key from env with a graceful-missing branch', () => {
    assert.match(mapSrc, /process\.env\.NEXT_PUBLIC_ARCGIS_API_KEY/)
    assert.match(mapSrc, /Map unavailable/)
    assert.ok(!/token=[A-Za-z0-9_-]{8,}/.test(mapSrc), 'no hardcoded token')
})

test('map uses the keyed Esri endpoint and an attribution control', () => {
    assert.match(mapSrc, /ibasemaps-api\.arcgis\.com.+World_Imagery/s)
    assert.match(mapSrc, /AttributionControl/)
    assert.match(mapSrc, /Esri/)
})

test('map popup links to field detail via routeForField + from param', () => {
    assert.match(mapSrc, /routeForField\(.*'portfolio'\)/)
    assert.match(mapSrc, /withFrom\(.*'Map'/)
})

test('zoom regime: two layers split at zoom 12 (markers vs polygons)', () => {
    assert.match(mapSrc, /minzoom: ZOOM_SPLIT/)
    assert.match(mapSrc, /maxzoom: ZOOM_SPLIT/)
})

test('page dynamically imports the map with ssr:false and feeds it filtered priorities', () => {
    assert.match(pageSrc, /dynamic\(\s*\(\)\s*=>\s*import\('@\/components\/portfolio\/PortfolioMap'\)/)
    assert.match(pageSrc, /ssr:\s*false/)
    // the same filtered+sorted `visible` array the list uses is passed to the map
    assert.match(pageSrc, /<PortfolioMap priorities=\{visible\}/)
    assert.match(pageSrc, /filterFields\(/)
})

test('no emojis in the map UI', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    assert.ok(!emoji.test(mapSrc), 'map must not contain emojis')
})

test('map resizes the GL canvas to its container (blank-canvas guard)', () => {
    // The map mounts via the List→Map toggle into a viewport-sized container,
    // so the GL canvas must be resized once the container is laid out, else it
    // renders blank. A ResizeObserver + map.resize() keep canvas == container.
    assert.match(mapSrc, /new ResizeObserver\(\s*\(\)\s*=>\s*map\.resize\(\)\s*\)/)
    assert.match(mapSrc, /\.observe\(containerRef\.current\)/)
    assert.match(mapSrc, /map\.resize\(\)/)
    // and the observer is torn down with the map
    assert.match(mapSrc, /ro\.disconnect\(\)/)
})
