// Flue-curing on the farmer's screen.
//
// The backend decides the agronomy; this file guards the two ways the frontend
// can misrepresent it:
//
// 1. **Silence that means "not applicable" vs silence that means "broken".**
//    The endpoint answers 204 for any crop that is not flue-cured. `res.json()`
//    on an empty body throws, the card catches nothing and renders nothing —
//    and a real outage would look identical to the correct behaviour. Nothing
//    fails, and nobody finds out.
//
// 2. **Filling in a number the backend declined to give.** A barn with no
//    published fuel efficiency must show no fuel figure, not a zero and not a
//    borrowed one.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
    barnLabel,
    formatRange,
    fuelBudgetKg,
    isRenderable,
    stageSummary,
} from '../lib/curing-utils'
import type { CuringBarnOption, CuringPlan, CuringStage } from '../lib/planning-types'

const ROOT = process.cwd()

// --- fixtures ---------------------------------------------------------------

const stage = (over: Partial<CuringStage> = {}): CuringStage => ({
    key: 'colouring',
    name: 'Colouring (yellowing)',
    temperature_c: [30, 40],
    duration_days: [1, 2],
    relative_humidity_pct: 85,
    what_happens: 'Colour is fixed.',
    watch_for: 'Drying before the colour has fixed sets green.',
    ...over,
})

const barn = (over: Partial<CuringBarnOption> = {}): CuringBarnOption => ({
    key: 'rocket',
    name: 'Rocket barn',
    hectares: 0.7,
    hectares_tolerance: 0.2,
    fuel_kg_per_kg_cured: 4.0,
    fuel: 'wood',
    tiers: '4 tiers up × 5 tiers wide',
    suits: 'small-scale farmers',
    notes: '',
    count: 3,
    covers_hectares: 2.1,
    ...over,
})

const plan = (over: Partial<CuringPlan> = {}): CuringPlan => ({
    crop: 'Tobacco',
    stages: [stage()],
    total_days: [7, 10],
    conditioning_moisture_pct: [12, 15],
    barn_options: [barn()],
    area_hectares: 2,
    warnings: [],
    ...over,
})

// --- Ranges -----------------------------------------------------------------

test('a range reads as a range, and a single value as a single value', () => {
    assert.equal(formatRange([30, 40]), '30–40')
    assert.equal(formatRange([65, 65]), '65')
})

test('ranges use an en dash, not a hyphen', () => {
    // At phone sizes "30-40 °C" reads as a subtraction or a part number. This is
    // the same call the establishment briefing makes on the backend, and the two
    // surfaces have to look like they came from one product.
    assert.ok(formatRange([30, 40]).includes('–'))
    assert.ok(!formatRange([30, 40]).includes('-'))
})

// --- Stage summaries --------------------------------------------------------

test('a stage leads with the temperature and the days', () => {
    const text = stageSummary(stage())
    assert.ok(text.startsWith('30–40 °C'))
    assert.ok(text.includes('1–2 days'))
})

test('humidity shows only for the stage that has a published target', () => {
    // Colouring is held near 85% on purpose — it is the counter-intuitive
    // instruction in the whole cure. The other two stages are not run to a
    // humidity target at all, and printing "humidity: —" would imply the number
    // exists and we lost it.
    assert.ok(stageSummary(stage()).includes('85% humidity'))
    const drying = stage({ key: 'lamina_drying', relative_humidity_pct: null })
    assert.ok(!stageSummary(drying).includes('humidity'))
})

// --- Barns ------------------------------------------------------------------

test('a barn is labelled with how many of them this field needs', () => {
    assert.equal(barnLabel(barn({ count: 4, name: 'Plastic barn' })), '4 × Plastic barn')
    assert.equal(barnLabel(barn({ count: 1 })), '1 × Rocket barn')
})

test('fuel is quoted only where the source publishes a figure', () => {
    // The conventional up-draught has no efficiency figure. Borrowing the
    // down-draught's number would invent the one thing a grower plans a wood or
    // coal purchase around.
    assert.equal(fuelBudgetKg(barn(), 2000), 8000)
    assert.equal(fuelBudgetKg(barn({ fuel_kg_per_kg_cured: null }), 2000), null)
})

