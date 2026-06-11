// Regression locks for the aggregator cleanup pass.
// Run with: npm test  (tsx --test 'tests/**/*.test.ts')
//
// These assert the cleanup invariants so the legacy code paths can't creep back:
//  - the field detail page makes no legacy data calls,
//  - confidence is never rendered as a raw fraction,
//  - cropThresholds is gone from production code.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { confidenceFromFraction, formatConfidence, scoreToLabel } from '../lib/field-state-types'

const FIELD_DETAIL = readFileSync('app/fields/[id]/page.tsx', 'utf8')
const CROP_PLAN = readFileSync('components/dashboard/CropPlan.tsx', 'utf8')

test('field detail page makes no legacy data calls', () => {
    assert.doesNotMatch(FIELD_DETAIL, /\/fields\/\$\{fieldId\}\/insight/, 'legacy /fields/{id}/insight fetch must be gone')
    assert.doesNotMatch(FIELD_DETAIL, /api\.getFieldHistory/, 'api.getFieldHistory must not be called')
    assert.doesNotMatch(FIELD_DETAIL, /api\.generateYieldProjection/, 'api.generateYieldProjection must not be called')
    assert.doesNotMatch(FIELD_DETAIL, /api\.getFields\(/, 'api.getFields() must not be called')
})

test('cropThresholds is removed from the field detail page', () => {
    assert.doesNotMatch(FIELD_DETAIL, /cropThresholds/, 'cropThresholds table must be deleted, not kept as fallback')
})

test('field detail reads display values from the aggregator (fs)', () => {
    assert.match(FIELD_DETAIL, /useFieldState\(fieldId\)/)
    assert.match(FIELD_DETAIL, /fs\.indices\?\.current\?\.ndvi/)
    assert.match(FIELD_DETAIL, /fs\.water_balance\?\.soil_moisture_pct/)
    assert.match(FIELD_DETAIL, /fs\.season\?\.days_since_planted/)
    assert.match(FIELD_DETAIL, /fs\.meta\?\.as_of_satellite_pass/)
    // Trend chart Y-axis carries an explicit, labelled unit.
    assert.match(FIELD_DETAIL, /KurimaScore \(0–100\)/)
})

test('confidence is never a fractional percentage', () => {
    // The exact 0.6% bug pattern must not appear in the Plan render.
    assert.doesNotMatch(CROP_PLAN, /Confidence:\s*\{plan\.confidence_score\}%/)
    // The helper turns a 0-1 fraction into an integer pct, never a fraction.
    const c = confidenceFromFraction(0.6)
    assert.equal(c.band, 'medium')
    assert.equal(c.pct, 60)
    assert.ok(Number.isInteger(c.pct))
    // And the formatted string never contains a fractional percent.
    const rendered = `Confidence: ${formatConfidence(c.band, c.pct)}`
    assert.doesNotMatch(rendered, /0\.\d+%/)
    assert.equal(rendered, 'Confidence: Medium (60%)')
})

test('a value already in percent form is normalised, not doubled', () => {
    assert.deepEqual(confidenceFromFraction(60), { band: 'medium', pct: 60 })
})

test('scoreToLabel mirrors the backend SCORE_BANDS vocabulary', () => {
    assert.equal(scoreToLabel(90).label, 'Thriving')
    assert.equal(scoreToLabel(72).label, 'Strong')
    assert.equal(scoreToLabel(60).label, 'Adequate')
    assert.equal(scoreToLabel(45).label, 'Stressed')
    assert.equal(scoreToLabel(30).label, 'Distressed')
    assert.equal(scoreToLabel(10).label, 'Critical')
})
