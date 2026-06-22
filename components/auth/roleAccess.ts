// Pure role-routing decision logic — NO React/Next/SWR imports, so it can be
// unit-tested directly under `tsx --test`. RoleGuard wraps this with the router.

// Kept self-contained (its own union) so this module has zero dependencies; must
// stay in sync with UserRole in hooks/useUserRole.ts (only three roles).
export type UserRole = 'consumer' | 'institutional' | 'admin'

export type AccessDecision =
    | { kind: 'loading' }
    | { kind: 'login' }
    | { kind: 'allow' }
    | { kind: 'redirect'; to: string }
    | { kind: 'error' }

/**
 * Decide what a RoleGuard should do.
 *
 * - auth still loading            → loading
 * - not authenticated             → login
 * - role still loading (no error) → loading
 * - role confirmed & allowed      → allow
 * - role confirmed & not allowed  → redirect to `redirectTo`
 * - role UNKNOWN (error / null):
 *     · consumer is allowed here   → allow (the consumer surface is the safe
 *       home; a failed lookup must never lock a consumer out of /dashboard)
 *     · consumer is NOT allowed    → error (retry state)
 *
 * The last branch is the important one: a cross-surface redirect is destructive
 * (it drops the user into a *different* app), so it must require a CONFIRMED
 * disallowed role. An unknown role — a transient `/me/role` failure — must never
 * silently demote an institutional user onto the consumer dashboard. We show a
 * recoverable retry state instead, and the resilient `useUserRole` retries in the
 * background so it self-heals the moment the lookup succeeds.
 */
export function decideAccess(params: {
    authLoading: boolean
    isAuthenticated: boolean
    roleLoading: boolean
    role: UserRole | null
    roleError: boolean
    allowedRoles: UserRole[]
    redirectTo: string
}): AccessDecision {
    const { authLoading, isAuthenticated, roleLoading, role, roleError, allowedRoles, redirectTo } = params

    if (authLoading) return { kind: 'loading' }
    if (!isAuthenticated) return { kind: 'login' }
    if (roleLoading && !roleError) return { kind: 'loading' }

    // Role is unknown: we could not establish who this user is. Do NOT guess a
    // role that would bounce them to another surface — only allow when the
    // consumer (the safe default home) is permitted here; otherwise surface a
    // retry state and let the background revalidation resolve it.
    if (roleError || role == null) {
        return allowedRoles.includes('consumer') ? { kind: 'allow' } : { kind: 'error' }
    }

    // Role is confirmed: this is the only path that may redirect across surfaces.
    if (allowedRoles.includes(role)) return { kind: 'allow' }
    return { kind: 'redirect', to: redirectTo }
}
