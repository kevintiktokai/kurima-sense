'use client'

/**
 * usePortfolioAggregate — the Today screen's single data source.
 *
 * Fetches `GET /portfolio/aggregate` (tenant info + portfolio summary + the
 * worst-first priority list, one round trip) with the session's auth headers.
 * Same SWR pattern as `useUserRole`, but tuned for a screen institutional
 * users leave open: revalidates on focus so the list is fresh when they
 * return to the tab, and dedupes for 30s so the shell and page share one call.
 *
 * Types mirror the backend schema exactly and are re-exported from
 * `lib/portfolio-utils` (kept there so node:test can import them without a
 * browser). `DEMO_SEED:` field-name prefixes are stripped in the fetcher —
 * the UI never sees them.
 */

import useSWR from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'
import { fetchPortfolioAggregate, type PortfolioAggregate } from '@/lib/portfolio-utils'

export type {
    PortfolioAggregate,
    PortfolioSummary,
    PortfolioPriority,
    PortfolioTenant,
    ScoreDistribution,
    Urgency,
} from '@/lib/portfolio-utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface UsePortfolioAggregateResult {
    data: PortfolioAggregate | undefined
    isLoading: boolean
    error: Error | undefined
    /** Re-fetch on demand (the "Updated …" caption's refresh affordance). */
    refresh: () => void
}

export function usePortfolioAggregate(): UsePortfolioAggregateResult {
    const { data, error, isLoading, mutate } = useSWR<PortfolioAggregate>(
        `${API_BASE_URL}/portfolio/aggregate`,
        (url: string) => fetchPortfolioAggregate(url, getAuthHeaders),
        {
            revalidateOnFocus: true,
            dedupingInterval: 30_000,
        }
    )

    return {
        data,
        isLoading,
        error: error as Error | undefined,
        refresh: () => { void mutate() },
    }
}
