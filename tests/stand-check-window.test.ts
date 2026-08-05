// When the Stand Check prompt appears. This decides whether a farmer is asked
// to walk their field, and both failure directions are costly: too eager asks
// them to count a crop that hasn't emerged, too late produces a measurement
// that is worthless because the decision it informs has already expired.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    CHECK_WINDOW_DAYS,
    DAYS_TO_EMERGENCE,
    standCheckWindow,
} from '../lib/stand-check-window'
import type { Season } from '../lib/planning-types'

const TODAY = new Date('2026-12-01T00:00:00Z')

/** A season planted `days` before TODAY, ready for the check by default. */
const plantedDaysAgo = (days: number, over: Partial<Season> = {}): Season => {
    const d = new Date(TODAY)
    d.setUTCDate(d.getUTCDate() - days)
    return {
        id: 's1', field_id: 'f1', status: 'active', season_label: null,
        crop_type: 'Maize', variety: 'SC727',
        planned_planting_date: null,
        planting_date: d.toISOString().slice(0, 10),
        transplant_date: null, expected_harvest_date: null, harvest_date: null,
        row_spacing_cm: 90, in_row_spacing_cm: 25.3,
        target_population_per_ha: 44000, seed_rate_kg_ha: 11,
        planting_depth_cm: 5, emergence_date: null,
        established_population_per_ha: null, emergence_uniformity: null,
        previous_crop: null, tillage_practice: null, residue_management: null,
        yield_tonnes_per_ha: null, notes: null, created_at: null, updated_at: null,
        ...over,
    }
}

// --- Preconditions ----------------------------------------------------------

test('no season means no prompt', () => {
    assert.equal(standCheckWindow(null, TODAY).show, false)
    assert.equal(standCheckWindow(null, TODAY).reason, 'no-season')
    assert.equal(standCheckWindow(undefined, TODAY).reason, 'no-season')
})

test('an unplanted season is not prompted', () => {
    const s = plantedDaysAgo(10, { planting_date: null })
    assert.equal(standCheckWindow(s, TODAY).reason, 'no-planting-date')
})

test('without row spacing the check cannot be set up, so it is not offered', () => {
    // The sample row length is derived from row spacing — prompting would dead-end.
    const s = plantedDaysAgo(10, { row_spacing_cm: null })
    assert.equal(standCheckWindow(s, TODAY).reason, 'no-row-spacing')
})

test('an already-recorded stand stops the prompt', () => {
    const s = plantedDaysAgo(10, { established_population_per_ha: 41000 })
    assert.equal(standCheckWindow(s, TODAY).reason, 'already-checked')
})

// --- The window -------------------------------------------------------------

test('nothing is asked before the crop has emerged', () => {
    // Counting plants that are still underground is not a measurement.
    for (const day of [0, 3, DAYS_TO_EMERGENCE - 1]) {
        const w = standCheckWindow(plantedDaysAgo(day), TODAY)
        assert.equal(w.show, false, `day ${day} should be too early`)
        assert.equal(w.reason, 'too-early')
    }
})

test('the prompt opens the day emergence is expected', () => {
    const w = standCheckWindow(plantedDaysAgo(DAYS_TO_EMERGENCE), TODAY)
    assert.equal(w.show, true)
    assert.equal(w.reason, 'open')
    assert.equal(w.daysLeft, CHECK_WINDOW_DAYS)
})

test('days remaining count down through the window', () => {
    assert.equal(standCheckWindow(plantedDaysAgo(14), TODAY).daysLeft, 14)
    assert.equal(standCheckWindow(plantedDaysAgo(21), TODAY).daysLeft, 7)
    assert.equal(standCheckWindow(plantedDaysAgo(27), TODAY).daysLeft, 1)
})

test('the last day of the window still prompts', () => {
    const w = standCheckWindow(plantedDaysAgo(DAYS_TO_EMERGENCE + CHECK_WINDOW_DAYS - 1), TODAY)
    assert.equal(w.show, true)
    assert.equal(w.daysLeft, 1)
})

test('the prompt stops once the window closes rather than nagging forever', () => {
    // A permanent badge for something no longer worth doing trains farmers to
    // ignore the surface entirely.
    for (const day of [DAYS_TO_EMERGENCE + CHECK_WINDOW_DAYS, 40, 120]) {
        const w = standCheckWindow(plantedDaysAgo(day), TODAY)
        assert.equal(w.show, false, `day ${day} should be closed`)
        assert.equal(w.reason, 'window-closed')
    }
})

// --- Urgency ----------------------------------------------------------------

test('urgency escalates in the final week only', () => {
    assert.equal(standCheckWindow(plantedDaysAgo(10), TODAY).urgent, false)  // 18 left
    assert.equal(standCheckWindow(plantedDaysAgo(20), TODAY).urgent, false)  // 8 left
    assert.equal(standCheckWindow(plantedDaysAgo(21), TODAY).urgent, true)   // 7 left
    assert.equal(standCheckWindow(plantedDaysAgo(27), TODAY).urgent, true)   // 1 left
})

test('a hidden window never claims urgency or a countdown', () => {
    for (const s of [
        plantedDaysAgo(2),
        plantedDaysAgo(60),
        plantedDaysAgo(10, { established_population_per_ha: 40000 }),
    ]) {
        const w = standCheckWindow(s, TODAY)
        assert.equal(w.urgent, false)
        assert.equal(w.daysLeft, null)
    }
})
