'use client'

/**
 * usePortfolioVerification — fetches GET /tenants/{tenantId}/verification, the
 * attention-allocation rollup of which fields across the whole book have logged
 * inputs that never produced a satellite canopy response. Pass the tenant id from
 * the portfolio aggregate (`tenant.id`); the hook no-ops until it's available.
 */

import useSWR from 'swr'

import { getAuthHeaders } from '@/lib/api-cache'
import { fetchPortfolioVerification, type PortfolioVerification } from '@/lib/verification-utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface UsePortfolioVerificationResult {
    data: PortfolioVerification | undefined
    isLoading: boolean
    error: Error | undefined
    refresh: () => void
}

export function usePortfolioVerification(tenantId: string | null | undefined): UsePortfolioVerificationResult {
    const { data, error, isLoading, mutate } = useSWR<PortfolioVerification>(
        tenantId ? `${API_BASE_URL}/tenants/${tenantId}/verification` : null,
        (url: string) => fetchPortfolioVerification(url, getAuthHeaders),
        { revalidateOnFocus: true, dedupingInterval: 30_000 },
    )
    return {
        data,
        isLoading,
        error: error as Error | undefined,
        refresh: () => { void mutate() },
    }
}
