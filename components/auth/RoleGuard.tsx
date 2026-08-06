'use client'

/**
 * RoleGuard — gates a layout subtree by the authenticated user's role.
 *
 * Wraps a layout (consumer dashboard or institutional portfolio):
 *  - while auth/role is loading → a thin skeleton (SWR cache makes this brief);
 *  - unauthenticated → redirect to /auth (login);
 *  - role ∈ allowedRoles → render children;
 *  - otherwise → router.replace(redirectTo) (replace, not push, so the back
 *    button doesn't re-trigger a redirect loop).
 *
 * SAFETY: if the role lookup fails, the user is treated as `consumer` — the
 * safest default — so a failed /me/role can never lock anyone out of the app.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useUserRole } from '@/hooks/useUserRole'
import { decideAccess, type UserRole } from '@/components/auth/roleAccess'

export type { AccessDecision } from '@/components/auth/roleAccess'
export { decideAccess } from '@/components/auth/roleAccess'

function RoleGuardSkeleton() {
    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
        >
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: 28 }}>
                progress_activity
            </span>
        </div>
    )
}

// Shown only when the role lookup failed on a surface the consumer default can't
// cover (i.e. /portfolio). We deliberately do NOT redirect here — bouncing the
// user to the consumer dashboard is exactly the regression this guards against —
// so we hold the surface and offer a retry while the hook retries in background.
function RoleGuardError({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="min-h-screen flex items-center justify-center p-8 text-center"
            style={{ background: 'var(--ee-bg)', fontFamily: 'var(--font-body)' }}>
            <div className="max-w-sm">
                <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-muted)' }}>cloud_off</span>
                <p className="font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    Couldn&apos;t verify your workspace
                </p>
                <p className="text-sm mt-1 mb-5" style={{ color: 'var(--ee-muted)' }}>
                    We couldn&apos;t confirm your account access just now. Retrying automatically…
                </p>
                <button onClick={onRetry}
                    className="px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                    style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)' }}>
                    Try again
                </button>
            </div>
        </div>
    )
}

export interface RoleGuardProps {
    allowedRoles: UserRole[]
    redirectTo: string
    /** Where unauthenticated users go. Defaults to the login page. */
    loginPath?: string
    children: React.ReactNode
}

export function RoleGuard({ allowedRoles, redirectTo, loginPath = '/auth', children }: RoleGuardProps) {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const { role, isLoading: roleLoading, error, refresh } = useUserRole()

    const decision = decideAccess({
        authLoading,
        isAuthenticated: !!user,
        roleLoading,
        role,
        roleError: !!error,
        allowedRoles,
        redirectTo,
    })

    useEffect(() => {
        if (decision.kind === 'redirect') router.replace(decision.to)
        else if (decision.kind === 'login') router.replace(loginPath)
    }, [decision.kind, decision.kind === 'redirect' ? decision.to : null, loginPath, router])

    if (decision.kind === 'allow') return <>{children}</>
    if (decision.kind === 'error') return <RoleGuardError onRetry={refresh} />
    return <RoleGuardSkeleton />
}

export default RoleGuard
