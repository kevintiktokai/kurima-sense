// Role-based routing tests (Workstream 2). Run with: npm test (tsx --test).
// Covers the pure routing-decision function and the portfolio nav config
// directly, plus source-invariant checks for the layouts/pages/hook (UI
// components aren't rendered in node:test).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { decideAccess } from '../components/auth/roleAccess'
import { PORTFOLIO_NAV_ITEMS, isPortfolioNavActive } from '../components/portfolio/nav'

const base = {
    authLoading: false,
    isAuthenticated: true,
    roleLoading: false,
    roleError: false,
}

// ---------------------------------------------------------------------------
// 1. RoleGuard decision logic
// ---------------------------------------------------------------------------
test('consumer can access consumer routes', () => {
    const d = decideAccess({ ...base, role: 'consumer', allowedRoles: ['consumer', 'admin'], redirectTo: '/portfolio/today' })
    assert.deepEqual(d, { kind: 'allow' })
})

test('consumer is redirected away from institutional routes', () => {
    const d = decideAccess({ ...base, role: 'consumer', allowedRoles: ['institutional'], redirectTo: '/dashboard' })
    assert.deepEqual(d, { kind: 'redirect', to: '/dashboard' })
})

test('institutional is redirected away from consumer routes', () => {
    const d = decideAccess({ ...base, role: 'institutional', allowedRoles: ['consumer', 'admin'], redirectTo: '/portfolio/today' })
    assert.deepEqual(d, { kind: 'redirect', to: '/portfolio/today' })
})

test('institutional can access institutional routes', () => {
    const d = decideAccess({ ...base, role: 'institutional', allowedRoles: ['institutional'], redirectTo: '/dashboard' })
    assert.deepEqual(d, { kind: 'allow' })
})

test('admin is treated as consumer (allowed on dashboard, blocked from portfolio)', () => {
    assert.deepEqual(
        decideAccess({ ...base, role: 'admin', allowedRoles: ['consumer', 'admin'], redirectTo: '/portfolio/today' }),
        { kind: 'allow' }
    )
    assert.deepEqual(
        decideAccess({ ...base, role: 'admin', allowedRoles: ['institutional'], redirectTo: '/dashboard' }),
        { kind: 'redirect', to: '/dashboard' }
    )
})

test('unauthenticated user is sent to login', () => {
    const d = decideAccess({ ...base, isAuthenticated: false, role: null, allowedRoles: ['consumer'], redirectTo: '/dashboard' })
    assert.deepEqual(d, { kind: 'login' })
})

test('auth still loading shows loading', () => {
    const d = decideAccess({ ...base, authLoading: true, role: null, allowedRoles: ['consumer'], redirectTo: '/dashboard' })
    assert.deepEqual(d, { kind: 'loading' })
})

test('role still loading shows loading', () => {
    const d = decideAccess({ ...base, roleLoading: true, role: null, allowedRoles: ['consumer'], redirectTo: '/dashboard' })
    assert.deepEqual(d, { kind: 'loading' })
})

test('role-fetch failure defaults to consumer (never locked out)', () => {
    // On a consumer route → allowed even though the lookup errored.
    assert.deepEqual(
        decideAccess({ ...base, roleError: true, role: null, allowedRoles: ['consumer', 'admin'], redirectTo: '/portfolio/today' }),
        { kind: 'allow' }
    )
    // On an institutional route → redirected to the consumer side, not stuck.
    assert.deepEqual(
        decideAccess({ ...base, roleError: true, role: null, allowedRoles: ['institutional'], redirectTo: '/dashboard' }),
        { kind: 'redirect', to: '/dashboard' }
    )
})

// ---------------------------------------------------------------------------
// 2. Portfolio navigation config
// ---------------------------------------------------------------------------
test('portfolio nav has the 5 tabs in order', () => {
    assert.deepEqual(
        PORTFOLIO_NAV_ITEMS.map((i) => i.id),
        ['today', 'fields', 'growers', 'alerts', 'reports']
    )
    assert.deepEqual(
        PORTFOLIO_NAV_ITEMS.map((i) => i.href),
        ['/portfolio/today', '/portfolio/fields', '/portfolio/growers', '/portfolio/alerts', '/portfolio/reports']
    )
    for (const item of PORTFOLIO_NAV_ITEMS) {
        assert.ok(item.label && item.icon, 'each tab has a label and icon')
    }
})

test('active route detection highlights the current tab', () => {
    assert.equal(isPortfolioNavActive('/portfolio/today', '/portfolio/today'), true)
    assert.equal(isPortfolioNavActive('/portfolio/today', '/portfolio'), true) // index alias
    assert.equal(isPortfolioNavActive('/portfolio/fields', '/portfolio/fields'), true)
    assert.equal(isPortfolioNavActive('/portfolio/fields', '/portfolio/today'), false)
    assert.equal(isPortfolioNavActive('/portfolio/alerts', null), false)
})

// ---------------------------------------------------------------------------
// 3. Source-invariant wiring checks
// ---------------------------------------------------------------------------
const DASH_LAYOUT = readFileSync('app/dashboard/layout.tsx', 'utf8')
const PORT_LAYOUT = readFileSync('app/portfolio/layout.tsx', 'utf8')
const AUTH_PAGE = readFileSync('app/auth/page.tsx', 'utf8')
const USER_ROLE_HOOK = readFileSync('hooks/useUserRole.ts', 'utf8')

test('consumer dashboard layout is guarded for consumer+admin -> portfolio', () => {
    assert.match(DASH_LAYOUT, /<RoleGuard[^>]*allowedRoles=\{\['consumer',\s*'admin'\]\}/)
    assert.match(DASH_LAYOUT, /redirectTo="\/portfolio\/today"/)
})

test('portfolio layout is guarded for institutional -> dashboard', () => {
    assert.match(PORT_LAYOUT, /allowedRoles=\{\['institutional'\]\}/)
    assert.match(PORT_LAYOUT, /redirectTo="\/dashboard"/)
})

test('login routes institutional users to the portfolio', () => {
    assert.match(AUTH_PAGE, /fetchUserRoleOnce/)
    assert.match(AUTH_PAGE, /\/portfolio\/today/)
})

test('useUserRole hits /me/role and defaults role to null', () => {
    assert.match(USER_ROLE_HOOK, /\/me\/role/)
    assert.match(USER_ROLE_HOOK, /role:\s*data\?\.role\s*\?\?\s*null/)
})

test('each placeholder portfolio page renders a header + empty-state cards', () => {
    // 'today' (PR 3), 'fields' (PR 5) and 'growers' (PR 6) graduated from
    // placeholder to real screens (see their dedicated test files); Alerts and
    // Reports remain placeholders.
    for (const page of ['alerts', 'reports']) {
        const src = readFileSync(`app/portfolio/${page}/page.tsx`, 'utf8')
        assert.match(src, /PortfolioPageHeader/, `${page} has a page header`)
        assert.match(src, /EmptyStateCard/, `${page} has empty-state cards`)
    }
})
