'use client'

// useFieldState — the shared hook every consumer screen uses to read a field's
// canonical state from the Field State Aggregator (GET /field/{id}/state).
//
// Built on SWR (already a dependency) so it caches per-field, dedupes concurrent
// requests across screens, and revalidates on focus. Mutations elsewhere can call
// `invalidateFieldState(fieldId)` to force a refresh.

import useSWR, { mutate as globalMutate } from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'
import type { FieldState } from '@/lib/field-state-types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function fieldStateKey(fieldId: string | null | undefined): string | null {
    return fieldId ? `field-state:${fieldId}` : null
}

async function fetchFieldState(fieldId: string): Promise<FieldState> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/field/${fieldId}/state`, { headers })
    if (res.status === 403) throw new Error('You do not have access to this field')
    if (res.status === 404) throw new Error('Field not found')
    if (!res.ok) throw new Error(`Failed to load field state (${res.status})`)
    return (await res.json()) as FieldState
}

export interface UseFieldStateResult {
    fieldState: FieldState | undefined
    isLoading: boolean
    error: Error | undefined
    refresh: () => void
}

export function useFieldState(fieldId: string | null | undefined): UseFieldStateResult {
    const key = fieldStateKey(fieldId)
    const { data, error, isLoading, mutate } = useSWR<FieldState>(
        key,
        () => fetchFieldState(fieldId as string),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60_000, // align with the backend 120s cache
            shouldRetryOnError: false,
        }
    )
    return {
        fieldState: data,
        isLoading,
        error: error as Error | undefined,
        refresh: () => { void mutate() },
    }
}

// Call after a mutation (analyze, add task, edit field) to refresh a field's state
// everywhere it is displayed.
export function invalidateFieldState(fieldId: string): void {
    void globalMutate(fieldStateKey(fieldId))
}
