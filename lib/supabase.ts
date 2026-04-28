'use client'

import { createBrowserClient } from '@supabase/ssr'

// Use fallback values during build time to prevent build errors
// These will be replaced with actual values at runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// createBrowserClient stores the session in cookies rather than localStorage.
// Cookies survive across the iOS Safari ↔ installed-PWA boundary (which is
// the most common reason "the app logs me out when I close it" — the
// installed PWA has its own WKWebView with a separate localStorage), and
// they're far less aggressively evicted by iOS ITP / storage purging than
// localStorage is. The client API surface is the same as the previous
// `createClient` instance — every existing call site keeps working.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

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

            // Wait for auth state change (session restore from cookies)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (session || event === 'SIGNED_OUT') {
                    subscription.unsubscribe()
                    resolve()
                }
            })

            // Timeout after 800ms — Supabase normally restores in <300ms;
            // a longer wait here delays the first authenticated API call on every page.
            setTimeout(() => {
                subscription.unsubscribe()
                resolve()
            }, 800)
        })
    })
}

// Singleton promise — shared across all services so auth is only awaited once
export const authReadyPromise: Promise<void> = waitForAuth()

