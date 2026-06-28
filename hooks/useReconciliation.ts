'use client'

/**
 * useReconciliation — fetches GET /tenants/{tenantId}/reconciliation for the
 * institutional Reports screen. Pass the tenant id from the portfolio aggregate
 * (`tenant.id`); the hook no-ops until it's available.
 */

import useSWR from 'swr'

import { getAuthHeaders } from '@/lib/api-cache'
import { fetchReconciliation, type ReconciliationResponse } from '@/lib/reconciliation-utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface UseReconciliationResult {
    data: ReconciliationResponse | undefined
    isLoading: boolean
    error: Error | undefined
    refresh: () => void
}

export function useReconciliation(tenantId: string | null | undefined): UseReconciliationResult {
    const { data, error, isLoading, mutate } = useSWR<ReconciliationResponse>(
        tenantId ? `${API_BASE_URL}/tenants/${tenantId}/reconciliation` : null,
        (url: string) => fetchReconciliation(url, getAuthHeaders),
        { revalidateOnFocus: true, dedupingInterval: 30_000 },
    )
    return {
        data,
        isLoading,
        error: error as Error | undefined,
        refresh: () => { void mutate() },
    }
}
