// Honest-error-state guards ("all my fields are wiped" incident, July 2026).
// A backend outage must render as an outage — never as an empty farm, and
// never as a permanently-spinning AI card. Source invariants keep the three
// layers (api strict mode, provider error flag, Overview rendering) wired.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const api = readFileSync('services/api.ts', 'utf8')
const provider = readFileSync('components/providers/DashboardDataProvider.tsx', 'utf8')
const overview = readFileSync('components/dashboard/Overview.tsx', 'utf8')

test('getFields supports strict mode that throws instead of faking empty', () => {
    assert.match(api, /getFields\(force = false, opts\?: \{ throwOnError\?: boolean \}\)/)
    assert.match(api, /if \(opts\?\.throwOnError\) throw/)
})

test('provider exposes backendError and uses strict fields fetch on fallback', () => {
    assert.match(provider, /backendError: boolean/)
    assert.match(provider, /setBackendError\(true\)/)
    assert.match(provider, /getFields\(true, \{ throwOnError: true \}\)/)
})

test('a failed fetch never clobbers known-good fields with an empty list', () => {
    // The catch path must set the error flag WITHOUT calling setFields([]).
    const catchBlock = provider.split("console.error('[DashboardData] fetch error:'")[1] ?? ''
    assert.match(catchBlock, /setBackendError\(true\)/)
    assert.doesNotMatch(catchBlock.split('finally')[0], /setFields\(/)
})

test('Overview renders the outage banner with a retry action', () => {
    assert.match(overview, /backendError && \(/)
    assert.match(overview, /not data loss/)
    assert.match(overview, /refreshAll\(\)/)
})

test('AI card explains itself instead of spinning forever', () => {
    // Zero fields → invite to add one; backend down → say so. "Analyzing…"
    // only when there is genuinely something to analyze.
    assert.match(overview, /Add your first field to unlock AI analysis/)
    assert.match(overview, /AI analysis is paused/)
})
