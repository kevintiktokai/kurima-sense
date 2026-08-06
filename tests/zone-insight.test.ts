// Zone diagnosis and history presentation helpers.
//
// The distinction under test is the one the feature exists for: a zone weak
// THIS season is a place to walk; a zone weak EVERY season is ground worth
// spending money on. Rendering them alike collapses that back into a colour.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    formatNdvi,
    gapLabel,
    seasonMarks,
    structuralZones,
    zoneSeverityStyle,
    zoneVerdictStyle,
    zonesNeedingAttention,
} from '../lib/zone-insight-utils'
import type { ZoneDiagnosis, ZoneTrack } from '../lib/planning-types'

const zone = (over: Partial<ZoneDiagnosis> = {}): ZoneDiagnosis => ({
    index: 0, label: 'North-East', ndvi: 0.42, gap_vs_field: 0.22,
    severity: 'problem', summary: '', causes: [], observation_count: 0,
    action: '', ...over,
})

const track = (over: Partial<ZoneTrack> = {}): ZoneTrack => ({
    index: 0, label: 'North-East', seasons_compared: 3, seasons_behind: 3,
    verdict: 'persistent', summary: '', action: '', points: [], ...over,
})

// --- Severity ----------------------------------------------------------------

test('only zones actually behind are surfaced', () => {
    assert.equal(zoneSeverityStyle('problem').surfaced, true)
    assert.equal(zoneSeverityStyle('watch').surfaced, true)
    // A healthy zone does not need the farmer's attention.
    assert.equal(zoneSeverityStyle('ok').surfaced, false)
    assert.equal(zoneSeverityStyle('unknown').surfaced, false)
})

test('an unanalysed zone is not styled as a healthy one', () => {
    assert.notEqual(zoneSeverityStyle('unknown').color, zoneSeverityStyle('ok').color)
    assert.equal(zoneSeverityStyle(null).label, 'Not analysed')
})

test('each severity has a distinct colour', () => {
    const colors = (['problem', 'watch', 'ok', 'unknown'] as const)
        .map((s) => zoneSeverityStyle(s).color)
    assert.equal(new Set(colors).size, colors.length)
})

// --- Verdict -----------------------------------------------------------------

test('only a persistent zone is marked structural', () => {
    // Structural means "the ground", which is what justifies spending money.
    assert.equal(zoneVerdictStyle('persistent').structural, true)
    assert.equal(zoneVerdictStyle('occasional').structural, false)
    assert.equal(zoneVerdictStyle('consistent').structural, false)
    assert.equal(zoneVerdictStyle('insufficient').structural, false)
})

test('too little history is not presented as a clean bill of health', () => {
    assert.equal(zoneVerdictStyle('insufficient').label, 'Too little history')
    assert.notEqual(
        zoneVerdictStyle('insufficient').color,
        zoneVerdictStyle('consistent').color
    )
})

test('an unknown verdict degrades rather than throwing', () => {
    assert.equal(zoneVerdictStyle(null).structural, false)
    assert.equal(zoneVerdictStyle(undefined).label, 'Too little history')
})

// --- Selection ---------------------------------------------------------------

test('healthy zones are not put in front of the farmer', () => {
    const zones = [
        zone({ index: 0, severity: 'problem' }),
        zone({ index: 1, severity: 'ok' }),
        zone({ index: 2, severity: 'watch' }),
        zone({ index: 3, severity: 'unknown' }),
    ]
    assert.deepEqual(zonesNeedingAttention(zones).map((z) => z.index), [0, 2])
})

test('the attention list is capped so it stays a shortlist', () => {
    // Listing every zone recreates the flat list this view exists to replace.
    const zones = Array.from({ length: 8 }, (_, i) =>
        zone({ index: i, severity: 'watch' })
    )
    assert.equal(zonesNeedingAttention(zones).length, 3)
    assert.equal(zonesNeedingAttention(zones, 5).length, 5)
})

test('selection preserves the backend worst-first ordering', () => {
    const zones = [
        zone({ index: 5, severity: 'problem' }),
        zone({ index: 2, severity: 'watch' }),
    ]
    assert.deepEqual(zonesNeedingAttention(zones).map((z) => z.index), [5, 2])
})

test('no zones means nothing to surface', () => {
    assert.deepEqual(zonesNeedingAttention([]), [])
    assert.deepEqual(zonesNeedingAttention(undefined), [])
})

test('structural zones pick out only the persistent ones', () => {
    const tracks = [
        track({ index: 0, verdict: 'persistent' }),
        track({ index: 1, verdict: 'occasional' }),
        track({ index: 2, verdict: 'consistent' }),
    ]
    assert.deepEqual(structuralZones(tracks).map((t) => t.index), [0])
    assert.deepEqual(structuralZones(undefined), [])
})

// --- Season marks ------------------------------------------------------------

test('season marks keep the oldest-first order and flag the bad ones', () => {
    const t = track({
        points: [
            { season_id: 'a', season_label: '2023/24', ndvi: 0.4, field_mean: 0.7, gap: 0.3, behind: true },
            { season_id: 'b', season_label: '2024/25', ndvi: 0.7, field_mean: 0.7, gap: 0.0, behind: false },
        ],
    })
    assert.deepEqual(seasonMarks(t), [
        { label: '2023/24', behind: true },
        { label: '2024/25', behind: false },
    ])
})

test('an unlabelled season still renders a mark', () => {
    const t = track({
        points: [{ season_id: 'a', season_label: null, ndvi: 0.4, field_mean: 0.7, gap: 0.3, behind: true }],
    })
    assert.equal(seasonMarks(t)[0].label, '—')
})

test('a track with no points yields no marks', () => {
    assert.deepEqual(seasonMarks(track({ points: [] })), [])
    assert.deepEqual(seasonMarks(undefined), [])
})

// --- Formatting --------------------------------------------------------------

test('NDVI renders to two decimals', () => {
    assert.equal(formatNdvi(0.4237), '0.42')
    assert.equal(formatNdvi(0.7), '0.70')
})

test('missing NDVI is a dash, never a zero', () => {
    // "0.00" would be a claim the crop is dead.
    assert.equal(formatNdvi(null), '—')
    assert.equal(formatNdvi(undefined), '—')
    assert.equal(formatNdvi(NaN), '—')
})

test('the gap is described in words, not a raw number', () => {
    // "0.22" means nothing to a farmer standing in a field.
    assert.equal(gapLabel(0.02), 'in line with the field')
    assert.equal(gapLabel(0.12), 'behind the rest of the field')
    assert.equal(gapLabel(0.25), 'well behind the rest of the field')
})

test('a missing gap produces no claim at all', () => {
    assert.equal(gapLabel(null), '')
    assert.equal(gapLabel(undefined), '')
})
