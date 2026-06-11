// Portfolio Fields screen tests (MVP PR 5). Run with: npm test (tsx --test).
// Pure filter/sort/search/options logic tested directly; the screen gets
// source-invariant checks (node:test has no DOM).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
    filterFields,
    sortFields,
    deriveFilterOptions,
    isFilterActive,
    debounce,
    AWAITING_BAND,
    DEFAULT_FIELDS_FILTER,
    type FieldsFilter,
    type PortfolioPriority,
} from '../lib/portfolio-utils'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function field(id: string, p: Partial<PortfolioPriority> = {}): PortfolioPriority {
    return {
        field_id: id, field_name: `Field ${id}`, grower_id: null, grower_name: null,
        district: null, natural_region: null, crop_type: 'maize', variety: null,
        size_hectares: 4, kurima_score: 50, kurima_label: 'Adequate', kurima_color: '#FBC02D',
        primary_concern: 'c', recommended_action: 'a', urgency: 'medium',
        days_since_observation: null, planting_date: null, days_since_planting: null,
        ...p,
    }
}

function filter(p: Partial<FieldsFilter> = {}): FieldsFilter {
    return { ...DEFAULT_FIELDS_FILTER, ...p }
}

const ROSTER: PortfolioPriority[] = [
    field('a', { grower_name: 'Tariro Moyo', field_name: 'North Block', district: 'Bindura', crop_type: 'tobacco_flue_cured', kurima_score: 28, kurima_label: 'Distressed', size_hectares: 9 }),
    field('b', { grower_name: 'Chipo Banda', field_name: 'River Field', district: 'Karoi', crop_type: 'maize', kurima_score: 72, kurima_label: 'Strong', size_hectares: 4 }),
    field('c', { grower_name: 'Tariro Phiri', field_name: 'Hilltop', district: 'Bindura', crop_type: 'soybean', kurima_score: 55, kurima_label: 'Adequate', size_hectares: 6 }),
    field('d', { grower_name: null, field_name: 'Unassigned A', district: null, crop_type: 'cotton', kurima_score: null, kurima_label: null, kurima_color: null, urgency: 'awaiting_data', size_hectares: 12 }),
    field('e', { grower_name: 'Memory Sibanda', field_name: 'East Plot', district: 'Karoi', crop_type: 'maize', kurima_score: null, kurima_label: null, kurima_color: null, urgency: 'awaiting_data', size_hectares: 4 }),
]

// ---------------------------------------------------------------------------
// 1. filterFields
// ---------------------------------------------------------------------------

test('search matches grower OR field name, case-insensitive + trimmed', () => {
    assert.deepEqual(filterFields(ROSTER, filter({ search: 'tariro' })).map((f) => f.field_id), ['a', 'c'])
    assert.deepEqual(filterFields(ROSTER, filter({ search: '  RIVER ' })).map((f) => f.field_id), ['b'])
    assert.deepEqual(filterFields(ROSTER, filter({ search: 'east plot' })).map((f) => f.field_id), ['e'])
    assert.equal(filterFields(ROSTER, filter({ search: 'zzz' })).length, 0)
})

test('district / crop multi-select narrowing', () => {
    assert.deepEqual(filterFields(ROSTER, filter({ districts: ['Bindura'] })).map((f) => f.field_id), ['a', 'c'])
    assert.deepEqual(
        filterFields(ROSTER, filter({ districts: ['Bindura', 'Karoi'] })).map((f) => f.field_id),
        ['a', 'b', 'c', 'e'],
    )
    assert.deepEqual(filterFields(ROSTER, filter({ crops: ['maize'] })).map((f) => f.field_id), ['b', 'e'])
})

test('band filter incl. awaiting pseudo-band matches null-score rows', () => {
    assert.deepEqual(filterFields(ROSTER, filter({ bands: ['Strong'] })).map((f) => f.field_id), ['b'])
    assert.deepEqual(filterFields(ROSTER, filter({ bands: [AWAITING_BAND] })).map((f) => f.field_id), ['d', 'e'])
    assert.deepEqual(
        filterFields(ROSTER, filter({ bands: ['Distressed', AWAITING_BAND] })).map((f) => f.field_id),
        ['a', 'd', 'e'],
    )
})

test('combined filters AND together; empty filter returns all', () => {
    const r = filterFields(ROSTER, filter({ search: 'tariro', districts: ['Bindura'], crops: ['tobacco_flue_cured'] }))
    assert.deepEqual(r.map((f) => f.field_id), ['a'])
    assert.equal(filterFields(ROSTER, DEFAULT_FIELDS_FILTER).length, ROSTER.length)
})

test('filterFields does not mutate its input', () => {
    const copy = [...ROSTER]
    filterFields(ROSTER, filter({ search: 'tariro' }))
    assert.deepEqual(ROSTER, copy)
})

// ---------------------------------------------------------------------------
// 2. sortFields
// ---------------------------------------------------------------------------

test('score_asc: worst first, awaiting last', () => {
    const ids = sortFields(ROSTER, 'score_asc').map((f) => f.field_id)
    assert.deepEqual(ids, ['a', 'c', 'b', 'd', 'e']) // 28,55,72 then awaiting (d 12ha before e 4ha)
})

