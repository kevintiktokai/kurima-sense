'use client'

// Harvest capture — wraps the Sprint 1 backend endpoint POST /fields/{id}/harvest
// via the shared offline-safe submit path.

import { CaptureValidationError, submitCapture, type SubmitResult } from '@/lib/offline/submit'

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

/** Back-compat alias — harvest validation errors are capture validation errors. */
export const HarvestValidationError = CaptureValidationError
export type { SubmitResult }

export function submitHarvest(
    fieldId: string,
    fieldLabel: string,
    input: HarvestInput,
): Promise<SubmitResult> {
    return submitCapture({
        kind: 'harvest',
        endpoint: `/fields/${fieldId}/harvest`,
        label: `Harvest — ${fieldLabel}`,
        body: input,
    })
}
