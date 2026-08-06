// Action-window presentation helpers.
//
// These encode the two distinctions that decide what a farmer does first: how
// soon a window shuts, and whether missing it can be made up. Getting either
// wrong flattens the plan back into a list where everything looks equally
// important, which is the problem the feature exists to fix.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    categoryLabel,
    costLabel,
    deadlineLabel,
    groupByCategory,
    remainingWindows,
    urgentWindows,
    windowIcon,
    windowStateStyle,
} from '../lib/action-window-utils'
import type { ActionWindow } from '../lib/planning-types'

const win = (over: Partial<ActionWindow> = {}): ActionWindow => ({
    key: 'critical_weeding',
    title: 'Keep the crop weed-free',
    category: 'weed',
    opens_day: 7,
    closes_day: 49,
    irreversible: true,
    cost_pct: 22,
    cost_of_missing: 'Up to 22% of yield, permanently',
    why: 'Critical period of weed competition.',
    stage_code: null,
    opens_date: '2026-11-22',
    closes_date: '2027-01-03',
    days_remaining: 10,
    state: 'open',
    ...over,
})

// --- State styling ----------------------------------------------------------

test('only a closing window is treated as urgent', () => {
    // "Open" means there is still time; interrupting for it every day is noise.
    assert.equal(windowStateStyle('closing').urgent, true)
    assert.equal(windowStateStyle('open').urgent, false)
    assert.equal(windowStateStyle('upcoming').urgent, false)
    assert.equal(windowStateStyle('closed').urgent, false)
})

test('each state has a distinct colour', () => {
    const colors = (['closing', 'open', 'upcoming', 'closed'] as const)
        .map((s) => windowStateStyle(s).color)
    assert.equal(new Set(colors).size, colors.length)
})

test('an unknown state degrades instead of throwing', () => {
    assert.equal(windowStateStyle(null).label, 'Coming up')
    assert.equal(windowStateStyle(undefined).urgent, false)
})

test('each category has its own icon, with a fallback', () => {
    assert.equal(windowIcon('weed'), 'grass')
    assert.equal(windowIcon('nutrition'), 'science')
    assert.equal(windowIcon(null), 'schedule')
})

// --- Deadline phrasing ------------------------------------------------------

test('deadlines are expressed as a countdown, not a date', () => {
    // "Closes 18 Dec" is arithmetic a farmer has to do standing in a field.
    assert.equal(deadlineLabel(win({ days_remaining: 3 })), 'Closes in 3 days')
    assert.equal(deadlineLabel(win({ days_remaining: 1 })), 'Closes tomorrow')
    assert.equal(deadlineLabel(win({ days_remaining: 0 })), 'Last day')
})

test('an upcoming window shows when it opens', () => {
    const label = deadlineLabel(win({ state: 'upcoming', opens_date: '2026-12-13' }))
    assert.match(label, /^Opens 13 Dec$/)
})

test('an upcoming window with no date still says something useful', () => {
    assert.equal(
        deadlineLabel(win({ state: 'upcoming', opens_date: null })),
        'Not open yet'
    )
})

test('a closed window says so plainly', () => {
    assert.equal(deadlineLabel(win({ state: 'closed' })), 'Window has closed')
})

test('a missing countdown does not render as NaN', () => {
    assert.equal(deadlineLabel(win({ days_remaining: null })), 'Open now')
})

// --- Cost phrasing ----------------------------------------------------------

test('irreversible windows say the loss cannot be recovered', () => {
    // This is the distinction a farmer is most likely to misjudge: a task that
    // can be done next week and one that cannot look identical on a list.
    const label = costLabel(win({ irreversible: true }))
    assert.match(label, /cannot be recovered/)
})

test('reversible windows do not claim permanence', () => {
    const label = costLabel(win({ irreversible: false, cost_of_missing: 'Reduced grain fill' }))
    assert.equal(label, 'Reduced grain fill')
})

test('a window with no stated cost still renders a cost line', () => {
    assert.equal(
        costLabel(win({ cost_of_missing: '', irreversible: false })),
        'Reduced yield'
    )
})

// --- Urgent selection -------------------------------------------------------

test('only irreversible windows that are live count as urgent', () => {
    const windows = [
        win({ key: 'a', irreversible: true, state: 'open' }),
        win({ key: 'b', irreversible: false, state: 'closing' }),   // reversible
        win({ key: 'c', irreversible: true, state: 'upcoming' }),   // not live yet
        win({ key: 'd', irreversible: true, state: 'closed' }),     // gone
    ]
    assert.deepEqual(urgentWindows(windows).map((w) => w.key), ['a'])
})

test('the urgent list is capped, because a list of ten urgent things is a list', () => {
    const windows = Array.from({ length: 8 }, (_, i) =>
        win({ key: `k${i}`, irreversible: true, state: 'closing' })
    )
    assert.equal(urgentWindows(windows).length, 3)
    assert.equal(urgentWindows(windows, 5).length, 5)
})

test('urgent selection preserves the backend ranking', () => {
    const windows = [
        win({ key: 'first', irreversible: true, state: 'closing' }),
        win({ key: 'second', irreversible: true, state: 'open' }),
    ]
    assert.deepEqual(urgentWindows(windows).map((w) => w.key), ['first', 'second'])
})

test('no windows means nothing urgent', () => {
    assert.deepEqual(urgentWindows([]), [])
    assert.deepEqual(urgentWindows(undefined), [])
})

// --- Remainder --------------------------------------------------------------

test('the remainder excludes exactly what was promoted', () => {
    const windows = [
        win({ key: 'a', irreversible: true, state: 'open' }),
        win({ key: 'b', irreversible: false, state: 'open' }),
        win({ key: 'c', irreversible: false, state: 'upcoming' }),
    ]
    const urgent = urgentWindows(windows)
    assert.deepEqual(remainingWindows(windows, urgent).map((w) => w.key), ['b', 'c'])
})

test('nothing is lost between the urgent list and the remainder', () => {
    const windows = [
        win({ key: 'a', irreversible: true, state: 'closing' }),
        win({ key: 'b', irreversible: false, state: 'open' }),
    ]
    const urgent = urgentWindows(windows)
    assert.equal(urgent.length + remainingWindows(windows, urgent).length, windows.length)
})

// --- Grouping ---------------------------------------------------------------

test('categories group in a fixed order regardless of input order', () => {
    const windows = [
        win({ key: 'p', category: 'protection' }),
        win({ key: 'n', category: 'nutrition' }),
        win({ key: 'e', category: 'establishment' }),
    ]
    assert.deepEqual(
        groupByCategory(windows).map((g) => g.category),
        ['establishment', 'nutrition', 'protection']
    )
})

test('grouping preserves ranking within a category', () => {
    const windows = [
        win({ key: 'first', category: 'weed' }),
        win({ key: 'second', category: 'weed' }),
    ]
    assert.deepEqual(
        groupByCategory(windows)[0].windows.map((w) => w.key),
        ['first', 'second']
    )
})

test('empty categories are omitted rather than rendered blank', () => {
    const groups = groupByCategory([win({ category: 'weed' })])
    assert.equal(groups.length, 1)
    assert.equal(groups[0].category, 'weed')
})

test('grouping handles no windows', () => {
    assert.deepEqual(groupByCategory([]), [])
    assert.deepEqual(groupByCategory(undefined), [])
})

test('category labels are farmer-facing, not internal keys', () => {
    assert.equal(categoryLabel('weed'), 'Weed control')
    assert.equal(categoryLabel('establishment'), 'Getting established')
    assert.equal(categoryLabel(null), 'Other')
})