test('score_desc: best first, awaiting STILL last', () => {
    const ids = sortFields(ROSTER, 'score_desc').map((f) => f.field_id)
    assert.deepEqual(ids, ['b', 'c', 'a', 'd', 'e'])
    // awaiting rows never lead, regardless of direction
    assert.deepEqual(ids.slice(-2).sort(), ['d', 'e'])
})

test('score ties break by size desc then field_id', () => {
    const tied = [
        field('x', { kurima_score: 50, size_hectares: 4 }),
        field('y', { kurima_score: 50, size_hectares: 9 }),
        field('z', { kurima_score: 50, size_hectares: 9 }),
    ]
    assert.deepEqual(sortFields(tied, 'score_asc').map((f) => f.field_id), ['y', 'z', 'x'])
})

test('size_desc orders by hectares', () => {
    assert.deepEqual(sortFields(ROSTER, 'size_desc').map((f) => f.field_id), ['d', 'a', 'c', 'b', 'e'])
})

test('grower_az: alphabetical, null grower last, secondary field name', () => {
    const ids = sortFields(ROSTER, 'grower_az').map((f) => f.field_id)
    // Chipo, Memory, Tariro Moyo, Tariro Phiri, then null(d) last
    assert.deepEqual(ids, ['b', 'e', 'a', 'c', 'd'])
})

test('district_az: alphabetical, null district last', () => {
    const ids = sortFields(ROSTER, 'district_az').map((f) => f.field_id)
    assert.equal(ids[ids.length - 1], 'd') // null district last
    assert.ok(ids.indexOf('a') < ids.indexOf('b')) // Bindura before Karoi
})

test('sortFields returns a new array (no mutation)', () => {
    const copy = [...ROSTER]
    sortFields(ROSTER, 'size_desc')
    assert.deepEqual(ROSTER, copy)
})

// ---------------------------------------------------------------------------
// 3. deriveFilterOptions
// ---------------------------------------------------------------------------

test('deriveFilterOptions: distinct, sorted, only present values', () => {
    const opts = deriveFilterOptions(ROSTER)
    assert.deepEqual(opts.districts, ['Bindura', 'Karoi'])
    assert.deepEqual(opts.crops, ['cotton', 'maize', 'soybean', 'tobacco_flue_cured'])
    // bands worst→best by score, awaiting appended because null rows exist
    assert.deepEqual(opts.bands, ['Distressed', 'Adequate', 'Strong', AWAITING_BAND])
})

test('deriveFilterOptions: no awaiting band when every field is scored', () => {
    const scored = ROSTER.filter((f) => f.kurima_score != null)
    assert.ok(!deriveFilterOptions(scored).bands.includes(AWAITING_BAND))
})

test('isFilterActive reflects any active dimension', () => {
    assert.equal(isFilterActive(DEFAULT_FIELDS_FILTER), false)
    assert.equal(isFilterActive(filter({ search: '  ' })), false) // whitespace only
    assert.equal(isFilterActive(filter({ search: 'x' })), true)
    assert.equal(isFilterActive(filter({ bands: ['Strong'] })), true)
})

// ---------------------------------------------------------------------------
// 4. debounce
// ---------------------------------------------------------------------------

test('debounce fires once, trailing edge, with latest args', async () => {
    let calls = 0
    let last = ''
    const d = debounce((v: string) => { calls++; last = v }, 20)
    d('a'); d('b'); d('c')
    assert.equal(calls, 0)
    await new Promise((r) => setTimeout(r, 40))
    assert.equal(calls, 1)
    assert.equal(last, 'c')
})

test('debounce cancel drops a pending call', async () => {
    let calls = 0
    const d = debounce(() => { calls++ }, 20)
    d(); d.cancel()
    await new Promise((r) => setTimeout(r, 40))
    assert.equal(calls, 0)
})

// ---------------------------------------------------------------------------
// 5. Source invariants (no DOM)
// ---------------------------------------------------------------------------

const pageSrc = readFileSync('app/portfolio/fields/page.tsx', 'utf8')
const controlsSrc = readFileSync('components/portfolio/FieldsControls.tsx', 'utf8')
const cardSrc = readFileSync('components/portfolio/FieldRowCard.tsx', 'utf8')

test('field rows link to the detail route', () => {
    assert.match(cardSrc, /\/portfolio\/fields\/\$\{p\.field_id\}/)
})

test('page applies order only through sortFields (no ad-hoc .sort in the page)', () => {
    assert.match(pageSrc, /sortFields\(/)
    assert.ok(!/\.sort\(/.test(pageSrc), 'page must order via sortFields, not inline .sort')
})

test('default sort is worst-first', () => {
    assert.match(pageSrc, /DEFAULT_FIELDS_SORT/)
})

test('no emojis in the Fields UI', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    for (const src of [pageSrc, controlsSrc, cardSrc]) {
        assert.ok(!emoji.test(src), 'UI must not contain emojis')
    }
})

test('roster variant omits the recommended-action footer', () => {
    // FieldRowCard gates recommended_action behind variant === 'priority'
    assert.match(cardSrc, /variant === 'priority'/)
})
