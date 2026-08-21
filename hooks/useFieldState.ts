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

import { HttpError, apiJson } from '@/lib/http';

export function fieldStateKey(fieldId: string | null | undefined): string | null {
    return fieldId ? `field-state:${fieldId}` : null
}

async function fetchFieldState(fieldId: string): Promise<FieldState> {
    const headers = await getAuthHeaders()
    // apiFetch supplies the deadline and the retry this never had: a hung
    // socket used to leave the field page spinning with no error at all.
    try {
        return await apiJson<FieldState>(`/field/${fieldId}/state`, { headers })
    } catch (e) {
        if (e instanceof HttpError && e.status === 403) {
            throw new Error('You do not have access to this field')
        }
        if (e instanceof HttpError && e.status === 404) throw new Error('Field not found')
        throw e
    }
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
