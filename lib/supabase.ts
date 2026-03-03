'use client'

import { createClient } from '@supabase/supabase-js'

// Use fallback values during build time to prevent build errors
// These will be replaced with actual values at runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'kurimasense-auth'
    }
})

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
    return process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'
}

// Helper to wait for auth to be ready
export const waitForAuth = (): Promise<void> => {
    return new Promise((resolve) => {
        // If no window (SSR), resolve immediately
        if (typeof window === 'undefined') {
            resolve()
            return
        }
        
        // Check if session already exists
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                resolve()
                return
            }
            
            // Wait for auth state change (session restore from localStorage)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (session || event === 'SIGNED_OUT') {
                    subscription.unsubscribe()
                    resolve()
                }
            })
            
            // Timeout after 2 seconds to prevent hanging
            setTimeout(() => {
                subscription.unsubscribe()
                resolve()
            }, 2000)
        })
    })
}
