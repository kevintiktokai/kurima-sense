// Notification center + irrigation advisor pure-helper tests (tsx --test).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    badgeLabel,
    categoryIcon,
    formatHour,
    severityAccent,
    timeAgo,
} from '../lib/notification-utils'
import {
    ACTION_ORDER,
    actionMeta,
    formatDuration,
    rootZoneFullness,
    type IrrigationAction,
} from '../lib/irrigation-types'

// ── notification helpers ─────────────────────────────────────────────────────

test('timeAgo buckets ages sensibly', () => {
    const now = new Date('2026-07-06T12:00:00Z')
    assert.equal(timeAgo('2026-07-06T11:59:40Z', now), 'now')
    assert.equal(timeAgo('2026-07-06T11:35:00Z', now), '25m')
    assert.equal(timeAgo('2026-07-06T07:00:00Z', now), '5h')
    assert.equal(timeAgo('2026-07-03T12:00:00Z', now), '3d')
})

test('timeAgo tolerates garbage and future timestamps', () => {
    assert.equal(timeAgo('not-a-date'), '')
    const now = new Date('2026-07-06T12:00:00Z')
    assert.equal(timeAgo('2026-07-06T12:05:00Z', now), 'now') // clock skew clamps to now
})

test('badgeLabel caps at 9+', () => {
    assert.equal(badgeLabel(0), '')
    assert.equal(badgeLabel(3), '3')
    assert.equal(badgeLabel(42), '9+')
})

test('severityAccent distinguishes the three severities', () => {
    const colors = new Set(['info', 'warning', 'critical'].map((s) => severityAccent(s as never)))
    assert.equal(colors.size, 3)
})

test('categoryIcon has weather/advisory/planner coverage and a fallback', () => {
    assert.equal(categoryIcon('weather_frost'), 'ac_unit')
    assert.equal(categoryIcon('irrigation'), 'sprinkler')
    assert.equal(categoryIcon('task_overdue'), 'checklist')
    assert.equal(categoryIcon('something_new'), 'notifications')
})

test('formatHour pads and wraps', () => {
    assert.equal(formatHour(6), '06:00')
    assert.equal(formatHour(20), '20:00')
    assert.equal(formatHour(24), '00:00')
})

// ── irrigation helpers ───────────────────────────────────────────────────────

test('actionMeta covers every action and flags urgency correctly', () => {
    const actions: IrrigationAction[] = [
        'irrigate_now', 'irrigate_soon', 'delay_rain_expected', 'monitor', 'not_needed',
    ]
    for (const action of actions) {
        const meta = actionMeta(action)
        assert.ok(meta.label.length > 0)
        assert.ok(meta.icon.length > 0)
        assert.equal(meta.urgent, action === 'irrigate_now' || action === 'irrigate_soon')
        assert.ok(action in ACTION_ORDER)
    }
})

test('formatDuration renders minutes and hours', () => {
    assert.equal(formatDuration(null), '')
    assert.equal(formatDuration(45), '45 min')
    assert.equal(formatDuration(60), '1 h')
    assert.equal(formatDuration(95), '1 h 35 min')
})

test('rootZoneFullness clamps to [0,1]', () => {
    assert.equal(rootZoneFullness({ water_deficit_mm: 0, taw_mm: 70 }), 1)
    assert.equal(rootZoneFullness({ water_deficit_mm: 35, taw_mm: 70 }), 0.5)
    assert.equal(rootZoneFullness({ water_deficit_mm: 90, taw_mm: 70 }), 0)
    assert.equal(rootZoneFullness({ water_deficit_mm: 10, taw_mm: 0 }), 0)
})
