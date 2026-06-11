// Navigation connectivity tests (Depth Sprint PR B). Run: npm test.
// Pure nav-links helpers tested directly; cross-screen wiring + RoleGuard
// boundary checked via source invariants (node:test has no DOM).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
    routeForField,
    routeForGrower,
    withFrom,
    parseFrom,
    isSafeRelativeHref,
    isTabActive,
    BACK_DEFAULTS,
    type ParamsLike,
} from '../lib/nav-links'

const params = (o: Record<string, string>): ParamsLike => ({ get: (k) => (k in o ? o[k] : null) })

// ---------------------------------------------------------------------------
// 1. Route builders
// ---------------------------------------------------------------------------

test('routeForField is audience-scoped', () => {
    assert.equal(routeForField('f1', 'consumer'), '/fields/f1')
    assert.equal(routeForField('f1', 'portfolio'), '/portfolio/fields/f1')
})

test('routeForGrower', () => {
    assert.equal(routeForGrower('g1'), '/portfolio/growers/g1')
})

// ---------------------------------------------------------------------------
// 2. withFrom encoding
// ---------------------------------------------------------------------------

test('withFrom appends encoded f / fh', () => {
    assert.equal(withFrom('/fields/1', 'Today', '/portfolio/today'),
        '/fields/1?f=Today&fh=%2Fportfolio%2Ftoday')
    assert.equal(withFrom('/fields/1', 'Tariro Moyo'), '/fields/1?f=Tariro%20Moyo')
    assert.equal(withFrom('/fields/1'), '/fields/1') // nothing to add
})

test('withFrom respects an existing query string', () => {
    assert.equal(withFrom('/x?y=1', 'A'), '/x?y=1&f=A')
})

// ---------------------------------------------------------------------------
// 3. parseFrom round-trip + defaults + validation
// ---------------------------------------------------------------------------

test('parseFrom round-trips a withFrom target', () => {
    const href = withFrom('/portfolio/fields/1', 'Growers', '/portfolio/growers/g9')
    const qs = href.split('?')[1]
    const sp = new URLSearchParams(qs)
    assert.deepEqual(parseFrom(sp, BACK_DEFAULTS.portfolioField),
        { label: 'Growers', href: '/portfolio/growers/g9' })
})

test('parseFrom falls back to the per-screen default when absent', () => {
    assert.deepEqual(parseFrom(params({}), BACK_DEFAULTS.consumerField), BACK_DEFAULTS.consumerField)
    assert.deepEqual(parseFrom(params({}), BACK_DEFAULTS.grower), BACK_DEFAULTS.grower)
})

test('parseFrom uses fallback label when only fh is present', () => {
    assert.deepEqual(parseFrom(params({ fh: '/portfolio/growers/g1' }), BACK_DEFAULTS.portfolioField),
        { label: 'Today', href: '/portfolio/growers/g1' })
})

test('parseFrom REJECTS non same-app hrefs (open-redirect guard)', () => {
    for (const evil of ['https://evil.com', '//evil.com', 'javascript:alert(1)', 'http://x', 'mailto:a@b.c']) {
        assert.deepEqual(
            parseFrom(params({ f: 'X', fh: evil }), BACK_DEFAULTS.portfolioField),
            BACK_DEFAULTS.portfolioField,
            `must reject ${evil}`,
        )
    }
})

test('isSafeRelativeHref', () => {
    assert.equal(isSafeRelativeHref('/portfolio/today'), true)
    assert.equal(isSafeRelativeHref('/fields/1?f=A'), true)
    assert.equal(isSafeRelativeHref('https://evil.com'), false)
    assert.equal(isSafeRelativeHref('//evil.com'), false)
    assert.equal(isSafeRelativeHref('javascript:x'), false)
    assert.equal(isSafeRelativeHref('relative/no/slash'), false)
})

// ---------------------------------------------------------------------------
// 4. isTabActive — exact + prefix (incl. detail routes)
// ---------------------------------------------------------------------------

