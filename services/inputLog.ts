'use client'

// Input (fertilizer/chemical) logging — wraps POST /inputs via the shared
// offline-safe submit path. Queues offline and replays automatically.

import { CaptureValidationError, submitCapture, type SubmitResult } from '@/lib/offline/submit'

export interface InputLogEntry {
    field_id: string
    input_type: string
    quantity: number
    unit: string
    // Execution quality — only collected for nitrogen, where placement decides
    // how much of the bag reaches the crop. Optional throughout: an entry
    // without them is still a valid record, it just cannot be assessed.
    application_method?: string
    incorporated?: boolean
}

export const InputLogValidationError = CaptureValidationError
export type { SubmitResult }

export function submitInputLog(
    fieldLabel: string,
    entry: InputLogEntry,
): Promise<SubmitResult> {
    return submitCapture({
        kind: 'input_log',
        endpoint: '/inputs',
        label: `Input — ${entry.input_type} (${fieldLabel})`,
        body: entry,
    })
}
