'use client'

import { supabase, authReadyPromise } from '@/lib/supabase'

// ───── Auth token cache (shared across api.ts and climate.ts) ─────
let _cachedSession: { token: string; expiresAt: number } | null = null

if (typeof window !== 'undefined') {
    supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            _cachedSession = null
        }
    })
}

export async function getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (typeof window === 'undefined') return headers

    try {
        await authReadyPromise

        if (_cachedSession && Date.now() < _cachedSession.expiresAt - 30_000) {
            headers['Authorization'] = `Bearer ${_cachedSession.token}`
            return headers
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
            _cachedSession = {
                token: session.access_token,
                expiresAt: (session.expires_at ?? 0) * 1000,
            }
            headers['Authorization'] = `Bearer ${session.access_token}`
        }
    } catch (e) {
        console.error('[api-cache] auth header error:', e)
    }
    return headers
}

// ───── Generic TTL cache ─────
interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number
}

export const apiCache = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string): T | null {
    const entry = apiCache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > entry.ttl) {
        apiCache.delete(key)
        return null
    }
    return entry.data as T
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
    apiCache.set(key, { data, timestamp: Date.now(), ttl: ttlMs })
}

export function invalidateCache(key: string): void {
    apiCache.delete(key)
}

export const CACHE_TTL = {
    DASHBOARD: 5 * 60 * 1000,
    FIELDS: 2 * 60 * 1000,
    MARKET: 10 * 60 * 1000,
    INSIGHTS: 3 * 60 * 1000,
    CLIMATE_CURRENT: 5 * 60 * 1000,
    CLIMATE_FORECAST: 10 * 60 * 1000,
    CLIMATE_DAILY: 30 * 60 * 1000,
    YIELD: 15 * 60 * 1000,
    VARIETIES: 24 * 60 * 60 * 1000,
}
