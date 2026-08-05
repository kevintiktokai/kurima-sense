// Season-planning presentation helpers: status/risk/verdict styling, the
// farmer-facing formatters, and programme splitting. Pure — shared by the
// pre-plant stepper, the season list and the Stand Check so one screen's
// colour always matches another's label.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    activeSeason,
    closedSeasons,
    daysUntil,
    formatPopulation,
    formatShortDate,
    formatSpacing,
    formatStepAmount,
    liveSeasons,
    nextDueStep,
    relativeDayLabel,
    rotationRiskStyle,
    seasonStatusStyle,
    splitProgramme,
    standVerdictStyle,
} from '../lib/planning-utils'
import type { FertiliserStep, Season } from '../lib/planning-types'

// --- fixtures ---------------------------------------------------------------

const season = (over: Partial<Season>): Season => ({
    id: 's1', field_id: 'f1', status: 'planned', season_label: null,
    crop_type: 'Maize', variety: null,
    planned_planting_date: null, planting_date: null, transplant_date: null,
    expected_harvest_date: null, harvest_date: null,
    row_spacing_cm: null, in_row_spacing_cm: null, target_population_per_ha: null,
    seed_rate_kg_ha: null, planting_depth_cm: null, emergence_date: null,
    established_population_per_ha: null, emergence_uniformity: null,
    previous_crop: null, tillage_practice: null, residue_management: null,
    yield_tonnes_per_ha: null, notes: null, created_at: null, updated_at: null,
    ...over,
})

const step = (over: Partial<FertiliserStep>): FertiliserStep => ({
    key: 'basal', label: 'Basal', product: 'Compound D', rate_text: '200-300 kg/ha',
    rate_low: 200, rate_high: 300, rate_unit: 'kg',
    amount_low: 480, amount_high: 720,
    timing_text: 'At planting', days_after_planting: 0,
    scheduled_date: '2026-11-15', stage_code: null, application: null,
    why: '', optional: false, conditional_on: null,
    ...over,
})

// --- Season status ----------------------------------------------------------

test('each season status has a distinct colour and label', () => {
    const statuses = ['planned', 'active', 'harvested', 'closed', 'abandoned'] as const
    const colors = statuses.map((s) => seasonStatusStyle(s).color)
    assert.equal(new Set(colors).size, colors.length)
    assert.equal(seasonStatusStyle('active').label, 'Growing')
})

test('only actionable statuses offer a next action', () => {
    assert.equal(seasonStatusStyle('planned').nextAction, 'Confirm planting')
    assert.equal(seasonStatusStyle('active').nextAction, 'Record harvest')
    // Terminal states must not invite an action that would fail server-side.
    assert.equal(seasonStatusStyle('closed').nextAction, null)
    assert.equal(seasonStatusStyle('abandoned').nextAction, null)
})

test('an unknown status degrades instead of throwing', () => {
    assert.equal(seasonStatusStyle(null).label, 'Unknown')
    assert.equal(seasonStatusStyle(undefined).nextAction, null)
})

test('seasons split into live, active and history', () => {
    const seasons = [
        season({ id: 'a', status: 'planned' }),
        season({ id: 'b', status: 'active' }),
        season({ id: 'c', status: 'closed' }),
        season({ id: 'd', status: 'abandoned' }),
        season({ id: 'e', status: 'harvested' }),
    ]
    assert.deepEqual(liveSeasons(seasons).map((s) => s.id), ['a', 'b'])
    assert.equal(activeSeason(seasons)?.id, 'b')
    assert.deepEqual(closedSeasons(seasons).map((s) => s.id), ['c', 'e'])
})

test('a field with no active season reports null rather than guessing', () => {
    assert.equal(activeSeason([season({ status: 'planned' })]), null)
    assert.equal(activeSeason([]), null)
})

// --- Rotation risk ----------------------------------------------------------

test('rotation risk escalates in colour and prominence', () => {
    assert.equal(rotationRiskStyle('high').prominent, true)
    assert.equal(rotationRiskStyle('moderate').prominent, true)
    // A good rotation is reassurance, not an interruption.
    assert.equal(rotationRiskStyle('low').prominent, false)
    assert.equal(rotationRiskStyle('unknown').prominent, false)
})

test('unknown rotation risk reads as missing history, not as safe', () => {
    assert.equal(rotationRiskStyle('unknown').label, 'No history yet')
    assert.notEqual(rotationRiskStyle('unknown').color, rotationRiskStyle('low').color)
})

// --- Stand verdicts ---------------------------------------------------------

test('only thin stands are flagged as actionable', () => {
    assert.equal(standVerdictStyle('good').actionable, false)
    assert.equal(standVerdictStyle('acceptable').actionable, false)
    assert.equal(standVerdictStyle('thin').actionable, true)
    assert.equal(standVerdictStyle('severely_thin').actionable, true)
})