test('fuel declines on a quantity that is not a quantity', () => {
    assert.equal(fuelBudgetKg(barn(), 0), null)
    assert.equal(fuelBudgetKg(barn(), -1), null)
    assert.equal(fuelBudgetKg(barn(), null), null)
    assert.equal(fuelBudgetKg(barn(), undefined), null)
    assert.equal(fuelBudgetKg(barn(), NaN), null)
})

test('the fuel figure matches the backend, so the chat and the screen agree', () => {
    // services/planning/curing.py: fuel_required_kg is the same multiplication
    // with the same declines. A farmer who asks the chat and then opens the card
    // must not get two answers.
    const backendPlastic = 4.5
    assert.equal(
        fuelBudgetKg(barn({ fuel_kg_per_kg_cured: backendPlastic, fuel: 'wood' }), 1000),
        4500
    )
})

// --- Renderability ----------------------------------------------------------

test('no plan is an answer, not a card', () => {
    // 204 from the backend: the field is fine, the crop is fine, curing simply
    // does not apply. Silent absence beats a "does not apply" card on the
    // farmer's main surface.
    assert.equal(isRenderable(null), false)
    assert.equal(isRenderable(undefined), false)
    assert.equal(isRenderable(plan({ stages: [] })), false)
    assert.equal(isRenderable(plan()), true)
})

// --- Wiring guards ----------------------------------------------------------

test('the curing hook treats 204 as an answer rather than a parse error', () => {
    // The trap: `authedJson` calls res.json(), an empty body throws a
    // SyntaxError, SWR reports an error, and the card renders nothing — which is
    // exactly what it does when curing legitimately does not apply. A genuine
    // outage would be indistinguishable from correct behaviour.
    const hook = readFileSync(join(ROOT, 'hooks', 'useSeasons.ts'), 'utf8')
    const curing = hook.slice(hook.indexOf('export function useCuringPlan'))
    assert.ok(
        /authedJsonOrNull</.test(curing.slice(0, 900)),
        'useCuringPlan must use the 204-aware fetcher',
    )
    assert.ok(
        /if \(res\.status === 204\) return null/.test(hook),
        'authedJsonOrNull must actually short-circuit on 204',
    )
})

test('the card never renders a "does not apply" state', () => {
    // The rule this repo states and this card has the most temptation to break:
    // the backend returns nothing for maize, and the obvious kindness is to say
    // "curing does not apply to this crop". On the farmer's main surface that is
    // a card's worth of space spent telling them something they know.
    const card = readFileSync(
        join(ROOT, 'components', 'planning', 'CuringCard.tsx'),
        'utf8',
    )
    assert.ok(!/does not apply/i.test(card))
    assert.ok(!/not applicable/i.test(card))
    assert.ok(/return null/.test(card))
})

test('the curing card is actually on the field page', () => {
    // A perfect card nobody mounts is the state PostHarvestCard's backend sat in
    // for months, with nothing failing.
    const page = readFileSync(join(ROOT, 'app', 'fields', '[id]', 'page.tsx'), 'utf8')
    assert.ok(page.includes('<CuringCard'))
    assert.ok(page.includes("from '@/components/planning/CuringCard'"))
})

test('text on the brand fill uses the on-primary token, never white', () => {
    // White is 2.31:1 against the brand green and fails WCAG AA. Guarded
    // globally in brand-tokens.test.ts; asserted here too because this card
    // introduces a new --ee-primary panel and that is where the mistake gets
    // made.
    const card = readFileSync(
        join(ROOT, 'components', 'planning', 'CuringCard.tsx'),
        'utf8',
    )
    const primaryPanels = card.match(/background: 'var\(--ee-primary\)'[^}]*/g) ?? []
    assert.ok(primaryPanels.length > 0, 'expected at least one brand-fill panel')
    for (const panel of primaryPanels) {
        assert.ok(
            panel.includes('var(--ee-on-primary)'),
            `brand fill without the on-primary token: ${panel}`,
        )
        assert.ok(!/#fff|white/i.test(panel), `white on brand green: ${panel}`)
    }
})
