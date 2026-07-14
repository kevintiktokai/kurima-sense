// Signup/sign-in path tests (production-readiness follow-up). Run with:
// npm test (tsx --test). Covers the pure post-auth routing decisions and the
// Supabase signUp anti-enumeration detection, plus source invariants on the
// auth pages (redirect targets must point at the callback, not /onboarding).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
    destinationFor,
    isExistingUserSignUp,
    friendlyCallbackError,
} from '../lib/auth-routing'

// ---------------------------------------------------------------------------
// 1. destinationFor — where a user lands after authenticating
// ---------------------------------------------------------------------------
test('incomplete profile always routes to onboarding, whatever the role', () => {
    assert.equal(destinationFor(false, null), '/onboarding')
    assert.equal(destinationFor(false, 'consumer'), '/onboarding')
    assert.equal(destinationFor(false, 'institutional'), '/onboarding')
})

test('onboarded institutional user routes to the portfolio shell', () => {
    assert.equal(destinationFor(true, 'institutional'), '/portfolio/today')
})

test('onboarded consumer and admin route to the dashboard', () => {
    assert.equal(destinationFor(true, 'consumer'), '/dashboard')
    assert.equal(destinationFor(true, 'admin'), '/dashboard')
})

test('role lookup failure falls back to the dashboard, never a dead end', () => {
    assert.equal(destinationFor(true, null), '/dashboard')
    assert.equal(destinationFor(true, undefined), '/dashboard')
})

// ---------------------------------------------------------------------------
// 2. isExistingUserSignUp — Supabase anti-enumeration "fake success"
// ---------------------------------------------------------------------------
test('existing confirmed email: user with empty identities and no session', () => {
    assert.equal(isExistingUserSignUp({ user: { identities: [] }, session: null }), true)
})

test('genuinely new user (identities populated) is not flagged', () => {
    assert.equal(isExistingUserSignUp({ user: { identities: [{ id: 'x' }] }, session: null }), false)
})

test('auto-confirmed signup (session present) is not flagged', () => {
    assert.equal(
        isExistingUserSignUp({ user: { identities: [{ id: 'x' }] }, session: { token: 'y' } }),
        false,
    )
})

test('null user (error path) is not flagged', () => {
    assert.equal(isExistingUserSignUp({ user: null, session: null }), false)
})

test('missing identities field is treated as existing-user fake success', () => {
    // Some SDK versions omit identities entirely on the anti-enumeration path.
    assert.equal(isExistingUserSignUp({ user: {}, session: null }), true)
})

// ---------------------------------------------------------------------------
// 3. friendlyCallbackError — actionable messages, never raw codes
// ---------------------------------------------------------------------------
test('consent-cancelled maps to a retry message', () => {
    assert.match(friendlyCallbackError('access_denied', null), /try again/i)
})

test('expired links say expired', () => {
    assert.match(friendlyCallbackError(null, 'Email link is invalid or has expired'), /expired/i)
})

test('unknown failures still return guidance, not an empty string', () => {
    const msg = friendlyCallbackError(null, null)
    assert.ok(msg.length > 20)
    assert.match(msg, /sign in/i)
})

// ---------------------------------------------------------------------------
// 4. Source invariants — the redirect targets that make the flows work
// ---------------------------------------------------------------------------
const authPage = readFileSync('app/auth/page.tsx', 'utf8')

test('OAuth and email-confirm redirects land on /auth/callback, not /onboarding', () => {
    assert.match(authPage, /redirectTo: `\$\{window\.location\.origin\}\/auth\/callback`/)
    assert.match(authPage, /emailRedirectTo: `\$\{window\.location\.origin\}\/auth\/callback`/)
    assert.doesNotMatch(authPage, /RedirectTo: `\$\{window\.location\.origin\}\/onboarding`/)
})

test('password reset email lands on /auth/reset', () => {
    assert.match(authPage, /resetPasswordForEmail/)
    assert.match(authPage, /\/auth\/reset/)
})

test('signup handles the already-registered fake success', () => {
    assert.match(authPage, /isExistingUserSignUp/)
})

const onboardingPage = readFileSync('app/onboarding/page.tsx', 'utf8')

test('onboarding skips already-onboarded users via the shared resolver', () => {
    assert.match(onboardingPage, /resolvePostAuthDestination/)
})

const callbackPage = readFileSync('app/auth/callback/page.tsx', 'utf8')

test('callback exchanges the code and has a failure state', () => {
    assert.match(callbackPage, /exchangeCodeForSession/)
    assert.match(callbackPage, /friendlyCallbackError/)
})
