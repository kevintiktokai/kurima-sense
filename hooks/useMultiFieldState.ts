'use client'

// useMultiFieldState — read the canonical FieldState for several fields at once
// (e.g. the Dashboard "AVG KurimaScore" card and the Fields-list cards).
//
// There is no batch endpoint yet (see docs/aggregator_cleanup_audit.md, Finding
// #1), so this issues N parallel GET /field/{id}/state requests capped at a small
// concurrency. Results are keyed by field id. Built on SWR to dedupe/cache.

import useSWR from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'
import type { FieldState } from '@/lib/field-state-types'

import { API_BASE_URL } from '@/lib/api-base';
const MAX_CONCURRENCY = 5

async function fetchOne(fieldId: string): Promise<FieldState | null> {
    try {
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_BASE_URL}/field/${fieldId}/state`, { headers })
        if (!res.ok) return null
        return (await res.json()) as FieldState
    } catch {
        return null
    }
}

async function fetchMany(fieldIds: string[]): Promise<Record<string, FieldState>> {
    const out: Record<string, FieldState> = {}
    // Simple capped-concurrency pool.
    let cursor = 0
    async function worker() {
        while (cursor < fieldIds.length) {
            const i = cursor++
            const id = fieldIds[i]
            const state = await fetchOne(id)
            if (state) out[id] = state
        }
    }
    const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, fieldIds.length) }, () => worker())
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
    const { data, error, isLoading } = useSWR<Record<string, FieldState>>(
        key,
        () => fetchMany(ids),
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
