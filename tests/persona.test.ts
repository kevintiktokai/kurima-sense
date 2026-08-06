// Persona-aware presentation.
//
// The rule under test: persona changes HOW something is said and WHICH
// instructions apply — never the agronomy. A target plant population is the
// same number for everyone; only the way you hit it changes.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    establishmentEquipmentTips,
    establishmentHandTips,
    personaProfile,
    seedQuantityLabel,
    showsEquipmentAdvice,
    spacingCheckInstruction,
    stageLabel,
} from '../lib/persona'

// --- Profiles ----------------------------------------------------------------

test('a commercial farmer is treated as mechanised', () => {
    const p = personaProfile('farmer')
    assert.equal(p.usesEquipment, true)
    assert.equal(p.pacesRatherThanMeasures, false)
})

test('a smallholder is not', () => {
    const p = personaProfile('smallholder')
    assert.equal(p.usesEquipment, false)
    assert.equal(p.pacesRatherThanMeasures, true)
    assert.equal(p.thinksInPlots, true)
})

test('an agronomist wants stage codes', () => {
    assert.equal(personaProfile('agronomist').wantsStageCodes, true)
    assert.equal(personaProfile('hobbyist').wantsStageCodes, false)
})

test('an unknown persona falls back to smallholder, not commercial', () => {
    // Wrong in this direction gives someone paces they did not need. Wrong the
    // other way tells a person with a hoe to calibrate a planter they do not
    // own, which is what makes an app feel like it was not built for you.
    for (const value of [null, undefined, '', 'something-else']) {
        assert.equal(personaProfile(value).usesEquipment, false)
        assert.equal(personaProfile(value).pacesRatherThanMeasures, true)
    }
})

test('persona matching ignores case and padding', () => {
    assert.equal(personaProfile('  FARMER ').usesEquipment, true)
})

// --- Equipment advice ---------------------------------------------------------

test('machinery advice is shown only to those with machinery', () => {
    assert.equal(showsEquipmentAdvice('farmer'), true)
    assert.equal(showsEquipmentAdvice('agronomist'), true)
    assert.equal(showsEquipmentAdvice('smallholder'), false)
    assert.equal(showsEquipmentAdvice('hobbyist'), false)
})

test('planter advice never reaches a hand planter', () => {
    // "Calibrate your planter" is not a coherent instruction to someone
    // planting by hand.
    assert.deepEqual(establishmentEquipmentTips('smallholder'), [])
    assert.ok(establishmentEquipmentTips('farmer').length > 0)
    assert.match(establishmentEquipmentTips('farmer')[0], /Calibrate the planter/)
})

test('hand-planting advice never reaches a mechanised grower', () => {
    assert.deepEqual(establishmentHandTips('farmer'), [])
    assert.ok(establishmentHandTips('smallholder').length > 0)
})

test('the two tip sets are mutually exclusive for every persona', () => {
    // Nobody should see both, and nobody should see neither.
    for (const p of ['farmer', 'smallholder', 'agronomist', 'hobbyist', null]) {
        const equip = establishmentEquipmentTips(p)
        const hand = establishmentHandTips(p)
        assert.ok(
            (equip.length > 0) !== (hand.length > 0),
            `${p} got ${equip.length} equipment and ${hand.length} hand tips`
        )
    }
})

// --- Stage register -----------------------------------------------------------

test('an agronomist gets the stage code', () => {
    assert.equal(stageLabel('V4-V6', 'when the crop is knee-high', 'agronomist'), 'V4-V6')
})

test('a smallholder gets the plain description', () => {
    assert.equal(
        stageLabel('V4-V6', 'when the crop is knee-high', 'smallholder'),
        'when the crop is knee-high'
    )
})

test('a missing plain description falls back to the code rather than nothing', () => {
    assert.equal(stageLabel('V4-V6', null, 'smallholder'), 'V4-V6')
})

test('a missing code falls back to the description', () => {
    assert.equal(stageLabel(null, 'knee-high', 'agronomist'), 'knee-high')
})

// --- Spacing check ------------------------------------------------------------

test('a smallholder paces the row', () => {
    const s = spacingCheckInstruction(25, 'smallholder')
    assert.match(s, /Walk 4 paces/)
    assert.match(s, /count roughly/)
})

test('a commercial grower measures it', () => {
    const s = spacingCheckInstruction(25, 'farmer')
    assert.match(s, /Measure 10 m/)
    assert.doesNotMatch(s, /paces/)
})

test('both personas are told to check the same physical thing', () => {
    // The agronomy is identical; only the instrument differs. At 25 cm spacing
    // that is 4 plants per metre either way.
    const paced = spacingCheckInstruction(25, 'smallholder')
    const measured = spacingCheckInstruction(25, 'farmer')
    const pacedPlants = Number(/roughly (\d+) plants/.exec(paced)?.[1])
    const measuredPlants = Number(/count (\d+) plants/.exec(measured)?.[1])
    assert.equal(Math.round(pacedPlants / 3), Math.round(measuredPlants / 10))
})

test('no spacing means no instruction', () => {
    assert.equal(spacingCheckInstruction(null, 'smallholder'), '')
    assert.equal(spacingCheckInstruction(0, 'farmer'), '')
})

// --- Seed quantity ------------------------------------------------------------

test('someone thinking in plots gets the whole-field figure', () => {
    assert.equal(seedQuantityLabel(11, 26.4, 'smallholder'), '26.4 kg for this field')
})

test('someone thinking in hectares gets the rate', () => {
    assert.equal(seedQuantityLabel(11, 26.4, 'farmer'), '11 kg/ha')
})

test('an unknown field area still yields something usable', () => {
    assert.equal(seedQuantityLabel(11, null, 'smallholder'), '11 kg/ha')
    assert.equal(seedQuantityLabel(null, 26.4, 'farmer'), '26.4 kg')
})

test('no seed figures at all render a dash, not a zero', () => {
    assert.equal(seedQuantityLabel(null, null, 'farmer'), '—')
})
