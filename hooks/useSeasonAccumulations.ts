'use client'

/**
 * useSeasonAccumulations — season-long GDD + cumulative-precipitation curves for
 * a field, from `GET /field/{id}/season-accumulations` (Depth Sprint PR D
 * backend). SWR, auth headers, typed to the response.
 *
 * Historical data changes at most once a day, so `revalidateOnFocus` is off and
 * the request dedupes for 60s. The fetcher preserves the HTTP status on failure
 * (the charts treat 422 — no planting date — distinctly from other errors).
 */

import useSWR from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'
import type { SeasonAccumulations } from '@/lib/season-chart-utils'

export type { SeasonAccumulations, SeasonAccumulationDay } from '@/lib/season-chart-utils'

import { API_BASE_URL } from '@/lib/api-base';

/** Error that carries the HTTP status so the UI can branch on 422 vs other. */
export class SeasonAccumulationsError extends Error {
    status: number
    constructor(status: number, message?: string) {
        super(message || `Failed to load season accumulations (${status})`)
        this.status = status
        this.name = 'SeasonAccumulationsError'
    }
}

export async function fetchSeasonAccumulations(
    url: string,
    getHeaders: () => Promise<HeadersInit> = getAuthHeaders,
    fetchImpl: typeof fetch = fetch,
): Promise<SeasonAccumulations> {
    const headers = await getHeaders()
    const res = await fetchImpl(url, { headers })
    if (!res.ok) throw new SeasonAccumulationsError(res.status)
    return (await res.json()) as SeasonAccumulations
}

export interface UseSeasonAccumulationsResult {
    data: SeasonAccumulations | undefined
    isLoading: boolean
    error: SeasonAccumulationsError | undefined
}

export function useSeasonAccumulations(fieldId: string | null | undefined): UseSeasonAccumulationsResult {
    const { data, error, isLoading } = useSWR<SeasonAccumulations>(
        fieldId ? `${API_BASE_URL}/field/${fieldId}/season-accumulations` : null,
        (url: string) => fetchSeasonAccumulations(url),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60_000,
            shouldRetryOnError: false,
        },
    )
    return { data, isLoading, error: error as SeasonAccumulationsError | undefined }
}
