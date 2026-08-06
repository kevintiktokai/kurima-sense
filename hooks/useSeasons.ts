'use client'

// Season lifecycle + pre-plant planning data hooks.
//
// Built on SWR like useFieldState, so the season list is cached per field,
// deduped across screens, and invalidated centrally after a mutation. The
// pre-plant brief is a single call by design — rotation, establishment and
// fertiliser are read together and must agree with each other.

import useSWR, { mutate as globalMutate } from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'
import { API_BASE_URL } from '@/lib/api-base'
import type {
    ActionWindowsResponse,
    FieldHistory,
    PrePlantBrief,
    RotationSummary,
    Season,
    StandAssessment,
    StandCheckInstructions,
} from '@/lib/planning-types'

// --- keys -------------------------------------------------------------------

export const seasonsKey = (fieldId: string | null | undefined) =>
    fieldId ? `seasons:${fieldId}` : null

export const rotationKey = (fieldId: string | null | undefined, crop?: string) =>
    fieldId ? `rotation:${fieldId}:${crop ?? ''}` : null

export const prePlantKey = (
    fieldId: string | null | undefined,
    crop: string | null | undefined
) => (fieldId && crop ? `pre-plant:${fieldId}:${crop}` : null)

// --- fetch helpers ----------------------------------------------------------

async function authedJson<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
    if (res.status === 403) throw new Error('You do not have access to this field')
    if (res.status === 404) throw new Error('Not found')
    if (!res.ok) {
        // The backend returns a `detail` string for 400/409/422 — surface it
        // rather than a status code, since these are farmer-actionable
        // ("this field already has an active season").
        let detail = `Request failed (${res.status})`
        try {
            const body = await res.json()
            if (body?.detail) detail = String(body.detail)
        } catch {
            /* keep the status-code message */
        }
        throw new Error(detail)
    }
    return (await res.json()) as T
}

// --- Seasons list -----------------------------------------------------------

export interface UseSeasonsResult {
    seasons: Season[]
    isLoading: boolean
    error: Error | undefined
    refresh: () => void
}

export function useSeasons(fieldId: string | null | undefined): UseSeasonsResult {
    const key = seasonsKey(fieldId)
    const { data, error, isLoading, mutate } = useSWR<{ seasons: Season[] }>(
        key,
        () => authedJson<{ seasons: Season[] }>(`/fields/${fieldId}/seasons`),
        { revalidateOnFocus: false, dedupingInterval: 30_000, shouldRetryOnError: false }
    )
    return {
        seasons: data?.seasons ?? [],
        isLoading,
        error: error as Error | undefined,
        refresh: () => { void mutate() },
    }
}

export function invalidateSeasons(fieldId: string): void {
    void globalMutate(seasonsKey(fieldId))
}

// --- Rotation ---------------------------------------------------------------

export function useRotation(
    fieldId: string | null | undefined,
    candidateCrop?: string
) {
    const key = rotationKey(fieldId, candidateCrop)
    const query = candidateCrop ? `?candidate_crop=${encodeURIComponent(candidateCrop)}` : ''
    const { data, error, isLoading } = useSWR<RotationSummary>(
        key,
        () => authedJson<RotationSummary>(`/fields/${fieldId}/rotation${query}`),
        { revalidateOnFocus: false, dedupingInterval: 60_000, shouldRetryOnError: false }
    )
    return { rotation: data, isLoading, error: error as Error | undefined }
}

// --- Pre-plant brief --------------------------------------------------------

export interface PrePlantParams {
    crop: string | null
    plantingDate?: string
    naturalRegion?: string
    irrigated?: boolean
    rainfallOutlook?: string
    soilPh?: number
    soilTexture?: string
    tillagePractice?: string
}

export function usePrePlantBrief(
    fieldId: string | null | undefined,
    params: PrePlantParams
) {
    const { crop } = params
    // The key carries every input, so changing irrigation or region refetches
    // instead of showing a stale plan that contradicts the form.
    const key = prePlantKey(fieldId, crop)
        ? `${prePlantKey(fieldId, crop)}:${JSON.stringify(params)}`
        : null

    const { data, error, isLoading } = useSWR<PrePlantBrief>(
        key,
        () => {
            const q = new URLSearchParams({ crop: crop as string })
            if (params.plantingDate) q.set('planting_date', params.plantingDate)
            if (params.naturalRegion) q.set('natural_region', params.naturalRegion)
            if (params.irrigated) q.set('irrigated', 'true')
            if (params.rainfallOutlook) q.set('rainfall_outlook', params.rainfallOutlook)
            if (params.soilPh !== undefined) q.set('soil_ph', String(params.soilPh))
            if (params.soilTexture) q.set('soil_texture', params.soilTexture)
            if (params.tillagePractice) q.set('tillage_practice', params.tillagePractice)
            return authedJson<PrePlantBrief>(`/fields/${fieldId}/plan/pre-plant?${q}`)
        },
        { revalidateOnFocus: false, dedupingInterval: 30_000, shouldRetryOnError: false }
    )
    return { brief: data, isLoading, error: error as Error | undefined }
}

