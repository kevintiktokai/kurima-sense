// Portfolio Growers screen tests (MVP PR 6). Run with: npm test (tsx --test).
// Pure merge/search/sort/validation logic + the injectable-fetch mutation
// helpers tested directly; screens get source-invariant checks (no DOM).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
    mergeGrowerStats,
    searchGrowers,
    sortGrowersDefault,
    validateGrowerForm,
    buildGrowerPayload,
    isValidEmail,
    type Grower,
    type GrowerWithStats,
    type PortfolioPriority,
    type GrowerFormValues,
} from '../lib/portfolio-utils'
import { createGrower, updateGrower, deleteGrower } from '../hooks/useGrowers'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function grower(id: string, name: string, p: Partial<Grower> = {}): Grower {
    return {
        id, tenant_id: 't1', name, phone: null, email: null, coordinates: null,
        claimed_by_user_id: null, created_by_user_id: null, notes: null,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...p,
    }
}

function field(id: string, growerId: string | null, score: number | null, ha = 4): PortfolioPriority {
    return {
        field_id: id, field_name: `F${id}`, grower_id: growerId, grower_name: null,
        district: null, natural_region: null, crop_type: 'maize', variety: null,
        size_hectares: ha, kurima_score: score, kurima_label: score == null ? null : 'Adequate',
        kurima_color: score == null ? null : '#FBC02D',
        primary_concern: 'c', recommended_action: 'a',
        urgency: score == null ? 'awaiting_data' : 'medium',
        days_since_observation: null, planting_date: null, days_since_planting: null,
    }
}

function values(p: Partial<GrowerFormValues> = {}): GrowerFormValues {
    return { name: '', phone: '', email: '', notes: '', ...p }
}

// ---------------------------------------------------------------------------
// 1. mergeGrowerStats
// ---------------------------------------------------------------------------

const GROWERS = [grower('g1', 'Tariro'), grower('g2', 'Chipo'), grower('g3', 'Memory')]
const PRIORITIES = [
    field('a', 'g1', 28, 9), field('b', 'g1', 64, 6),   // g1: 2 fields, 15ha, worst 28
    field('c', 'g2', null, 12), field('d', 'g2', null, 4), // g2: all awaiting
    // g3: no fields
]

test('mergeGrowerStats: counts, hectares, worst score (min)', () => {
    const merged = mergeGrowerStats(GROWERS, PRIORITIES)
    const g1 = merged.find((g) => g.id === 'g1')!
    assert.equal(g1.field_count, 2)
    assert.equal(g1.total_hectares, 15)
    assert.equal(g1.worst_score, 28)
    assert.equal(g1.worst_label, 'Distressed')
    assert.ok(g1.worst_color && g1.worst_color.startsWith('#'))
    assert.equal(g1.has_awaiting, false)
})

test('mergeGrowerStats: all-awaiting grower -> null worst + has_awaiting', () => {
    const g2 = mergeGrowerStats(GROWERS, PRIORITIES).find((g) => g.id === 'g2')!
    assert.equal(g2.field_count, 2)
    assert.equal(g2.total_hectares, 16)
    assert.equal(g2.worst_score, null)
    assert.equal(g2.worst_label, null)
    assert.equal(g2.has_awaiting, true)
})

test('mergeGrowerStats: zero-field grower -> zero count, null stats', () => {
    const g3 = mergeGrowerStats(GROWERS, PRIORITIES).find((g) => g.id === 'g3')!
    assert.equal(g3.field_count, 0)
    assert.equal(g3.total_hectares, 0)
    assert.equal(g3.worst_score, null)
    assert.equal(g3.has_awaiting, false)
})

test('mergeGrowerStats does not mutate inputs', () => {
    const gc = JSON.parse(JSON.stringify(GROWERS))
    const pc = JSON.parse(JSON.stringify(PRIORITIES))
    mergeGrowerStats(GROWERS, PRIORITIES)
    assert.deepEqual(GROWERS, gc)
    assert.deepEqual(PRIORITIES, pc)
})