test('an unassessed stand is not styled as a good one', () => {
    assert.equal(standVerdictStyle(null).label, 'Not assessed')
    assert.notEqual(standVerdictStyle(null).color, standVerdictStyle('good').color)
})

// --- Formatters -------------------------------------------------------------

test('population is grouped so it reads as a quantity', () => {
    assert.equal(formatPopulation(44000), '44,000')
    assert.equal(formatPopulation(350000), '350,000')
})

test('missing population shows a dash rather than zero', () => {
    // "0 plants/ha" would be a claim; "—" is the absence of one.
    assert.equal(formatPopulation(null), '—')
    assert.equal(formatPopulation(undefined), '—')
    assert.equal(formatPopulation(NaN), '—')
})

test('spacing is expressed as an executable instruction', () => {
    assert.equal(formatSpacing(90, 25.3), '90 cm rows × 25 cm apart')
})

test('spacing needs both numbers to mean anything', () => {
    assert.equal(formatSpacing(90, null), '—')
    assert.equal(formatSpacing(null, 25), '—')
})

test('dates omit the year within the current year and include it otherwise', () => {
    const ref = new Date('2026-08-05T00:00:00Z')
    assert.equal(formatShortDate('2026-12-13', ref), '13 Dec')
    assert.equal(formatShortDate('2027-01-10', ref), '10 Jan 2027')
})

test('an absent or malformed date is a dash, never "Invalid Date"', () => {
    assert.equal(formatShortDate(null), '—')
    assert.equal(formatShortDate('not-a-date'), '—')
})

test('daysUntil counts forward and backward from today', () => {
    const today = new Date('2026-11-15T09:00:00Z')
    assert.equal(daysUntil('2026-11-15', today), 0)
    assert.equal(daysUntil('2026-11-27', today), 12)
    assert.equal(daysUntil('2026-11-06', today), -9)
})

test('daysUntil ignores the time of day', () => {
    // A step due "today" must not flip to yesterday because it is now 23:00.
    const late = new Date('2026-11-15T23:59:00Z')
    assert.equal(daysUntil('2026-11-15', late), 0)
})

test('relative labels use countdown language', () => {
    const today = new Date('2026-11-15T00:00:00Z')
    assert.equal(relativeDayLabel('2026-11-15', today), 'today')
    assert.equal(relativeDayLabel('2026-11-16', today), 'tomorrow')
    assert.equal(relativeDayLabel('2026-11-14', today), 'yesterday')
    assert.equal(relativeDayLabel('2026-11-27', today), 'in 12 days')
    assert.equal(relativeDayLabel('2026-11-06', today), '9 days ago')
})

// --- Fertiliser steps -------------------------------------------------------

test('step amounts show the whole-field range', () => {
    assert.equal(formatStepAmount(step({})), '480–720 kg')
})

test('a single-valued rate is not shown as a range', () => {
    assert.equal(formatStepAmount(step({ amount_low: 4.8, amount_high: 4.8 })), '4.8 kg')
})

test('an unknown field area falls back to the per-hectare rate, never blank', () => {
    const s = step({ amount_low: null, amount_high: null, rate_text: '200-300 kg/ha' })
    assert.equal(formatStepAmount(s), '200-300 kg/ha')
})

test('scheduled work is separated from conditional work', () => {
    const steps = [
        step({ key: 'basal', optional: false }),
        step({ key: 'top_dress_1', optional: false }),
        step({ key: 'foliar', optional: true }),
    ]
    const { scheduled, conditional } = splitProgramme(steps)
    assert.deepEqual(scheduled.map((s) => s.key), ['basal', 'top_dress_1'])
    assert.deepEqual(conditional.map((s) => s.key), ['foliar'])
})

test('nextDueStep picks the soonest scheduled step still ahead', () => {
    const today = new Date('2026-11-20T00:00:00Z')
    const steps = [
        step({ key: 'basal', scheduled_date: '2026-11-15' }),      // past
        step({ key: 'top_dress_1', scheduled_date: '2026-12-13' }),
        step({ key: 'top_dress_2', scheduled_date: '2026-12-27' }),
    ]
    assert.equal(nextDueStep(steps, today)?.key, 'top_dress_1')
})

test('nextDueStep skips conditional steps even when they are sooner', () => {
    const today = new Date('2026-11-20T00:00:00Z')
    const steps = [
        step({ key: 'foliar', scheduled_date: '2026-11-29', optional: true }),
        step({ key: 'top_dress_1', scheduled_date: '2026-12-13' }),
    ]
    assert.equal(nextDueStep(steps, today)?.key, 'top_dress_1')
})

test('nextDueStep returns null when the programme is done', () => {
    const today = new Date('2027-03-01T00:00:00Z')
    assert.equal(nextDueStep([step({ scheduled_date: '2026-11-15' })], today), null)
    assert.equal(nextDueStep([], today), null)
})
