'use client'

// Harvest capture — wraps the Sprint 1 backend endpoint POST /fields/{id}/harvest
// with offline-safe submission. Tries the network first; a validation error is
// surfaced to the form, anything transient (offline/5xx) is queued in the outbox
// and replayed automatically when connectivity returns.

import { enqueue, httpSend, runSync } from '@/lib/offline/outbox'

export interface HarvestInput {
    season_year: number
    area_harvested_ha: number
    actual_yield_tonnes: number
    harvest_date?: string | null
    quality_grade?: string | null
    moisture_at_harvest?: number | null
    sale_price_per_tonne?: number | null
    delivered_to_tenant?: boolean | null
    notes?: string | null
}

export type SubmitResult = { status: 'submitted' } | { status: 'queued' }

/** Thrown for validation (4xx) errors so the form can show them inline.
 *  These are NOT queued — retrying invalid data would never succeed. */
export class HarvestValidationError extends Error {}

export async function submitHarvest(
    fieldId: string,
    fieldLabel: string,
    input: HarvestInput,
): Promise<SubmitResult> {
    const endpoint = `/fields/${fieldId}/harvest`

    const online = typeof navigator === 'undefined' || navigator.onLine
    if (online) {
        const res = await httpSend(endpoint, input)
        if (res.ok) {
            // Drain anything previously queued while we have a good connection.
            void runSync()
            return { status: 'submitted' }
        }
        if (!res.retriable) {
            throw new HarvestValidationError(res.error)
        }
        // transient → fall through to queue
    }

    await enqueue({
        kind: 'harvest',
        endpoint,
        body: input,
        label: `Harvest — ${fieldLabel}`,
    })
    return { status: 'queued' }
}