test('isTabActive exact and sub-route prefix', () => {
    assert.equal(isTabActive('/portfolio/fields', '/portfolio/fields'), true)
    assert.equal(isTabActive('/portfolio/fields/abc', '/portfolio/fields'), true) // detail → Fields
    assert.equal(isTabActive('/portfolio/growers/g1', '/portfolio/growers'), true)
    assert.equal(isTabActive('/portfolio/today', '/portfolio/fields'), false)
    // sibling prefixes must not false-match without the '/' boundary
    assert.equal(isTabActive('/portfolio/fieldsX', '/portfolio/fields'), false)
    assert.equal(isTabActive(null, '/portfolio/fields'), false)
})

test('portfolio detail routes light up the right tab', () => {
    // mirrors components/portfolio/nav.ts behaviour through the shared helper
    assert.equal(isTabActive('/portfolio/fields/abc', '/portfolio/fields'), true)
    assert.equal(isTabActive('/portfolio/fields/abc', '/portfolio/growers'), false)
})

// ---------------------------------------------------------------------------
// 5. Source invariants — wiring + RoleGuard boundary
// ---------------------------------------------------------------------------

const overviewSrc = readFileSync('components/dashboard/Overview.tsx', 'utf8')
const consumerDetail = readFileSync('app/fields/[id]/page.tsx', 'utf8')
const portfolioDetail = readFileSync('app/portfolio/fields/[id]/page.tsx', 'utf8')
const growerDetail = readFileSync('app/portfolio/growers/[id]/page.tsx', 'utf8')
const planSrc = readFileSync('app/dashboard/plan/page.tsx', 'utf8')

test('dashboard worst-field card links to the field via routeForField', () => {
    assert.match(overviewSrc, /routeForField\(worstField\.field\.id, 'consumer'\)/)
    assert.match(overviewSrc, /href="\/dashboard\/fields"/) // avg score → fields list
})

test('portfolio field detail grower header links via routeForGrower', () => {
    assert.match(portfolioDetail, /routeForGrower\(priority\.grower_id\)/)
})

test('plan links to its selected field with a Plan back label', () => {
    assert.match(planSrc, /routeForField\(selectedField\.id, 'consumer'\)/)
    assert.match(planSrc, /'Plan'/)
})

test('detail pages have no bare router.back()', () => {
    for (const src of [consumerDetail, portfolioDetail, growerDetail]) {
        assert.ok(!/router\.back\(\)/.test(src), 'detail back must be an explicit href, not router.back()')
    }
})

test('detail back links resolve from parseFrom (deep-link safe)', () => {
    assert.match(consumerDetail, /parseFrom\(searchParams, BACK_DEFAULTS\.consumerField\)/)
    assert.match(portfolioDetail, /parseFrom\(searchParams, BACK_DEFAULTS\.portfolioField\)/)
    assert.match(growerDetail, /parseFrom\(searchParams, BACK_DEFAULTS\.grower\)/)
})

test('RoleGuard boundary: consumer screens never link into /portfolio', () => {
    for (const src of [overviewSrc, consumerDetail, planSrc]) {
        assert.ok(!/["'`]\/portfolio\//.test(src), 'consumer screen must not hardcode a /portfolio href')
    }
})

test('RoleGuard boundary: portfolio screens never link into the consumer tree', () => {
    for (const src of [portfolioDetail, growerDetail]) {
        assert.ok(!/["'`]\/dashboard\//.test(src), 'portfolio screen must not link to /dashboard')
        assert.ok(!/href=\{?["'`]\/fields\//.test(src), 'portfolio screen must not link to consumer /fields')
    }
})

test('nav active-state delegates to the shared isTabActive helper', () => {
    assert.match(readFileSync('components/portfolio/nav.ts', 'utf8'), /isTabActive\(/)
    assert.match(readFileSync('components/dashboard/MobileNav.tsx', 'utf8'), /isTabActive\(/)
    assert.match(readFileSync('components/dashboard/Sidebar.tsx', 'utf8'), /isTabActive\(/)
})
