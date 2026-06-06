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

/**
 * Decide what a RoleGuard should do.
 *
 * - auth still loading            → loading
 * - not authenticated             → login
 * - role still loading (no error) → loading
 * - role error / unknown / null   → treated as `consumer` (safe default)
 * - effective role allowed        → allow
 * - otherwise                     → redirect to `redirectTo`
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

    const effectiveRole: UserRole = roleError || role == null ? 'consumer' : role
    if (allowedRoles.includes(effectiveRole)) return { kind: 'allow' }
    return { kind: 'redirect', to: redirectTo }
}
