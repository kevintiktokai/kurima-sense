'use client'

/**
 * useUserRole — single source of truth for the authenticated user's role context.
 *
 * Reads the canonical `GET /me/role` (Workstream 2 backend) so routing decisions
 * use the same role the backend enforces. Cached per session via SWR. Every
 * routing decision (RoleGuard) and the portfolio shell read from this hook.
 *
 * On failure the consumers of this hook should treat the role as `consumer`
 * (safe default) — we never lock a user out because the role lookup failed.
 */

import useSWR from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export type UserRole = 'consumer' | 'institutional' | 'admin'
export type InstitutionalType = 'buyer' | 'lender' | 'insurer' | 'grower'

export interface UserRoleContext {
    user_id: string
    role: UserRole
    institutional_type: InstitutionalType | null
    tenant_name: string | null
}

const fetcher = async (url: string): Promise<UserRoleContext> => {
    const headers = await getAuthHeaders()
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Failed to fetch role: ${res.status}`)
    return res.json()
}

export interface UseUserRoleResult {
    role: UserRole | null
    institutionalType: InstitutionalType | null
    tenantName: string | null
    user: UserRoleContext | null
    isLoading: boolean
    error: Error | undefined
    /** Force a re-fetch of /me/role (used by the guard's retry affordance). */
    refresh: () => void
}

export function useUserRole(): UseUserRoleResult {
    const { data, error, isLoading, mutate } = useSWR<UserRoleContext>(
        `${API_BASE_URL}/me/role`,
        fetcher,
        {
            revalidateOnFocus: false,
            // The role decides which *app* the user sees, so a transient failure
            // must self-heal rather than strand them. Retry on error and re-fetch
            // when connectivity returns; keep the last good role across a failed
            // revalidation so a blip never blanks a known-good role mid-session.
            revalidateOnReconnect: true,
            shouldRetryOnError: true,
            errorRetryCount: 4,
            errorRetryInterval: 2000,
            keepPreviousData: true,
            // Role rarely changes within a session — cache aggressively so the
            // many components that read it share one network call.
            dedupingInterval: 60000,
        }
    )

    return {
        role: data?.role ?? null,
        institutionalType: data?.institutional_type ?? null,
        tenantName: data?.tenant_name ?? null,
        user: data ?? null,
        isLoading,
        error: error as Error | undefined,
        refresh: () => { void mutate() },
    }
}

/**
 * Fetch the role once (used by the login redirect, before the SWR cache exists).
 *
 * This is the moment we choose which *app* an institutional user lands in, so a
 * single transient failure here would wrongly drop them onto the consumer
 * dashboard. Retry a few times with a short backoff before giving up. Only after
 * exhausting retries do we return null, and even then RoleGuard self-corrects
 * once the resilient `useUserRole` resolves the role on the next surface.
 */
export async function fetchUserRoleOnce(attempts = 3): Promise<UserRoleContext | null> {
    for (let i = 0; i < attempts; i++) {
        try {
            return await fetcher(`${API_BASE_URL}/me/role`)
        } catch {
            if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400 * (i + 1)))
        }
    }
    return null
}
