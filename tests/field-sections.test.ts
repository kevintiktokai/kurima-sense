// Zone-analysis frontend logic: NDVI→colour banding and worst-zone selection.
// Pure helpers shared by the Mapbox overlay and the zone legend/list.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { zoneStyle, worstZone } from '../lib/section-colors'

test('NDVI maps to the expected vigour bands', () => {
    assert.equal(zoneStyle(0.8).band, 'excellent')
    assert.equal(zoneStyle(0.55).band, 'good')
    assert.equal(zoneStyle(0.4).band, 'moderate')
    assert.equal(zoneStyle(0.25).band, 'stressed')
    assert.equal(zoneStyle(0.1).band, 'critical')
})

test('missing NDVI is "unknown", not miscoloured as critical', () => {
    assert.equal(zoneStyle(null).band, 'unknown')
    assert.equal(zoneStyle(undefined).band, 'unknown')
    assert.equal(zoneStyle(NaN).band, 'unknown')
    // A genuinely low NDVI is critical, not unknown — the two must not collide.
    assert.notEqual(zoneStyle(0).band, 'unknown')
})

test('every band has a distinct colour', () => {
    const colors = [0.8, 0.55, 0.4, 0.25, 0.1, null].map((v) => zoneStyle(v).color)
    assert.equal(new Set(colors).size, colors.length)
})

test('worstZone picks the lowest-NDVI analyzed zone', () => {
    const zones = [
        { label: 'North-West', ndvi: 0.7 },
        { label: 'North-East', ndvi: 0.31 },
        { label: 'South-West', ndvi: 0.55 },
        { label: 'South-East', ndvi: null },
    ]
    assert.equal(worstZone(zones)?.label, 'North-East')
})

test('worstZone returns null when nothing is analyzed yet', () => {
    assert.equal(worstZone([{ label: 'A', ndvi: null }, { label: 'B', ndvi: null }]), null)
    assert.equal(worstZone([]), null)
})

// --- Source invariants -------------------------------------------------------

test('Mapbox map is gated on a VALIDATED token (fallback preserved)', () => {
    // The gate moved from a bare `!!process.env.NEXT_PUBLIC_MAPBOX_TOKEN` to
    // lib/mapbox, which also rejects tokens mapbox-gl would throw on (sk.*).
    // See tests/mapbox-token.test.ts for the incident this covers.
    const src = readFileSync('components/field/FieldMapbox.tsx', 'utf8')
    assert.match(src, /import \{ MAPBOX_TOKEN, MAPBOX_ENABLED \} from '@\/lib\/mapbox'/)
    const panel = readFileSync('components/field/FieldZoneAnalysis.tsx', 'utf8')
    // Falls back to the Leaflet map with no usable token — or if Mapbox fails
    // to start despite one.
    assert.match(panel, /const useMapbox = MAPBOX_ENABLED && !mapboxFailed/)
    assert.match(panel, /useMapbox \? \(/)
    assert.match(panel, /field-map/)
})

test('map offers multiple basemap styles', () => {
    const src = readFileSync('components/field/FieldMapbox.tsx', 'utf8')
    for (const style of ['satellite', 'streets', 'outdoors']) {
        assert.match(src, new RegExp(style))
    }
})

// --- Empty states: never render nothing ------------------------------------
// A field with no mapped boundary used to hide the whole map card, which reads
// as "the map feature is broken" (the July 2026 "Mapbox isn't working" report —
// the account simply had no fields/boundaries).

test('field page always renders the zone card (no silent hiding)', () => {
    const page = readFileSync('app/fields/[id]/page.tsx', 'utf8')
    assert.match(page, /<FieldZoneAnalysis/)
    // The old gate `field?.coordinates && field.coordinates.length >= 3 && (`
    // must be gone — the card explains a missing boundary itself.
    assert.doesNotMatch(page, /coordinates\.length >= 3 && \(/)
})

test('zone card explains a missing boundary and links to mapping', () => {
    const src = readFileSync('components/field/FieldZoneAnalysis.tsx', 'utf8')
    assert.match(src, /no mapped boundary yet/)
    assert.match(src, /Map this boundary/)
    assert.match(src, /href="\/dashboard\/fields"/)
})

test('dashboard shows an actionable CTA when the account has no fields', () => {
    const src = readFileSync('components/dashboard/Overview.tsx', 'utf8')
    assert.match(src, /Add your first field/)
    // Must be a real link to the field-creation screen, not just prose...
    assert.match(src, /href="\/dashboard\/fields"/)
    // ...and must not fire during loading or an outage (that's the error state's job).
    assert.match(src, /activeFieldsCount === 0 && !dataLoading && !backendError/)
})
