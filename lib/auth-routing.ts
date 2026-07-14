'use client'

/**
 * auth-routing — the single definition of "where does a user go after
 * authenticating", shared by the sign-in handler, the OAuth/email-confirm
 * callback (`/auth/callback`), the password-reset page, and onboarding's
 * already-onboarded skip. Before this existed the logic lived inline in the
 * sign-in handler only, so Google users were always dumped on /onboarding —
 * including returning users who finished onboarding long ago.
 *
 * Pure decision helpers are exported separately from the effectful resolver so
 * they can be unit-tested without Supabase (same pattern as roleAccess.ts).
 */

import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Pure decisions (unit-tested in tests/auth-flow.test.ts)
// ---------------------------------------------------------------------------

/** Post-auth landing: onboarding until the profile is complete, then the
 * role-appropriate app shell. Role `null` (lookup failed) falls back to the
 * consumer dashboard — never lock a user out because a role fetch blipped. */
export function destinationFor(
    hasCompletedOnboarding: boolean,
    role: string | null | undefined,
): string {
    if (!hasCompletedOnboarding) return '/onboarding'
    return role === 'institutional' ? '/portfolio/today' : '/dashboard'
}

/**
 * Detect Supabase's anti-enumeration "fake success" for an existing confirmed
 * email: signUp() resolves without error but the returned user has an empty
 * `identities` array and no session. Without this check the UI tells an
 * already-registered person "check your email!" — and no email ever comes.
 */
export function isExistingUserSignUp(data: {
    user: { identities?: unknown[] | null } | null
    session: unknown | null
}): boolean {
    return !!data.user && !data.session && (data.user.identities?.length ?? 0) === 0
}

/** Map an auth-callback failure to a message a farmer can act on. */
export function friendlyCallbackError(
    errorCode: string | null,
    errorDescription: string | null,
): string {
    if (errorCode === 'access_denied') {
        // User cancelled the Google consent screen, or the link was already used.
        return 'Sign-in was cancelled or the link has already been used. Please try again.'
    }
    if (errorDescription && /expired/i.test(errorDescription)) {
        return 'This link has expired. Please sign in or request a new one.'
    }
    if (errorDescription) return errorDescription
    return 'We could not complete sign-in. If you opened a link from your email, try opening it in the same browser you signed up in — or just sign in below.'
}

// ---------------------------------------------------------------------------
// Effectful resolver
// ---------------------------------------------------------------------------

/**
 * Decide the post-auth destination for the signed-in user: reads the profile
 * (onboarding completeness = full_name present) and, when onboarded, the
 * canonical backend role. A failed profile read routes to /onboarding — its
 * upsert is idempotent, so the worst case for a returning user during a DB
 * blip is re-confirming their details, never a dead end.
 */
export async function resolvePostAuthDestination(userId: string): Promise<string> {
    let onboarded = false
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single()
        onboarded = !!profile?.full_name
    } catch {
        onboarded = false
    }
    if (!onboarded) return destinationFor(false, null)

    // Dynamic import keeps this module's static graph free of SWR for tests.
    const { fetchUserRoleOnce } = await import('@/hooks/useUserRole')
    const roleCtx = await fetchUserRoleOnce()
    return destinationFor(true, roleCtx?.role ?? null)
}
