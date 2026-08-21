'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { setUnauthorizedHandler } from '@/lib/http'
import { useRouter } from 'next/navigation'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signOut: async () => { }
})

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

// Refresh proactively while the access token still has at least this long
// left. Anything below the buffer is treated as "about to expire" and gets
// refreshed before we either decide the user is logged in or hand them off
// to a request that would otherwise 401.
const REFRESH_BUFFER_MS = 60 * 1000

function isSessionStale(session: Session | null): boolean {
    if (!session?.expires_at) return false
    const expiresAtMs = session.expires_at * 1000
    return expiresAtMs - Date.now() < REFRESH_BUFFER_MS
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    // Track the current user ID to avoid creating new references for the same user
    const currentUserIdRef = useRef<string | null>(null)

    // Stable setter: only update user state if the user actually changed
    const setUserStable = useCallback((newUser: User | null) => {
        const newId = newUser?.id ?? null
        if (newId !== currentUserIdRef.current) {
            currentUserIdRef.current = newId
            setUser(newUser)
        }
        // If same user ID, skip — prevents downstream re-renders on token refresh
    }, [])

    useEffect(() => {
        let cancelled = false

        // Bootstrap: read the stored session and, if its access token is
        // about to expire, refresh it before we decide whether the user is
        // "logged in". Without this, getSession returns the stale session,
        // we render the dashboard, and Supabase's auto-refresh fires a beat
        // later — if it fails, we'd bounce the user out.
        async function bootstrap() {
            const { data: { session: stored } } = await supabase.auth.getSession()
            if (cancelled) return

            let resolved = stored
            if (resolved && isSessionStale(resolved)) {
                try {
                    const { data, error } = await supabase.auth.refreshSession()
                    if (!error && data.session) resolved = data.session
                } catch {
                    // Transient network failure — keep the stale session.
                    // The next user action will retry; better than logging
                    // them out for a momentary blip.
                }
            }
            if (cancelled) return

            setSession(resolved)
            setUserStable(resolved?.user ?? null)
            setLoading(false)
        }
        bootstrap()

        // Listen for auth changes
        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session)

            if (event === 'TOKEN_REFRESHED') {
                // Token refreshed (e.g. tab refocus) — update session silently
                // but do NOT update user reference if it's the same user.
                // This prevents the entire dashboard from reloading.
                return
            }

            // For actual auth changes (SIGNED_IN, SIGNED_OUT, etc.), update user
            setUserStable(session?.user ?? null)
            setLoading(false)
        })

        // Supabase's auto-refresh interval doesn't tick while the tab is
        // backgrounded. When the user comes back the access token may
        // already be expired — without an explicit nudge they'd perform
        // an action with a stale token (401), and only then would the SDK
        // refresh.
        async function refreshIfStale() {
            if (typeof document === 'undefined') return
            if (document.visibilityState !== 'visible') return
            const { data: { session: current } } = await supabase.auth.getSession()
            if (current && isSessionStale(current)) {
                try {
                    await supabase.auth.refreshSession()
                } catch {
                    // ignore — leave the existing session in place
                }
            }
        }
        document.addEventListener('visibilitychange', refreshIfStale)

        // iOS Safari (and some other browsers) restore pages from the
        // back/forward cache without firing visibilitychange. pageshow
        // with persisted=true is the signal we'd otherwise miss.
        function onPageShow(e: PageTransitionEvent) {
            if (e.persisted) refreshIfStale()
        }
        window.addEventListener('pageshow', onPageShow)

        return () => {
            cancelled = true
            subscription.unsubscribe()
            document.removeEventListener('visibilitychange', refreshIfStale)
            window.removeEventListener('pageshow', onPageShow)
        }
    }, [setUserStable])

    const signOut = useCallback(async () => {
        currentUserIdRef.current = null
        await supabase.auth.signOut()
        router.push('/auth')
    }, [router])

    // The case the refreshes above cannot catch: the *backend* rejects a token
    // this client still believes in. Clock skew, a rotated JWT secret, a revoked
    // tenant membership — the client session looks healthy, so RoleGuard does
    // not redirect, and the user sits on a dashboard where every card reads
    // "your session has expired" with nothing to act on. That is the same dead
    // end as a spinner that never resolves.
    //
    // lib/http calls this on a 401, replays the request with whatever header we
    // return, and gives up if we return null. Registered here because this is
    // where the Supabase client lives; lib/http stays testable without one.
    useEffect(() => {
        setUnauthorizedHandler(async () => {
            try {
                const { data, error } = await supabase.auth.refreshSession()
                const token = data?.session?.access_token
                if (error || !token) {
                    // The session is genuinely gone. Sign out so the guard can
                    // send them somewhere they can do something about it —
                    // rather than leaving them on a dashboard of dead cards.
                    await signOut()
                    return null
                }
                return `Bearer ${token}`
            } catch {
                return null
            }
        })
        return () => setUnauthorizedHandler(null)
    }, [signOut])

    const value = useMemo(
        () => ({ user, session, loading, signOut }),
        [user, session, loading, signOut]
    )

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
