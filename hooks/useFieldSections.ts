'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getAuthHeaders } from '@/lib/api-cache'
import { API_BASE_URL } from '@/lib/api-base'

export interface FieldSection {
    index: number
    label: string
    polygon: { lat: number; lon: number }[]
    centroid: { lat: number; lon: number } | null
    area_share: number
    ndvi: number | null
    evi: number | null
    cloud_cover: number | null
    status: string | null
    sampled_at: string | null
}

export interface SectionsResult {
    field_id: string
    grid: number
    analyzed_at: string | null
    sections: FieldSection[]
}

interface UseFieldSections {
    data: SectionsResult | null
    loading: boolean
    error: boolean
    analyzing: boolean
    /** Kick off per-zone satellite analysis, then poll until it lands. */
    analyze: () => Promise<void>
    refresh: () => Promise<void>
}

/**
 * Zone-level analysis for a field. Reads GET /fields/{id}/sections (geometry
 * is always present; NDVI is null until analyzed) and drives the
 * POST /sections/analyze → poll loop. Grid is fixed at 2 (four compass zones)
 * for the field-detail view.
 */
export function useFieldSections(fieldId: string | undefined, grid = 2): UseFieldSections {
    const [data, setData] = useState<SectionsResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchSections = useCallback(async (): Promise<SectionsResult | null> => {
        if (!fieldId) return null
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_BASE_URL}/fields/${fieldId}/sections?grid=${grid}`, { headers })
        if (!res.ok) throw new Error(`sections ${res.status}`)
        return res.json()
    }, [fieldId, grid])

    const refresh = useCallback(async () => {
        if (!fieldId) return
        setLoading(true)
        setError(false)
        try {
            setData(await fetchSections())
        } catch {
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [fieldId, fetchSections])

    useEffect(() => {
        void refresh()
        return () => { if (pollRef.current) clearTimeout(pollRef.current) }
    }, [refresh])

    const analyze = useCallback(async () => {
        if (!fieldId || analyzing) return
        setAnalyzing(true)
        setError(false)
        const startedAt = data?.analyzed_at ?? null
        try {
            const headers = await getAuthHeaders()
            const res = await fetch(`${API_BASE_URL}/fields/${fieldId}/sections/analyze?grid=${grid}`, {
                method: 'POST',
                headers,
            })
            if (!res.ok) throw new Error(`analyze ${res.status}`)

            // Poll until analyzed_at advances past the pre-analysis value (or a cap).
            let attempts = 0
            const poll = async () => {
                attempts += 1
                try {
                    const next = await fetchSections()
                    if (next && next.analyzed_at && next.analyzed_at !== startedAt) {
                        setData(next)
                        setAnalyzing(false)
                        return
                    }
                } catch { /* keep polling; a blip shouldn't end analysis */ }
                if (attempts >= 20) { // ~60s cap
                    setAnalyzing(false)
                    void refresh()
                    return
                }
                pollRef.current = setTimeout(poll, 3000)
            }
            pollRef.current = setTimeout(poll, 3000)
        } catch {
            setError(true)
            setAnalyzing(false)
        }
    }, [fieldId, grid, analyzing, data, fetchSections, refresh])

    return { data, loading, error, analyzing, analyze, refresh }
}
