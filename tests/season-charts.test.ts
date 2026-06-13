// Season accumulation chart tests (Depth Sprint PR D frontend). Run: npm test.
// Pure helpers + the hook's injectable-fetch path tested directly; the chart
// component + page wiring get source-invariant checks (node:test has no DOM).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
    monthTicks, formatTickDate, formatFullDate, formatMm, formatGdd, gddCaption,
    selectChartState, type SeasonAccumulations,
} from '../lib/season-chart-utils'
import { fetchSeasonAccumulations, SeasonAccumulationsError } from '../hooks/useSeasonAccumulations'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function payload(): SeasonAccumulations {
    return {
        field_id: 'f1', crop_type: 'tobacco_flue_cured', planting_date: '2026-02-01',
        days_elapsed: 90, gdd_base_c: 10, gdd_cap_c: 30, total_gdd: 1240.5, total_precip_mm: 312.4,
        series: [
            { date: '2026-02-01', gdd: 10, gdd_cumulative: 10, precip_mm: 0, precip_cumulative: 0 },
            { date: '2026-02-15', gdd: 12, gdd_cumulative: 150, precip_mm: 5, precip_cumulative: 40 },
            { date: '2026-03-02', gdd: 14, gdd_cumulative: 420, precip_mm: 8, precip_cumulative: 120 },
            { date: '2026-04-01', gdd: 13, gdd_cumulative: 800, precip_mm: 2, precip_cumulative: 260 },
        ],
    }
}

// ---------------------------------------------------------------------------
// 1. Pure helpers
// ---------------------------------------------------------------------------

test('monthTicks picks the first series date of each calendar month', () => {
    assert.deepEqual(monthTicks(payload().series), ['2026-02-01', '2026-03-02', '2026-04-01'])
    assert.deepEqual(monthTicks([]), [])
})

test('formatMm / formatGdd / date formatters', () => {
    assert.equal(formatMm(312), '312 mm')
    assert.equal(formatMm(15.5), '15.5 mm')
    assert.equal(formatMm(null), '—')
    assert.equal(formatGdd(1240.5), '+1241 GDD')
    assert.equal(formatGdd(0), '+0 GDD')
    assert.equal(formatGdd(undefined), '—')
    assert.equal(formatTickDate('2026-02-04'), '4 Feb')
    assert.equal(formatTickDate('nope'), '—')
    assert.match(formatFullDate('2026-02-04'), /4 February 2026/)
})

test('gddCaption notes the base/cap', () => {
    assert.equal(gddCaption(10, 30), 'Base 10°C, cap 30°C since planting')
    assert.equal(gddCaption(15.6, 30), 'Base 15.6°C, cap 30°C since planting')
})

// ---------------------------------------------------------------------------
// 2. State selection (loading / data / missing-planting / error)
// ---------------------------------------------------------------------------

test('selectChartState: loading before data', () => {
    assert.equal(selectChartState({ isLoading: true, hasData: false, hasSeries: false, errorStatus: null }), 'loading')
})

test('selectChartState: data when payload has a series', () => {
    assert.equal(selectChartState({ isLoading: false, hasData: true, hasSeries: true, errorStatus: null }), 'data')
})

test('selectChartState: 422 → missing-planting (regardless of loading)', () => {
    assert.equal(selectChartState({ isLoading: false, hasData: false, hasSeries: false, errorStatus: 422 }), 'missing-planting')
    assert.equal(selectChartState({ isLoading: true, hasData: false, hasSeries: false, errorStatus: 422 }), 'missing-planting')
})

test('selectChartState: empty series (planted today) → missing-planting note', () => {
    assert.equal(selectChartState({ isLoading: false, hasData: true, hasSeries: false, errorStatus: null }), 'missing-planting')
})

test('selectChartState: other errors → error', () => {
    assert.equal(selectChartState({ isLoading: false, hasData: false, hasSeries: false, errorStatus: 500 }), 'error')
    assert.equal(selectChartState({ isLoading: false, hasData: false, hasSeries: false, errorStatus: 403 }), 'error')
})

// ---------------------------------------------------------------------------
// 3. Hook fetcher — injectable fetch, typing + error status preserved
// ---------------------------------------------------------------------------

const noHeaders = async () => ({}) as HeadersInit
const ok = (body: unknown) => (async () => ({ ok: true, status: 200, json: async () => body })) as unknown as typeof fetch
const fail = (status: number) => (async () => ({ ok: false, status, json: async () => ({}) })) as unknown as typeof fetch

test('fetchSeasonAccumulations returns typed data on success', async () => {
    const data = await fetchSeasonAccumulations('http://x/field/f1/season-accumulations', noHeaders, ok(payload()))
    assert.equal(data.field_id, 'f1')
    assert.equal(data.total_gdd, 1240.5)
    assert.equal(data.series.length, 4)
    assert.equal(data.series[0].gdd_cumulative, 10)
})

test('fetchSeasonAccumulations throws SeasonAccumulationsError carrying the status', async () => {
    await assert.rejects(
        () => fetchSeasonAccumulations('http://x', noHeaders, fail(500)),
        (e: unknown) => e instanceof SeasonAccumulationsError && (e as SeasonAccumulationsError).status === 500,
    )
    await assert.rejects(
        () => fetchSeasonAccumulations('http://x', noHeaders, fail(422)),
        (e: unknown) => (e as SeasonAccumulationsError).status === 422,
    )
})

// ---------------------------------------------------------------------------
// 4. Source invariants — wiring + per-surface branches + consumer untouched
// ---------------------------------------------------------------------------

const componentSrc = readFileSync('components/field/SeasonAccumulationCharts.tsx', 'utf8')
const utilsSrc = readFileSync('lib/season-chart-utils.ts', 'utf8')
const consumerSrc = readFileSync('app/fields/[id]/page.tsx', 'utf8')
const portfolioSrc = readFileSync('app/portfolio/fields/[id]/page.tsx', 'utf8')

test('charts are mounted on BOTH detail surfaces', () => {
    for (const src of [consumerSrc, portfolioSrc]) {
        assert.match(src, /<SeasonAccumulationCharts/)
    }
    assert.match(consumerSrc, /surface="consumer"/)
    assert.match(portfolioSrc, /surface="portfolio"/)
})

test('component uses ResponsiveContainer (PR A chart rule)', () => {
    assert.match(componentSrc, /ResponsiveContainer/)
    assert.match(componentSrc, /minHeight=\{/)
})

test('per-surface branches: consumer renders nothing on error / missing-planting', () => {
    // both the error and missing-planting branches short-circuit on consumer
    const consumerReturnsNull = componentSrc.match(/surface === 'consumer'\) return null/g) || []
    assert.ok(consumerReturnsNull.length >= 2, 'consumer must return null on both error and missing-planting')
    assert.match(componentSrc, /Add a planting date to see season weather accumulation/)
})

test('consumer field-detail logic surface is untouched (additive section only)', () => {
    for (const token of ['useFieldState', 'api.analyzeField', 'saveScoutingPin', 'handleExportGeoJSON', 'triggerAnalysis']) {
        assert.match(consumerSrc, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${token} must remain`)
    }
    // the only new coupling is the additive component import + mount
    assert.match(consumerSrc, /import \{ SeasonAccumulationCharts \}/)
})

test('no emojis in the season chart UI', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    assert.ok(!emoji.test(componentSrc) && !emoji.test(utilsSrc), 'season chart UI must not contain emojis')
})
