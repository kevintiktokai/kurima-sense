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

/** True when an error is most likely a connectivity failure (queue it) rather
 *  than a server validation error (surface it). */
export function isNetworkError(e: unknown): boolean {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true
    const msg = (e as Error)?.message ?? ''
    return /failed to fetch|networkerror|load failed|network request failed/i.test(msg)
}
