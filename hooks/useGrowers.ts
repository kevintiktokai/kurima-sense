'use client'

/**
 * useGrowers / useGrower — the grower roster + single-grower data sources, plus
 * create/update/delete mutation helpers, against the Workstream 3 backend
 * (`/tenants/me/growers`). No backend change.
 *
 * Mutations are plain async functions (not SWR). After any success the caller
 * refreshes BOTH the growers list and the portfolio aggregate, since a grower's
 * name appears on field rows. 403 (viewer role) is surfaced as a friendly
 * permission message — this PR handles the error rather than gating the UI by
 * role (see docs/portfolio_growers_audit.md).
 */

import useSWR, { mutate as globalMutate } from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'
import type { Grower, GrowerPayload } from '@/lib/portfolio-utils'

export type { Grower, GrowerWithStats, GrowerPayload } from '@/lib/portfolio-utils'

import { API_BASE_URL } from '@/lib/api-base';
const GROWERS_URL = `${API_BASE_URL}/tenants/me/growers`
const AGGREGATE_URL = `${API_BASE_URL}/portfolio/aggregate`

// ─── Error mapping ────────────────────────────────────────────────────────────

async function errorFor(res: Response, fallback: string): Promise<Error> {
    if (res.status === 403) return new Error("You don't have permission to modify growers")
    let detail = ''
    try { detail = (await res.json())?.detail || '' } catch { /* ignore */ }
    return new Error(detail || `${fallback} (${res.status})`)
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchGrowers(url: string): Promise<Grower[]> {
    const headers = await getAuthHeaders()
    const res = await fetch(url, { headers })
    if (!res.ok) throw await errorFor(res, 'Failed to load growers')
    return (await res.json()) as Grower[]
}

async function fetchGrower(url: string): Promise<Grower> {
    const headers = await getAuthHeaders()
    const res = await fetch(url, { headers })
    if (res.status === 404) throw new Error('Grower not found')
    if (!res.ok) throw await errorFor(res, 'Failed to load grower')
    return (await res.json()) as Grower
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export interface UseGrowersResult {
    growers: Grower[] | undefined
    isLoading: boolean
    error: Error | undefined
    refresh: () => void
}

export function useGrowers(): UseGrowersResult {
    const { data, error, isLoading, mutate } = useSWR<Grower[]>(GROWERS_URL, fetchGrowers, {
        revalidateOnFocus: true,
        dedupingInterval: 30_000,
    })
    return { growers: data, isLoading, error: error as Error | undefined, refresh: () => { void mutate() } }
}

export interface UseGrowerResult {
    grower: Grower | undefined
    isLoading: boolean
    error: Error | undefined
    refresh: () => void
}

/** Single grower by id — fetched directly so a cold deep-link to the detail
 *  page works without the roster having been visited. */
export function useGrower(id: string | null | undefined): UseGrowerResult {
    const { data, error, isLoading, mutate } = useSWR<Grower>(
        id ? `${GROWERS_URL}/${id}` : null,
        fetchGrower,
        { revalidateOnFocus: true, dedupingInterval: 30_000, shouldRetryOnError: false },
    )
    return { grower: data, isLoading, error: error as Error | undefined, refresh: () => { void mutate() } }
}

/** Revalidate both the growers list and the aggregate after a mutation. */
export function refreshGrowerData(): void {
    void globalMutate(GROWERS_URL)
    void globalMutate(AGGREGATE_URL)
}

// ─── Mutations (injectable fetch/headers for testability) ─────────────────────

type Headers = () => Promise<HeadersInit>

export async function createGrower(
    payload: GrowerPayload,
    getHeaders: Headers = getAuthHeaders,
    fetchImpl: typeof fetch = fetch,
): Promise<Grower> {
    const res = await fetchImpl(GROWERS_URL, {
        method: 'POST', headers: await getHeaders(), body: JSON.stringify(payload),
    })
    if (!res.ok) throw await errorFor(res, 'Failed to create grower')
    return (await res.json()) as Grower
}

export async function updateGrower(
    id: string,
    payload: Partial<GrowerPayload>,
    getHeaders: Headers = getAuthHeaders,
    fetchImpl: typeof fetch = fetch,
): Promise<Grower> {
    const res = await fetchImpl(`${GROWERS_URL}/${id}`, {
        method: 'PATCH', headers: await getHeaders(), body: JSON.stringify(payload),
    })
    if (!res.ok) throw await errorFor(res, 'Failed to update grower')
    return (await res.json()) as Grower
}

export async function deleteGrower(
    id: string,
    getHeaders: Headers = getAuthHeaders,
    fetchImpl: typeof fetch = fetch,
): Promise<void> {
    const res = await fetchImpl(`${GROWERS_URL}/${id}`, { method: 'DELETE', headers: await getHeaders() })
    if (!res.ok && res.status !== 204) throw await errorFor(res, 'Failed to remove grower')
}
