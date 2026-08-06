// Which inputs get asked execution questions, and what warning appears.
//
// The constraint under test is data-entry burden: the extra questions must
// appear only where how it went on genuinely changes the outcome. Asking a
// farmer logging glyphosate whether they incorporated it is noise, and noise
// teaches people to stop filling forms in.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    METHOD_OPTIONS,
    looksLikeNitrogen,
    looksLikeUrea,
    methodWarning,
} from '../lib/input-execution'

// --- Which inputs get the extra questions ------------------------------------

test('nitrogen products are recognised', () => {
    for (const t of ['Urea', 'AN', 'Ammonium Nitrate', 'CAN', 'urea top dress', 'UAN']) {
        assert.equal(looksLikeNitrogen(t), true, `${t} should be nitrogen`)
    }
})

test('non-nitrogen inputs are not asked about placement', () => {
    for (const t of ['Glyphosate', 'Lime', 'Actellic', 'Seed']) {
        assert.equal(looksLikeNitrogen(t), false, `${t} should not be nitrogen`)
    }
})

test('basal compounds are excluded', () => {
    // Compound D goes on with the seed — asking whether it was incorporated is
    // the wrong question for a product placed at planting.
    for (const t of ['Compound D', 'basal NPK', 'DAP', 'MAP']) {
        assert.equal(looksLikeNitrogen(t), false, `${t} should be excluded`)
    }
})

test('short nitrogen codes match as words, not substrings', () => {
    // As substrings these fire on ordinary words and put fertiliser questions
    // in front of farmers logging neither.
    assert.equal(looksLikeNitrogen('manure'), false)
    assert.equal(looksLikeNitrogen('planting'), false)
    assert.equal(looksLikeNitrogen('AN'), true)
    assert.equal(looksLikeNitrogen('an'), true)
})

test('matching ignores case and surrounding whitespace', () => {
    assert.equal(looksLikeNitrogen('  UREA  '), true)
    assert.equal(looksLikeNitrogen('Ammonium NITRATE'), true)
})

test('empty input asks nothing', () => {
    assert.equal(looksLikeNitrogen(''), false)
    assert.equal(looksLikeNitrogen(null), false)
    assert.equal(looksLikeNitrogen(undefined), false)
    assert.equal(looksLikeNitrogen('   '), false)
})

test('urea is distinguished from other nitrogen', () => {
    // Only urea volatilises off the surface.
    assert.equal(looksLikeUrea('Urea'), true)
    assert.equal(looksLikeUrea('urea top dress'), true)
    assert.equal(looksLikeUrea('Ammonium Nitrate'), false)
    assert.equal(looksLikeUrea(null), false)
})

// --- Method options ----------------------------------------------------------

test('methods are labelled in plain words, not agronomy jargon', () => {
    const labels = METHOD_OPTIONS.map((o) => o.label)
    assert.ok(labels.includes('Spread on top'))
    assert.ok(labels.includes('Worked in'))
    // "Broadcast" and "incorporated" are the API values, not what a farmer reads.
    assert.equal(labels.includes('broadcast'), false)
})

test('every method carries a hint and a distinct value', () => {
    const values = METHOD_OPTIONS.map((o) => o.value)
    assert.equal(new Set(values).size, values.length)
    for (const o of METHOD_OPTIONS) {
        assert.ok(o.hint, `${o.value} has no hint`)
    }
})

// --- The in-the-moment warning ------------------------------------------------

test('surface urea is warned about while the farmer can still act', () => {
    const w = methodWarning('Urea', 'broadcast')
    assert.ok(w)
    assert.match(w as string, /to the air/)
})

test('urea placed in the soil raises no warning', () => {
    assert.equal(methodWarning('Urea', 'banded'), null)
    assert.equal(methodWarning('Urea', 'incorporated'), null)
})

test('broadcasting non-urea nitrogen is not warned about', () => {
    // AN does not volatilise the way urea does; warning about it would be
    // crying wolf, and a form that lectures on every selection stops being used.
    assert.equal(methodWarning('Ammonium Nitrate', 'broadcast'), null)
})

test('no warning before a method is chosen', () => {
    assert.equal(methodWarning('Urea', null), null)
    assert.equal(methodWarning('Urea', undefined), null)
})
