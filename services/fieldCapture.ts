'use client'

// Offline fallback for field creation. The existing online path stays
// api.saveField (which also invalidates caches); when offline / on a network
// failure we queue the same POST /fields body to the outbox for later replay.

import { enqueue } from '@/lib/offline/outbox'

export interface FieldCreatePayload {
    name: string
    crop: string
    coordinates: Array<{ lat: number; lon: number }> | unknown
    area?: number
    plantingDate?: string
    transplantDate?: string
    isTransplanted?: boolean
    variety?: string
    fertilizerHistory?: string
}

/** Queue a field creation for replay. The field appears once it syncs. */
export async function enqueueFieldCreate(payload: FieldCreatePayload): Promise<void> {
    await enqueue({
        kind: 'field_boundary',
        endpoint: '/fields',
        body: payload,
        label: `New field — ${payload.name}`,
    })
}

/** True only for an *actual* connectivity failure (queue it) — never a server
 *  error/validation (those must surface, not be silently queued). Classifies by
 *  the thrown error's message, never navigator.onLine (unreliable in
 *  PWAs/WKWebViews). A failed `fetch()` throws a TypeError whose message is
 *  "Failed to fetch" (Chrome), "Load failed" (Safari) or "NetworkError…"
 *  (Firefox); HTTP errors (4xx/5xx) surface as Errors containing the status, so
 *  they correctly return false here. We match the message rather than
 *  `instanceof TypeError` so unrelated TypeErrors aren't mistaken for offline. */
export function isNetworkError(e: unknown): boolean {
    const msg = (e as Error)?.message ?? ''
    return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(msg)
}
