// Analytics (Meta Pixel) + error-observability (Sentry) wiring tests.
// Both integrations must be dormant without their env vars and must never
// throw in a non-browser context; the funnel events must stay attached to
// the moments ad optimization depends on.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { trackEvent, analyticsEnabled } from '../lib/analytics'

// ---------------------------------------------------------------------------
// 1. Analytics is safe and silent outside a configured browser
// ---------------------------------------------------------------------------
test('trackEvent is a safe no-op without a browser/pixel', () => {
    assert.equal(analyticsEnabled(), false)
    assert.doesNotThrow(() => trackEvent('Lead'))
    assert.doesNotThrow(() => trackEvent('FieldCreated', { crop: 'Maize' }))
})

// ---------------------------------------------------------------------------
// 2. Funnel events are attached to the conversion moments
// ---------------------------------------------------------------------------
test('signup submission fires Lead', () => {
    const src = readFileSync('app/auth/page.tsx', 'utf8')
    assert.match(src, /trackEvent\('Lead'\)/)
})

test('onboarding completion fires CompleteRegistration for both account types', () => {
    const src = readFileSync('app/onboarding/page.tsx', 'utf8')
    assert.match(src, /trackEvent\('CompleteRegistration', \{ account_type: 'consumer' \}\)/)
    assert.match(src, /trackEvent\('CompleteRegistration', \{ account_type: 'institution' \}\)/)
})

test('field creation fires the FieldCreated activation event', () => {
    const src = readFileSync('services/api.ts', 'utf8')
    assert.match(src, /trackEvent\('FieldCreated'/)
})

test('the pixel component is mounted in the root layout and gated on its ID', () => {
    assert.match(readFileSync('app/layout.tsx', 'utf8'), /<MetaPixel \/>/)
    const pixel = readFileSync('components/analytics/MetaPixel.tsx', 'utf8')
    assert.match(pixel, /if \(!META_PIXEL_ID\) return null/)
})

// ---------------------------------------------------------------------------
// 3. Sentry wiring exists and stays dormant without a DSN
// ---------------------------------------------------------------------------
test('client + server Sentry init are gated on the DSN env var', () => {
    const client = readFileSync('instrumentation-client.ts', 'utf8')
    assert.match(client, /NEXT_PUBLIC_SENTRY_DSN/)
    assert.match(client, /if \(dsn\)/)

    const server = readFileSync('sentry.server.config.ts', 'utf8')
    assert.match(server, /if \(dsn\)/)
})

test('both error boundaries report to Sentry', () => {
    assert.match(readFileSync('app/error.tsx', 'utf8'), /Sentry\.captureException\(error\)/)
    assert.match(readFileSync('app/global-error.tsx', 'utf8'), /Sentry\.captureException\(error\)/)
})
