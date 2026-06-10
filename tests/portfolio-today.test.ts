// Portfolio Today screen tests (MVP PR 3). Run with: npm test (tsx --test).
// Pure helpers + the injectable-fetch data path are tested directly;
// UI components get source-invariant checks (node:test has no DOM).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
    humanizeCrop,
    stripDemoPrefix,
    urgencyGroupLabel,
    formatRelativeTime,
    distributionToSegments,
    groupPriorities,
    selectScreenState,
    criticalFieldCount,
    fetchPortfolioAggregate,
    URGENCY_ORDER,
    type PortfolioPriority,
    type PortfolioSummary,
    type ScoreDistribution,
    type Urgency,
} from '../lib/portfolio-utils'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function dist(partial: Partial<ScoreDistribution> = {}): ScoreDistribution {
    return {
        thriving: 0, strong: 0, adequate: 0, stressed: 0,
        distressed: 0, critical: 0, awaiting_data: 0, ...partial,
    }
}

function summary(partial: Partial<PortfolioSummary> = {}): PortfolioSummary {
    return {
        total_fields: 0, total_growers: 0, total_hectares: 0,
        score_distribution: dist(), alerts_critical: 0, alerts_high: 0,
        average_kurima_score: null, fields_with_data: 0, fields_awaiting_data: 0,
        ...partial,
    }
}

function priority(id: string, urgency: Urgency, partial: Partial<PortfolioPriority> = {}): PortfolioPriority {
    return {
        field_id: id, field_name: `Field ${id}`, grower_id: null, grower_name: null,
        district: null, natural_region: null, crop_type: 'maize', variety: null,
        size_hectares: 4, kurima_score: urgency === 'awaiting_data' ? null : 50,
        kurima_label: null, kurima_color: null,
        primary_concern: 'c', recommended_action: 'a', urgency,
        days_since_observation: null, planting_date: null, days_since_planting: null,
        ...partial,
    }
}

// ---------------------------------------------------------------------------
// 1. Pure helpers
// ---------------------------------------------------------------------------

test('humanizeCrop maps known crops and passes unknown through', () => {
    assert.equal(humanizeCrop('tobacco_flue_cured'), 'Flue-Cured Tobacco')
    assert.equal(humanizeCrop('maize'), 'Maize')
    assert.equal(humanizeCrop('cotton'), 'Cotton')
    assert.equal(humanizeCrop('soybean'), 'Soybean')
    assert.equal(humanizeCrop('quinoa_x'), 'quinoa_x') // unknown passthrough
})

test('stripDemoPrefix removes the seed marker only', () => {
    assert.equal(stripDemoPrefix('DEMO_SEED: Tariro - Mt Darwin - Flue-Cured'), 'Tariro - Mt Darwin - Flue-Cured')
    assert.equal(stripDemoPrefix('North Block'), 'North Block')
    assert.equal(stripDemoPrefix('DEMO_SEED:NoSpace'), 'NoSpace')
})

test('urgencyGroupLabel maps all five urgencies', () => {
    assert.equal(urgencyGroupLabel('critical'), 'Urgent')
    assert.equal(urgencyGroupLabel('high'), 'High priority')
    assert.equal(urgencyGroupLabel('medium'), 'Monitor')
    assert.equal(urgencyGroupLabel('low'), 'Stable')
    assert.equal(urgencyGroupLabel('awaiting_data'), 'Awaiting first observations')
})

test('formatRelativeTime buckets', () => {
    const now = Date.parse('2026-06-10T12:00:00Z')
    assert.equal(formatRelativeTime('2026-06-10T11:59:40Z', now), 'just now')
    assert.equal(formatRelativeTime('2026-06-10T11:48:00Z', now), '12m ago')
    assert.equal(formatRelativeTime('2026-06-10T09:00:00Z', now), '3h ago')
    assert.equal(formatRelativeTime('2026-06-09T09:00:00Z', now), 'yesterday')
    assert.equal(formatRelativeTime('2026-06-05T09:00:00Z', now), '5d ago')
    assert.equal(formatRelativeTime('not-a-date', now), '—')
})

test('distributionToSegments sums to 100 and omits zero bands', () => {
    const segs = distributionToSegments(dist({ thriving: 3, adequate: 5, critical: 1, awaiting_data: 7 }))
    assert.deepEqual(segs.map((s) => s.key), ['thriving', 'adequate', 'critical', 'awaiting_data'])
    assert.equal(segs.reduce((s, b) => s + b.pct, 0), 100)
    assert.ok(segs.every((s) => s.pct > 0))
    assert.ok(segs.every((s) => typeof s.color === 'string' && s.color.length > 0))
})

test('distributionToSegments: single band fills the bar; empty gives []', () => {
    const only = distributionToSegments(dist({ awaiting_data: 40 }))
    assert.equal(only.length, 1)
    assert.equal(only[0].pct, 100)
    assert.deepEqual(distributionToSegments(dist()), [])
})

test('distributionToSegments survives heavy rounding drift', () => {
    // 7 bands of 1 → raw 14.28% each; normalization must land on exactly 100.
    const segs = distributionToSegments(dist({
        thriving: 1, strong: 1, adequate: 1, stressed: 1, distressed: 1, critical: 1, awaiting_data: 1,
    }))
    assert.equal(segs.length, 7)
    assert.equal(segs.reduce((s, b) => s + b.pct, 0), 100)
})

// ---------------------------------------------------------------------------
// 2. Grouping
// ---------------------------------------------------------------------------

