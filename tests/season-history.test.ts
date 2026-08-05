// Season-comparison chart helpers. The pivot is the risky part: several
// seasons share one x-axis of days-after-planting, and a season that wasn't
// observed on a given day must leave a gap rather than plot a zero — a zero
// draws a canopy collapse that never happened.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    SERIES_COLORS,
    buildChartRows,
    buildSeries,
    formatYield,
    hasComparableHistory,
    seasonSeriesLabel,
    seriesKey,
    trendStyle,
} from '../lib/season-history-utils'
import type { FieldHistory, HistoryPoint, SeasonHistory } from '../lib/planning-types'

const pt = (day: number, ndvi: number | null): HistoryPoint => ({
    date: '2026-12-01', days_after_planting: day, ndvi, evi: null,
})

const season = (over: Partial<SeasonHistory>): SeasonHistory => ({
    season_id: 's1', season_label: '2026/27', crop_type: 'Maize', variety: null,
    status: 'closed', planting_date: '2026-11-15', points: [],
    peak_ndvi: null, days_to_peak: null, mean_ndvi: null,
    observation_count: 0, peak_is_confident: true,
    target_population_per_ha: null, established_population_per_ha: null,
    yield_tonnes_per_ha: null,
    ...over,
})

const history = (seasons: SeasonHistory[]): FieldHistory => ({
    field_id: 'f1', seasons, comparisons: [], trend: 'unknown',
})

// --- Labels -----------------------------------------------------------------

test('a season label is used when present', () => {
    assert.equal(seasonSeriesLabel(season({ season_label: '2026/27 Summer' })), '2026/27 Summer')
})

test('label falls back to crop and year, then to whatever exists', () => {
    assert.equal(
        seasonSeriesLabel(season({ season_label: null, crop_type: 'Maize', planting_date: '2026-11-15' })),
        'Maize 2026'
    )
    assert.equal(
        seasonSeriesLabel(season({ season_label: null, crop_type: null, planting_date: '2026-11-15' })),
        '2026-11-15'
    )
})

test('label never comes back empty', () => {
    const s = seasonSeriesLabel(season({
        season_label: null, crop_type: null, planting_date: null, season_id: 'abcdef123',
    }))
    assert.ok(s.length > 0)
})

// --- Series -----------------------------------------------------------------

test('the newest season takes the first colour', () => {
    const series = buildSeries(history([
        season({ season_id: 'a' }), season({ season_id: 'b' }),
    ]))
    assert.equal(series[0].seasonId, 'a')
    assert.equal(series[0].color, SERIES_COLORS[0])
    assert.notEqual(series[1].color, series[0].color)
})

test('series are capped at the number of distinct colours', () => {
    const many = Array.from({ length: 9 }, (_, i) => season({ season_id: `s${i}` }))
    assert.equal(buildSeries(history(many)).length, SERIES_COLORS.length)
})

test('an unreliable peak is flagged so the legend can dim it', () => {
    const series = buildSeries(history([season({ peak_is_confident: false })]))
    assert.equal(series[0].confident, false)
})

test('no history yields no series', () => {
    assert.deepEqual(buildSeries(undefined), [])
    assert.deepEqual(buildSeries(history([])), [])
})

// --- Chart rows -------------------------------------------------------------

test('seasons share one row per crop-age bucket', () => {
    const rows = buildChartRows(history([
        season({ season_id: 'a', points: [pt(30, 0.55)] }),
        season({ season_id: 'b', points: [pt(30, 0.48)] }),
    ]))
    assert.equal(rows.length, 1)
    assert.equal(rows[0].day, 30)
    assert.equal(rows[0][seriesKey('a')], 0.55)
    assert.equal(rows[0][seriesKey('b')], 0.48)
})

test('a season with no observation in a bucket leaves a gap, not a zero', () => {
    // A zero would draw a canopy collapse that never happened.
    const rows = buildChartRows(history([
        season({ season_id: 'a', points: [pt(30, 0.55), pt(60, 0.80)] }),
        season({ season_id: 'b', points: [pt(30, 0.48)] }),
    ]))
    const day60 = rows.find((r) => r.day === 60)!
    assert.equal(day60[seriesKey('a')], 0.80)
    assert.equal(seriesKey('b') in day60, false)
})

test('nearby observations are bucketed together and averaged', () => {
    const rows = buildChartRows(history([
        season({ season_id: 'a', points: [pt(29, 0.50), pt(31, 0.60)] }),
    ]), 5)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].day, 30)
    assert.equal(rows[0][seriesKey('a')], 0.55)
})

test('rows come back in ascending crop age', () => {
    const rows = buildChartRows(history([
        season({ season_id: 'a', points: [pt(60, 0.8), pt(10, 0.2), pt(35, 0.6)] }),
    ]))
    assert.deepEqual(rows.map((r) => r.day), [10, 35, 60])
})

test('clouded observations are skipped rather than plotted as null values', () => {
    const rows = buildChartRows(history([
        season({ season_id: 'a', points: [pt(30, null), pt(60, 0.8)] }),
    ]))
    assert.equal(rows.length, 1)
    assert.equal(rows[0].day, 60)
})

test('a nonsensical bucket size does not divide by zero', () => {
    const rows = buildChartRows(history([
        season({ season_id: 'a', points: [pt(30, 0.55)] }),
    ]), 0)
    assert.equal(rows.length, 1)
    assert.ok(Number.isFinite(rows[0].day))
})

test('no history yields no rows', () => {
    assert.deepEqual(buildChartRows(undefined), [])
    assert.deepEqual(buildChartRows(history([])), [])
})

// --- Gating -----------------------------------------------------------------

test('a comparison needs two seasons that were actually observed', () => {
    // One season is a chart of itself, already covered by the in-season trend card.
    assert.equal(hasComparableHistory(history([
        season({ season_id: 'a', points: [pt(30, 0.5)] }),
    ])), false)

    assert.equal(hasComparableHistory(history([
        season({ season_id: 'a', points: [pt(30, 0.5)] }),
        season({ season_id: 'b', points: [pt(30, 0.4)] }),
    ])), true)
})

test('seasons with no usable observations do not count toward a comparison', () => {
    assert.equal(hasComparableHistory(history([
        season({ season_id: 'a', points: [pt(30, 0.5)] }),
        season({ season_id: 'b', points: [pt(30, null)] }),
        season({ season_id: 'c', points: [] }),
    ])), false)
})

test('missing history is not comparable', () => {
    assert.equal(hasComparableHistory(undefined), false)
})

// --- Trend & formatting -----------------------------------------------------

test('each trend has a distinct colour and icon', () => {
    const trends = ['improving', 'stable', 'declining', 'unknown'] as const
    const colors = trends.map((t) => trendStyle(t).color)
    assert.equal(new Set(colors).size, colors.length)
    assert.equal(trendStyle('improving').icon, 'trending_up')
})

test('an unknown trend reads as missing history, not as stable', () => {
    assert.equal(trendStyle(null).label, 'Not enough history')
    assert.notEqual(trendStyle(null).color, trendStyle('stable').color)
})

test('yield formats to one decimal, or a dash when absent', () => {
    assert.equal(formatYield(6.24), '6.2 t/ha')
    assert.equal(formatYield(5), '5 t/ha')
    assert.equal(formatYield(null), '—')
    assert.equal(formatYield(undefined), '—')
})
