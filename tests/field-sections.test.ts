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

test('Mapbox map is gated on the token env var (fallback preserved)', () => {
    const src = readFileSync('components/field/FieldMapbox.tsx', 'utf8')
    assert.match(src, /NEXT_PUBLIC_MAPBOX_TOKEN/)
    const panel = readFileSync('components/field/FieldZoneAnalysis.tsx', 'utf8')
    // Falls back to the Leaflet map when no token.
    assert.match(panel, /hasMapboxToken \? \(/)
    assert.match(panel, /field-map/)
})

test('map offers multiple basemap styles', () => {
    const src = readFileSync('components/field/FieldMapbox.tsx', 'utf8')
    for (const style of ['satellite', 'streets', 'outdoors']) {
        assert.match(src, new RegExp(style))
    }
})
