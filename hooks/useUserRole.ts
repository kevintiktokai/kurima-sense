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
}

export function useUserRole(): UseUserRoleResult {
    const { data, error, isLoading } = useSWR<UserRoleContext>(
        `${API_BASE_URL}/me/role`,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            shouldRetryOnError: false,
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
    }
}

/**
 * Fetch the role once (used by the login redirect, before the SWR cache exists).
 * Returns null on any failure so the caller can fall back to the consumer view.
 */
export async function fetchUserRoleOnce(): Promise<UserRoleContext | null> {
    try {
        return await fetcher(`${API_BASE_URL}/me/role`)
    } catch {
        return null
    }
}
