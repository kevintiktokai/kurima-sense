// Responsive pass source invariants (Depth Sprint PR A). Run: npm test.
// Visual rendering can't be verified here, so these assert the structural
// guarantees of a purely-presentational pass: every product screen uses the
// shared PageContainer, charts stay width-responsive, no 100vw is introduced,
// and the consumer field-detail page's logic surface is untouched.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Product screens in scope (marketing/legal/utility pages are intentionally
// excluded — see docs/responsive_audit.md).
const SCREENS = [
    'app/dashboard/page.tsx',
    'app/dashboard/fields/page.tsx',
    'app/dashboard/plan/page.tsx',
    'app/dashboard/weather/page.tsx',
    'app/dashboard/chat/page.tsx',
    'app/dashboard/settings/page.tsx',
    'app/fields/[id]/page.tsx',
    'app/auth/page.tsx',
    'app/portfolio/today/page.tsx',
    'app/portfolio/fields/page.tsx',
    'app/portfolio/growers/page.tsx',
    'app/portfolio/growers/[id]/page.tsx',
    'app/portfolio/fields/[id]/page.tsx',
    'app/portfolio/alerts/page.tsx',
    'app/portfolio/reports/page.tsx',
]

const read = (p: string) => readFileSync(p, 'utf8')

// ---------------------------------------------------------------------------
// 1. PageContainer adoption
// ---------------------------------------------------------------------------

for (const screen of SCREENS) {
    test(`${screen} imports and renders PageContainer`, () => {
        const src = read(screen)
        assert.match(src, /from '@\/components\/layout\/PageContainer'/, 'must import PageContainer')
        assert.match(src, /<PageContainer/, 'must render PageContainer')
    })
}

// ---------------------------------------------------------------------------
// 2. PageContainer primitive contract
// ---------------------------------------------------------------------------

test('PageContainer is mobile-safe: no base mobile padding, only safe-area + responsive max-width', () => {
    const src = read('components/layout/PageContainer.tsx')
    // width caps live at md/lg only (mobile stays full width → pixel-identical)
    assert.match(src, /md:max-w-2xl lg:max-w-3xl/)
    assert.match(src, /lg:max-w-5xl/)
    assert.match(src, /safe-x/)
    // must NOT bake in unconditional mobile horizontal padding like "px-4"
    assert.ok(!/\bpx-4\b/.test(src), 'PageContainer must not add base mobile padding')
})

// ---------------------------------------------------------------------------
// 3. Charts stay width-responsive (no fixed numeric width props)
// ---------------------------------------------------------------------------

test('no recharts ResponsiveContainer uses a fixed numeric width', () => {
    for (const screen of SCREENS) {
        const src = read(screen)
        assert.ok(!/ResponsiveContainer[^>]*width=\{\s*\d/.test(src), `${screen} fixed chart width`)
    }
})

// ---------------------------------------------------------------------------
// 4. No 100vw introduced in the product screens
// ---------------------------------------------------------------------------

test('no 100vw width usage in product screens', () => {
    for (const screen of SCREENS) {
        assert.ok(!/100vw/.test(read(screen)), `${screen} must not use 100vw`)
    }
})

// ---------------------------------------------------------------------------
// 5. Safe-area utilities exist and the bottom navs use them
// ---------------------------------------------------------------------------

test('globals.css defines the safe-area utilities', () => {
    const css = read('app/globals.css')
    assert.match(css, /@utility safe-x/)
    assert.match(css, /@utility safe-pb/)
    assert.match(css, /env\(safe-area-inset-left\)/)
})

test('bottom navs respect safe-area insets', () => {
    assert.match(read('components/dashboard/MobileNav.tsx'), /safe-pb/)
    const portfolioNav = read('components/portfolio/PortfolioMobileNav.tsx')
    assert.match(portfolioNav, /safe-area-inset-bottom/)
    assert.match(portfolioNav, /max-w-md mx-auto/) // centred at width so icons don't stretch
})

// ---------------------------------------------------------------------------
// 6. Consumer field-detail logic untouched (presentational pass only)
// ---------------------------------------------------------------------------

test('consumer field detail keeps its data/logic surface (presentational change only)', () => {
    const src = read('app/fields/[id]/page.tsx')
    // The hooks, mutations and handlers that define behaviour are still present.
    for (const token of [
        'useFieldState', 'api.analyzeField', 'loadScoutingPins', 'saveScoutingPin',
        'handleExportGeoJSON', 'handleExportKML', 'triggerAnalysis',
    ]) {
        assert.match(src, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${token} must remain`)
    }
    // The change was additive wrapping, not a chart resize regression.
    assert.match(src, /<PageContainer variant="wide">/)
})

// ---------------------------------------------------------------------------
// 7. Field-detail 2-column arrangement at lg (portfolio variant)
// ---------------------------------------------------------------------------

test('portfolio field detail uses a 2-column lg arrangement', () => {
    const src = read('app/portfolio/fields/[id]/page.tsx')
    assert.match(src, /lg:grid lg:grid-cols-\[1\.6fr_1fr\]/)
})
