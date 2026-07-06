'use client'

// SWR hooks for the AI irrigation recommendation engine.
//
//   useFieldIrrigation(fieldId)  — one field's full recommendation (planner card)
//   useIrrigationOutlook()       — all planted fields (climatology dashboard)
//   applyIrrigationToPlan(id)    — POST /fields/{id}/irrigation/apply

import useSWR, { mutate as globalMutate } from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'
import type { IrrigationOutlookResponse, IrrigationRecommendation } from '@/lib/irrigation-types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const OUTLOOK_KEY = 'irrigation:outlook'

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
    const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
    return fetch(`${API_BASE_URL}${path}`, { ...init, headers })
}

interface FieldRecommendationResponse {
    available: boolean
    reason?: string
    recommendation?: IrrigationRecommendation
}

export function useFieldIrrigation(fieldId: string | null | undefined) {
    const key = fieldId ? `irrigation:field:${fieldId}` : null
    const { data, error, isLoading, mutate } = useSWR<FieldRecommendationResponse>(
        key,
        async () => {
            const res = await authedFetch(`/fields/${fieldId}/irrigation/recommendation`)
            if (!res.ok) throw new Error(`Failed to load irrigation recommendation (${res.status})`)
            return res.json()
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 10 * 60_000, // engine inputs are hourly-cached weather
            shouldRetryOnError: false,
        },
    )
    return {
        available: data?.available ?? false,
        unavailableReason: data?.reason,
        recommendation: data?.recommendation,
        isLoading,
        error: error as Error | undefined,
        refresh: () => { void mutate() },
    }
}

export function useIrrigationOutlook() {
    const { data, error, isLoading, mutate } = useSWR<IrrigationOutlookResponse>(
        OUTLOOK_KEY,
        async () => {
            const res = await authedFetch('/irrigation/recommendations')
            if (!res.ok) throw new Error(`Failed to load irrigation outlook (${res.status})`)
            return res.json()
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 10 * 60_000,
            shouldRetryOnError: false,
        },
    )
    return {
        recommendations: data?.recommendations ?? [],
        actionable: data?.actionable ?? 0,
        evaluatedFields: data?.evaluated_fields ?? 0,
        isLoading,
        error: error as Error | undefined,
        refresh: () => { void mutate() },
    }
}

export interface ApplyResult {
    applied: boolean
    reason?: string
    task?: { id: string; created: boolean }
}

/** Materialise the current recommendation as an AI planner task. */
export async function applyIrrigationToPlan(fieldId: string): Promise<ApplyResult> {
    const res = await authedFetch(`/fields/${fieldId}/irrigation/apply`, { method: 'POST' })
    if (!res.ok) {
        let detail = res.statusText
        try { detail = (await res.json())?.detail ?? detail } catch { /* non-JSON */ }
        throw new Error(detail)
    }
    const result = (await res.json()) as ApplyResult
    void globalMutate(`irrigation:field:${fieldId}`)
    return result
}
