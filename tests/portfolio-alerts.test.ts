// Portfolio Alerts screen tests (MVP PR 7). Run with: npm test (tsx --test).
// Pure derivation logic tested directly; the screen gets source-invariant
// checks (node:test has no DOM).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
    deriveAlerts,
    alertCounts,
    isStale,
    STALE_OBSERVATION_DAYS,
    selectScreenState,
    type PortfolioPriority,
    type PortfolioSummary,
    type ScoreDistribution,
    type Urgency,
} from '../lib/portfolio-utils'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function field(
    id: string,
    urgency: Urgency,
    score: number | null,
    daysObs: number | null,
    ha = 4,
): PortfolioPriority {
    return {
        field_id: id, field_name: `F${id}`, grower_id: 'g', grower_name: 'G',
        district: 'D', natural_region: null, crop_type: 'maize', variety: null,
        size_hectares: ha, kurima_score: score,
        kurima_label: score == null ? null : 'Adequate', kurima_color: score == null ? null : '#FBC02D',
        primary_concern: 'c', recommended_action: 'a', urgency,
        days_since_observation: daysObs, planting_date: null, days_since_planting: null,
    }
}

function summary(p: Partial<PortfolioSummary> = {}): PortfolioSummary {
    const dist: ScoreDistribution = {
        thriving: 0, strong: 0, adequate: 0, stressed: 0, distressed: 0, critical: 0, awaiting_data: 0,
    }
    return {
        total_fields: 0, total_growers: 0, total_hectares: 0, score_distribution: dist,
        alerts_critical: 0, alerts_high: 0, average_kurima_score: null,
        fields_with_data: 0, fields_awaiting_data: 0, ...p,
    }
}

// ---------------------------------------------------------------------------
// 1. deriveAlerts
// ---------------------------------------------------------------------------

test('health: critical before high, score ascending within each', () => {
    const rows = [
        field('h1', 'high', 38, 2),
        field('c2', 'critical', 20, 2),
        field('c1', 'critical', 10, 2),
        field('h2', 'high', 30, 2),
    ]
    const { health } = deriveAlerts(rows)
    assert.deepEqual(health.map((f) => f.field_id), ['c1', 'c2', 'h2', 'h1'])
})

test('health score ties break by size desc then field_id', () => {
    const rows = [
        field('a', 'critical', 15, 2, 4),
        field('b', 'critical', 15, 2, 9),
        field('c', 'critical', 15, 2, 9),
    ]
    assert.deepEqual(deriveAlerts(rows).health.map((f) => f.field_id), ['b', 'c', 'a'])
})

test('health precedence: a critical field with stale data is a health alert ONLY', () => {
    const rows = [field('x', 'critical', 18, 40)] // very old obs, but critical
    const d = deriveAlerts(rows)
    assert.deepEqual(d.health.map((f) => f.field_id), ['x'])
    assert.equal(d.stale.length, 0)
    assert.equal(d.awaiting.length, 0)
})

test('awaiting vs stale partition; null-days scored field counts as stale', () => {
    const rows = [
        field('aw', 'awaiting_data', null, null),  // awaiting (null score)
        field('st1', 'low', 80, 12),               // stale (>7 days)
        field('st2', 'medium', 60, null),          // stale (scored, unknown age)
        field('ok', 'low', 75, 3),                 // fresh — not an alert
    ]
    const d = deriveAlerts(rows)
    assert.deepEqual(d.awaiting.map((f) => f.field_id), ['aw'])
    assert.deepEqual(d.stale.map((f) => f.field_id).sort(), ['st1', 'st2'])
    // boundary: exactly 7 days is NOT stale
    assert.equal(deriveAlerts([field('e', 'low', 70, STALE_OBSERVATION_DAYS)]).stale.length, 0)
    assert.equal(deriveAlerts([field('e', 'low', 70, STALE_OBSERVATION_DAYS + 1)]).stale.length, 1)
})

test('no field appears in more than one list', () => {
    const rows = [
        field('c', 'critical', 10, 30),
        field('h', 'high', 35, 1),
        field('aw', 'awaiting_data', null, null),
        field('st', 'low', 60, 20),
        field('ok', 'low', 70, 1),
    ]
    const d = deriveAlerts(rows)
    const all = [...d.health, ...d.awaiting, ...d.stale].map((f) => f.field_id)
    assert.equal(new Set(all).size, all.length)
})

test('deriveAlerts does not mutate input and is deterministic', () => {
    const rows = [field('b', 'critical', 20, 2, 9), field('a', 'critical', 20, 2, 4)]
    const copy = JSON.parse(JSON.stringify(rows))
    const a = deriveAlerts(rows).health.map((f) => f.field_id)
    const b = deriveAlerts(rows).health.map((f) => f.field_id)
    assert.deepEqual(rows, copy)
    assert.deepEqual(a, b)
})

test('isStale: only scored fields, strictly greater than the threshold', () => {
    assert.equal(isStale(field('x', 'low', null, 100)), false) // null score
    assert.equal(isStale(field('x', 'low', 70, 3)), false)
    assert.equal(isStale(field('x', 'low', 70, 8)), true)
    assert.equal(isStale(field('x', 'low', 70, null)), true)
})

// ---------------------------------------------------------------------------
// 2. alertCounts
// ---------------------------------------------------------------------------

test('alertCounts: health, data (awaiting+stale), total', () => {
    const rows = [
        field('c', 'critical', 10, 1),
        field('h', 'high', 30, 1),
        field('aw', 'awaiting_data', null, null),
        field('st', 'low', 60, 20),
        field('ok', 'low', 70, 1),
    ]
    const c = alertCounts(deriveAlerts(rows))
    assert.deepEqual(c, { health: 2, data: 2, total: 4 })
})

test('alertCounts: all-clear portfolio is zero', () => {
    const rows = [field('ok1', 'low', 80, 1), field('ok2', 'medium', 60, 4)]
    assert.deepEqual(alertCounts(deriveAlerts(rows)), { health: 0, data: 0, total: 0 })
})

// ---------------------------------------------------------------------------
// 3. State selection (reused from utils)
// ---------------------------------------------------------------------------

test('screen state: empty / awaiting / active feed the alerts page', () => {
    assert.equal(selectScreenState(summary({ total_fields: 0 })), 'empty')
    assert.equal(selectScreenState(summary({ total_fields: 5, fields_with_data: 0 })), 'awaiting')
    assert.equal(selectScreenState(summary({ total_fields: 5, fields_with_data: 3 })), 'active')
})

// ---------------------------------------------------------------------------
// 4. Source invariants
// ---------------------------------------------------------------------------

const pageSrc = readFileSync('app/portfolio/alerts/page.tsx', 'utf8')

test('rows link to field detail (via FieldRowCard) and no other data source', () => {
    assert.match(pageSrc, /FieldRowCard/)
    assert.match(pageSrc, /usePortfolioAggregate/)
    // only the shared aggregate hook — no bespoke fetch/useSWR on this screen
    assert.ok(!/useSWR|fetch\(/.test(pageSrc), 'alerts must derive from the shared aggregate only')
})

test('page references STALE_OBSERVATION_DAYS, not a magic 7', () => {
    assert.match(pageSrc, /STALE_OBSERVATION_DAYS/)
    assert.ok(!/>\s*7\b/.test(pageSrc), 'no inline magic 7 — use the exported constant')
})

test('no emojis in the alerts UI', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    assert.ok(!emoji.test(pageSrc), 'UI must not contain emojis')
})

test('all-clear copy is present and framed positively', () => {
    assert.match(pageSrc, /No active alerts/)
    assert.match(pageSrc, /within expected ranges/)
})
