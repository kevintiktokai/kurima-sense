'use client'

// Scouting capture: AI photo diagnosis (online) + durable observation save
// (offline-capable via the shared outbox, wraps POST /fields/{id}/scouting).

import { api } from '@/services/api'
import { CaptureValidationError, submitCapture, type SubmitResult } from '@/lib/offline/submit'

export type ScoutCategory = 'pest' | 'disease' | 'weed' | 'water' | 'nutrient' | 'general'
export type ScoutSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ScoutObservation {
    category: ScoutCategory
    severity: ScoutSeverity
    notes?: string | null
    lat?: number | null
    lon?: number | null
    diagnosis?: unknown
    source?: 'grower_logged' | 'ai_diagnosis'
}

export const ScoutingValidationError = CaptureValidationError
export type { SubmitResult }

/** Online-only: diagnosis needs the vision model. Throws on failure. */
export async function diagnosePhoto(base64: string, cropType?: string) {
    return api.analyzeImage(base64, {
        cropType,
        additionalContext: 'Field scouting photo',
    })
}

/** Persist a scouting observation. Offline-capable — queued and replayed. */
export function saveScoutingObservation(
    fieldId: string,
    fieldLabel: string,
    obs: ScoutObservation,
): Promise<SubmitResult> {
    return submitCapture({
        kind: 'scouting',
        endpoint: `/fields/${fieldId}/scouting`,
        label: `Scouting — ${obs.category} (${fieldLabel})`,
        body: obs,
    })
}
