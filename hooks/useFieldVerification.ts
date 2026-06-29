'use client'

/**
 * useFieldVerification — fetches GET /fields/{fieldId}/verification (did logged
 * inputs produce an NDVI canopy response?) for the portfolio field detail.
 * No-ops until fieldId is available.
 */

import useSWR from 'swr'

import { getAuthHeaders } from '@/lib/api-cache'
import { fetchFieldVerification, type FieldVerification } from '@/lib/verification-utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface UseFieldVerificationResult {
    data: FieldVerification | undefined
    isLoading: boolean
    error: Error | undefined
}

export function useFieldVerification(fieldId: string | null | undefined): UseFieldVerificationResult {
    const { data, error, isLoading } = useSWR<FieldVerification>(
        fieldId ? `${API_BASE_URL}/fields/${fieldId}/verification` : null,
        (url: string) => fetchFieldVerification(url, getAuthHeaders),
        { revalidateOnFocus: false, dedupingInterval: 60_000 },
    )
    return { data, isLoading, error: error as Error | undefined }
}