// --- Mutations --------------------------------------------------------------

export async function createPlannedSeason(
    fieldId: string,
    body: Record<string, unknown>
): Promise<Season> {
    const season = await authedJson<Season>(`/fields/${fieldId}/seasons`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
    invalidateSeasons(fieldId)
    return season
}

export async function updateSeason(
    fieldId: string,
    seasonId: string,
    body: Record<string, unknown>
): Promise<Season> {
    const season = await authedJson<Season>(`/seasons/${seasonId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    })
    invalidateSeasons(fieldId)
    return season
}

/** planned → active. Also refreshes field state: the crop mirror has changed. */
export async function activateSeason(
    fieldId: string,
    seasonId: string,
    plantingDate?: string
): Promise<Season> {
    const season = await authedJson<Season>(`/seasons/${seasonId}/activate`, {
        method: 'POST',
        body: JSON.stringify(plantingDate ? { planting_date: plantingDate } : {}),
    })
    invalidateSeasons(fieldId)
    void globalMutate(`field-state:${fieldId}`)
    return season
}

export async function harvestSeason(
    fieldId: string,
    seasonId: string,
    body: { harvest_date?: string; yield_tonnes_per_ha?: number }
): Promise<Season> {
    const season = await authedJson<Season>(`/seasons/${seasonId}/harvest`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
    invalidateSeasons(fieldId)
    return season
}

export async function closeSeason(
    fieldId: string,
    seasonId: string,
    yieldTonnesPerHa?: number
): Promise<Season> {
    const season = await authedJson<Season>(`/seasons/${seasonId}/close`, {
        method: 'POST',
        body: JSON.stringify(
            yieldTonnesPerHa !== undefined ? { yield_tonnes_per_ha: yieldTonnesPerHa } : {}
        ),
    })
    invalidateSeasons(fieldId)
    return season
}

export async function abandonSeason(fieldId: string, seasonId: string): Promise<Season> {
    const season = await authedJson<Season>(`/seasons/${seasonId}/abandon`, { method: 'POST' })
    invalidateSeasons(fieldId)
    void globalMutate(`field-state:${fieldId}`)
    return season
}

// --- Stand Check ------------------------------------------------------------

export async function getStandCheckInstructions(
    seasonId: string
): Promise<StandCheckInstructions> {
    return authedJson<StandCheckInstructions>(`/seasons/${seasonId}/stand-check`)
}

export async function submitStandCheck(
    fieldId: string,
    seasonId: string,
    body: {
        counted_plants: number
        row_spacing_cm?: number
        row_length_m?: number
        target_population_per_ha?: number
        days_after_emergence?: number
        emergence_uniformity?: string
        emergence_date?: string
    }
): Promise<{ assessment: StandAssessment; season: Season }> {
    const result = await authedJson<{ assessment: StandAssessment; season: Season }>(
        `/seasons/${seasonId}/stand-check`,
        { method: 'POST', body: JSON.stringify(body) }
    )
    invalidateSeasons(fieldId)
    // The established population is the KurimaScore's missing denominator, so
    // the field's canonical state is now stale.
    void globalMutate(`field-state:${fieldId}`)
    return result
}

// --- Season history ---------------------------------------------------------

export const seasonHistoryKey = (fieldId: string | null | undefined) =>
    fieldId ? `season-history:${fieldId}` : null

/**
 * Season-over-season history for a field. Separate from useSeasons because it
 * carries every observation for every season — far heavier than the season
 * list, and only the history card needs it.
 */
export function useSeasonHistory(fieldId: string | null | undefined) {
    const { data, error, isLoading } = useSWR<FieldHistory>(
        seasonHistoryKey(fieldId),
        () => authedJson<FieldHistory>(`/fields/${fieldId}/season-history`),
        { revalidateOnFocus: false, dedupingInterval: 300_000, shouldRetryOnError: false }
    )
    return { history: data, isLoading, error: error as Error | undefined }
}

// --- Action windows ---------------------------------------------------------

export const windowsKey = (fieldId: string | null | undefined) =>
    fieldId ? `windows:${fieldId}` : null

/**
 * The operations closing on this field, ranked by cost per remaining day.
 * Revalidates on focus: a window's urgency changes with the calendar, so a
 * farmer returning to the app after a few days must not see yesterday's ranking.
 */
export function useActionWindows(
    fieldId: string | null | undefined,
    soilTexture?: string
) {
    const q = soilTexture ? `?soil_texture=${encodeURIComponent(soilTexture)}` : ''
    const { data, error, isLoading } = useSWR<ActionWindowsResponse>(
        windowsKey(fieldId),
        () => authedJson<ActionWindowsResponse>(`/fields/${fieldId}/windows${q}`),
        { revalidateOnFocus: true, dedupingInterval: 60_000, shouldRetryOnError: false }
    )
    return { data, isLoading, error: error as Error | undefined }
}
