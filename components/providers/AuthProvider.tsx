'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
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
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUserStable(session?.user ?? null)
            setLoading(false)
        })

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

        return () => subscription.unsubscribe()
    }, [setUserStable])

    const signOut = async () => {
        currentUserIdRef.current = null
        await supabase.auth.signOut()
        router.push('/auth')
    }

    return (
        <AuthContext.Provider value={{ user, session, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}