// ---------------------------------------------------------------------------
// 2. searchGrowers
// ---------------------------------------------------------------------------

test('searchGrowers: case-insensitive, trimmed, empty=all', () => {
    const merged = mergeGrowerStats(GROWERS, PRIORITIES)
    assert.deepEqual(searchGrowers(merged, '  tar ').map((g) => g.id), ['g1'])
    assert.deepEqual(searchGrowers(merged, 'CHIPO').map((g) => g.id), ['g2'])
    assert.equal(searchGrowers(merged, '').length, 3)
    assert.equal(searchGrowers(merged, '   ').length, 3)
    assert.equal(searchGrowers(merged, 'zzz').length, 0)
})

// ---------------------------------------------------------------------------
// 3. sortGrowersDefault
// ---------------------------------------------------------------------------

test('sortGrowersDefault: at-risk first, null-stats last, deterministic', () => {
    const merged = mergeGrowerStats(GROWERS, PRIORITIES)
    const ids = sortGrowersDefault(merged).map((g) => g.id)
    // g1 has a real worst score (28) → first; g2 (all-awaiting) and g3 (no
    // fields) have null worst → after, g2 before g3 (more fields).
    assert.equal(ids[0], 'g1')
    assert.deepEqual(ids.slice(1), ['g2', 'g3'])
})

test('sortGrowersDefault: worst score ascending; ties by field_count then name', () => {
    const rows: GrowerWithStats[] = [
        { ...grower('a', 'Zed'), field_count: 1, total_hectares: 1, worst_score: 40, worst_label: 'X', worst_color: '#1', has_awaiting: false },
        { ...grower('b', 'Ada'), field_count: 2, total_hectares: 1, worst_score: 20, worst_label: 'X', worst_color: '#1', has_awaiting: false },
        { ...grower('c', 'Ben'), field_count: 3, total_hectares: 1, worst_score: 40, worst_label: 'X', worst_color: '#1', has_awaiting: false },
    ]
    // 20 first, then the two 40s: higher field_count (Ben,3) before (Zed,1)
    assert.deepEqual(sortGrowersDefault(rows).map((g) => g.id), ['b', 'c', 'a'])
})

test('sortGrowersDefault returns a new array', () => {
    const merged = mergeGrowerStats(GROWERS, PRIORITIES)
    const copy = [...merged]
    sortGrowersDefault(merged)
    assert.deepEqual(merged, copy)
})

// ---------------------------------------------------------------------------
// 4. Form validation + payload shaping
// ---------------------------------------------------------------------------

test('validateGrowerForm: name required (trimmed)', () => {
    assert.equal(validateGrowerForm(values({ name: '  ' })).valid, false)
    assert.match(validateGrowerForm(values({ name: '' })).errors.name!, /required/i)
    assert.equal(validateGrowerForm(values({ name: 'Tariro' })).valid, true)
})

test('validateGrowerForm: email only checked when non-empty', () => {
    assert.equal(validateGrowerForm(values({ name: 'A', email: '' })).valid, true)
    assert.equal(validateGrowerForm(values({ name: 'A', email: 'nope' })).valid, false)
    assert.equal(validateGrowerForm(values({ name: 'A', email: 'a@b.co' })).valid, true)
})

test('isValidEmail basic shape', () => {
    assert.equal(isValidEmail('a@b.co'), true)
    assert.equal(isValidEmail('a@b'), false)
    assert.equal(isValidEmail('a b@c.co'), false)
})

test('buildGrowerPayload: trims and drops empty optionals', () => {
    assert.deepEqual(buildGrowerPayload(values({ name: '  Tariro  ' })), { name: 'Tariro' })
    assert.deepEqual(
        buildGrowerPayload(values({ name: 'T', phone: ' 077 ', email: '', notes: ' hi ' })),
        { name: 'T', phone: '077', notes: 'hi' },
    )
})

// ---------------------------------------------------------------------------
// 5. Mutation helpers (injectable fetch + headers)
// ---------------------------------------------------------------------------