test('groupPriorities groups in urgency order, preserves backend order, omits empties', () => {
    const input = [
        priority('a', 'critical'), priority('b', 'high'), priority('c', 'high'),
        priority('d', 'low'), priority('e', 'awaiting_data'), priority('f', 'awaiting_data'),
    ]
    const groups = groupPriorities(input)
    // medium is empty → omitted
    assert.deepEqual(groups.map((g) => g.urgency), ['critical', 'high', 'low', 'awaiting_data'])
    assert.deepEqual(groups[1].items.map((p) => p.field_id), ['b', 'c']) // backend order kept
    assert.equal(groups[0].label, 'Urgent')
    // stable + awaiting collapse by default; actionable groups don't
    assert.equal(groups[0].collapsedByDefault, false)
    assert.equal(groups[1].collapsedByDefault, false)
    assert.equal(groups[2].collapsedByDefault, true)
    assert.equal(groups[3].collapsedByDefault, true)
})

test('groupPriorities of empty list is empty', () => {
    assert.deepEqual(groupPriorities([]), [])
})

test('URGENCY_ORDER covers exactly the five urgencies', () => {
    assert.deepEqual(URGENCY_ORDER, ['critical', 'high', 'medium', 'low', 'awaiting_data'])
})

// ---------------------------------------------------------------------------
// 3. Data path (injectable fetch — the hook's fetcher)
// ---------------------------------------------------------------------------

const PAYLOAD = {
    tenant: { id: 't1', name: 'Demo Leaf Co', institutional_type: 'buyer' },
    summary: summary({ total_fields: 2, fields_with_data: 1, fields_awaiting_data: 1 }),
    priorities: [
        priority('f1', 'medium', { field_name: 'DEMO_SEED: Tariro - Karoi - Flue-Cured' }),
        priority('f2', 'awaiting_data', { field_name: 'Real Field' }),
    ],
    generated_at: '2026-06-10T12:00:00Z',
}

const okFetch = (async () => ({
    ok: true, status: 200, json: async () => PAYLOAD,
})) as unknown as typeof fetch

const failFetch = (async () => ({
    ok: false, status: 502, json: async () => ({}),
})) as unknown as typeof fetch

const noHeaders = async () => ({}) as HeadersInit

test('fetchPortfolioAggregate returns typed data and strips DEMO_SEED prefixes', async () => {
    const data = await fetchPortfolioAggregate('http://x/portfolio/aggregate', noHeaders, okFetch)
    assert.equal(data.tenant.name, 'Demo Leaf Co')
    assert.equal(data.priorities[0].field_name, 'Tariro - Karoi - Flue-Cured')
    assert.equal(data.priorities[1].field_name, 'Real Field')
    assert.equal(data.summary.total_fields, 2)
})

test('fetchPortfolioAggregate throws a clean error on failure', async () => {
    await assert.rejects(
        () => fetchPortfolioAggregate('http://x/portfolio/aggregate', noHeaders, failFetch),
        /Failed to load portfolio \(502\)/,
    )
})

// ---------------------------------------------------------------------------
// 4. Screen-state selection
// ---------------------------------------------------------------------------

test('selectScreenState: empty / awaiting / active', () => {
    assert.equal(selectScreenState(summary({ total_fields: 0 })), 'empty')
    assert.equal(selectScreenState(summary({ total_fields: 40, fields_with_data: 0 })), 'awaiting')
    assert.equal(selectScreenState(summary({ total_fields: 40, fields_with_data: 1 })), 'active')
    assert.equal(selectScreenState(summary({ total_fields: 40, fields_with_data: 40 })), 'active')
})

test('criticalFieldCount counts only critical-urgency rows', () => {
    const rows = [priority('a', 'critical'), priority('b', 'critical'), priority('c', 'high')]
    assert.equal(criticalFieldCount(rows), 2)
    assert.equal(criticalFieldCount([]), 0)
})

// ---------------------------------------------------------------------------
// 5. Source invariants (no DOM in node:test)
// ---------------------------------------------------------------------------

const hookSrc = readFileSync('hooks/usePortfolioAggregate.ts', 'utf8')
const pageSrc = readFileSync('app/portfolio/today/page.tsx', 'utf8')
const listSrc = readFileSync('components/portfolio/PriorityList.tsx', 'utf8')
const cardSrc = readFileSync('components/portfolio/PriorityCard.tsx', 'utf8')
const detailSrc = readFileSync('app/portfolio/fields/[id]/page.tsx', 'utf8')

test('hook: SWR options per spec (focus revalidate, 30s dedupe)', () => {
    assert.match(hookSrc, /revalidateOnFocus:\s*true/)
    assert.match(hookSrc, /dedupingInterval:\s*30[_]?000/)
    assert.match(hookSrc, /\/portfolio\/aggregate/)
})

test('priority rows link to the institutional field detail route', () => {
    assert.match(cardSrc, /\/portfolio\/fields\/\$\{p\.field_id\}/)
})

test('client never re-sorts the backend priority order', () => {
    for (const src of [pageSrc, listSrc, cardSrc]) {
        assert.ok(!/\.sort\(/.test(src), 'priorities must keep backend order')
    }
})

test('no emojis in the new UI', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    for (const src of [pageSrc, listSrc, cardSrc, detailSrc]) {
        assert.ok(!emoji.test(src), 'UI must not contain emojis')
    }
})

test('field detail shows grower context and links back to Today', () => {
    assert.match(detailSrc, /grower_name/)
    assert.match(detailSrc, /\/portfolio\/today/)
    assert.match(detailSrc, /useFieldState/)
})
