'use client'

// useMultiFieldState — read the canonical FieldState for several fields at once
// (e.g. the Dashboard "AVG KurimaScore" card and the Fields-list cards).
//
// There is no batch endpoint yet (see docs/aggregator_cleanup_audit.md, Finding
// #1), so this issues N parallel GET /field/{id}/state requests capped at a small
// concurrency. Results are keyed by field id. Built on SWR to dedupe/cache.

import useSWR, { useSWRConfig, mutate as globalMutate } from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'
import type { FieldState } from '@/lib/field-state-types'
import { fieldStateKey } from './useFieldState'

import { API_BASE_URL } from '@/lib/api-base';
const MAX_CONCURRENCY = 5

async function fetchOne(fieldId: string): Promise<FieldState | null> {
    try {
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_BASE_URL}/field/${fieldId}/state`, { headers })
        if (!res.ok) return null
        const state = (await res.json()) as FieldState
        // Seed the PER-FIELD cache that useFieldState reads. Without this the
        // two hooks kept entirely separate caches, so opening a field after the
        // dashboard had already loaded it re-fetched the same
        // /field/{id}/state — the duplicate concurrent requests for one field
        // id visible in the production logs. `revalidate: false` publishes the
        // value we just received rather than triggering another round trip.
        void globalMutate(fieldStateKey(fieldId), state, { revalidate: false })
        return state
    } catch {
        return null
    }
}

/**
 * Split ids into those already held by useFieldState's cache and those that
 * still need fetching. Pure, so the dedupe rule is testable without a browser.
 *
 * Reusing a cached entry is the other direction of the duplication fixed in
 * `fetchOne`: detail page first, then back to the dashboard.
 */
export function partitionCached(
    fieldIds: string[],
    cached?: (id: string) => FieldState | undefined,
): { hits: Record<string, FieldState>; misses: string[] } {
    const hits: Record<string, FieldState> = {}
    const misses: string[] = []
    for (const id of fieldIds) {
        const hit = cached?.(id)
        if (hit) hits[id] = hit
        else misses.push(id)
    }
    return { hits, misses }
}

async function fetchMany(
    fieldIds: string[],
    cached?: (id: string) => FieldState | undefined,
): Promise<Record<string, FieldState>> {
    const { hits, misses } = partitionCached(fieldIds, cached)
    const out: Record<string, FieldState> = { ...hits }
    const toFetch = misses
    // Simple capped-concurrency pool.
    let cursor = 0
    async function worker() {
        while (cursor < toFetch.length) {
            const i = cursor++
            const id = toFetch[i]
            const state = await fetchOne(id)
            if (state) out[id] = state
        }
    }
    const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, toFetch.length) }, () => worker())
    await Promise.all(workers)
    return out
}

export interface UseMultiFieldStateResult {
    states: Record<string, FieldState>
    list: FieldState[]
    isLoading: boolean
    error: Error | undefined
}

export function useMultiFieldState(fieldIds: string[]): UseMultiFieldStateResult {
    const ids = [...fieldIds].filter(Boolean).sort()
    const key = ids.length ? `multi-field-state:${ids.join(',')}` : null
    const { cache } = useSWRConfig()
    const cachedState = (id: string): FieldState | undefined => {
        const k = fieldStateKey(id)
        return k ? (cache.get(k)?.data as FieldState | undefined) : undefined
    }
    const { data, error, isLoading } = useSWR<Record<string, FieldState>>(
        key,
        () => fetchMany(ids, cachedState),
        { revalidateOnFocus: false, dedupingInterval: 60_000, shouldRetryOnError: false }
    )
    const states = data ?? {}
    return {
        states,
        list: Object.values(states),
        isLoading,
        error: error as Error | undefined,
    }
}