const noHeaders = async () => ({}) as HeadersInit
const ok = (body: unknown, status = 200) =>
    (async () => ({ ok: true, status, json: async () => body })) as unknown as typeof fetch
const fail = (status: number, detail?: string) =>
    (async () => ({ ok: false, status, json: async () => (detail ? { detail } : {}) })) as unknown as typeof fetch

test('createGrower posts and returns the created grower', async () => {
    let captured: { url?: string; init?: RequestInit } = {}
    const spy = (async (url: string, init: RequestInit) => {
        captured = { url, init }
        return { ok: true, status: 200, json: async () => ({ id: 'new', name: 'Tariro' }) }
    }) as unknown as typeof fetch
    const g = await createGrower({ name: 'Tariro' }, noHeaders, spy)
    assert.equal(g.id, 'new')
    assert.match(captured.url!, /\/tenants\/me\/growers$/)
    assert.equal(captured.init!.method, 'POST')
    assert.equal(captured.init!.body, JSON.stringify({ name: 'Tariro' }))
})

test('updateGrower patches by id', async () => {
    let url = ''
    const spy = (async (u: string, init: RequestInit) => {
        url = u
        assert.equal(init.method, 'PATCH')
        return { ok: true, status: 200, json: async () => ({ id: 'g1', name: 'New' }) }
    }) as unknown as typeof fetch
    const g = await updateGrower('g1', { name: 'New' }, noHeaders, spy)
    assert.equal(g.name, 'New')
    assert.match(url, /\/tenants\/me\/growers\/g1$/)
})

test('deleteGrower tolerates 204', async () => {
    await assert.doesNotReject(() => deleteGrower('g1', noHeaders, ok(null, 204)))
})

test('mutations surface 403 as a permission message', async () => {
    await assert.rejects(() => createGrower({ name: 'X' }, noHeaders, fail(403)), /don't have permission/i)
    await assert.rejects(() => updateGrower('g1', { name: 'X' }, noHeaders, fail(403)), /don't have permission/i)
    await assert.rejects(() => deleteGrower('g1', noHeaders, fail(403)), /don't have permission/i)
})

test('mutations surface backend detail / status on other errors', async () => {
    await assert.rejects(() => createGrower({ name: 'X' }, noHeaders, fail(400, 'Name taken')), /Name taken/)
    await assert.rejects(() => updateGrower('g1', { name: 'X' }, noHeaders, fail(500)), /\(500\)/)
})

// ---------------------------------------------------------------------------
// 6. Source invariants
// ---------------------------------------------------------------------------

const rosterSrc = readFileSync('app/portfolio/growers/page.tsx', 'utf8')
const cardSrc = readFileSync('components/portfolio/GrowerCard.tsx', 'utf8')
const detailSrc = readFileSync('app/portfolio/growers/[id]/page.tsx', 'utf8')
const formSrc = readFileSync('components/portfolio/GrowerForm.tsx', 'utf8')

test('roster cards link to the grower detail route', () => {
    assert.match(cardSrc, /\/portfolio\/growers\/\$\{g\.id\}/)
})

test('detail field rows link to the field detail route', () => {
    assert.match(detailSrc, /FieldRowCard/)
    assert.match(detailSrc, /grower_id === growerId/)
})

test('detail fetches the grower by id (cold deep-link safe, not roster-dependent)', () => {
    assert.match(detailSrc, /useGrower\(/)
    assert.ok(!/useGrowers\(/.test(detailSrc), 'detail must use single-grower fetch, not the roster list')
})

test('mutations refresh both data sources', () => {
    assert.match(rosterSrc, /refreshGrowerData\(\)/)
    assert.match(detailSrc, /refreshGrowerData\(\)/)
})

test('no emojis in the growers UI', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    for (const src of [rosterSrc, cardSrc, detailSrc, formSrc]) {
        assert.ok(!emoji.test(src), 'UI must not contain emojis')
    }
})
