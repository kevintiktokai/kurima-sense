// Voice phrase parsing — pure logic. Run with: npm test (tsx --test).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { extractQuantity, normalizeUnit, wordsToNumber } from '../lib/voice/parse'

test('wordsToNumber handles common spoken numbers', () => {
    assert.equal(wordsToNumber('fifty'), 50)
    assert.equal(wordsToNumber('twenty five'), 25)
    assert.equal(wordsToNumber('two hundred'), 200)
    assert.equal(wordsToNumber('one thousand five hundred'), 1500)
    assert.equal(wordsToNumber('ninety nine'), 99)
})

test('wordsToNumber returns null when no number words present', () => {
    assert.equal(wordsToNumber('applied some fertilizer'), null)
})

test('normalizeUnit maps aliases to canonical units', () => {
    assert.equal(normalizeUnit('kilograms'), 'kg')
    assert.equal(normalizeUnit('kgs'), 'kg')
    assert.equal(normalizeUnit('litres'), 'L')
    assert.equal(normalizeUnit('tonnes'), 't')
    assert.equal(normalizeUnit('bag'), 'bags')
    assert.equal(normalizeUnit('hectares'), 'ha')
    assert.equal(normalizeUnit('widgets'), null)
    assert.equal(normalizeUnit(undefined), null)
})

test('extractQuantity reads digit number + unit', () => {
    assert.deepEqual(extractQuantity('applied 50 kg of compound D'), { quantity: 50, unit: 'kg' })
    assert.deepEqual(extractQuantity('2.5 litres'), { quantity: 2.5, unit: 'L' })
    assert.deepEqual(extractQuantity('100kgs'), { quantity: 100, unit: 'kg' })
})

test('extractQuantity reads spoken number + unit', () => {
    assert.deepEqual(extractQuantity('fifty kilograms'), { quantity: 50, unit: 'kg' })
    assert.deepEqual(extractQuantity('two hundred bags'), { quantity: 200, unit: 'bags' })
})

test('extractQuantity handles a bare number with no unit', () => {
    assert.deepEqual(extractQuantity('forty'), { quantity: 40, unit: null })
    assert.deepEqual(extractQuantity('12'), { quantity: 12, unit: null })
})

test('extractQuantity returns nulls when nothing numeric is present', () => {
    assert.deepEqual(extractQuantity('sprayed the north field'), { quantity: null, unit: null })
})
