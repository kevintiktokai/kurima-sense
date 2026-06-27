'use client'

// Shared submit path for all capture events: try the network first, surface
// validation errors inline (never queue invalid data), and queue transient /
// offline captures into the outbox for automatic replay.

import { enqueue, httpSend, runSync } from './outbox'
import type { CaptureKind } from './types'

/** Thrown for validation (4xx) errors so a form can show them inline. */
export class CaptureValidationError extends Error {}

export type SubmitResult = { status: 'submitted' } | { status: 'queued' }

export async function submitCapture(args: {
    kind: CaptureKind
    endpoint: string
    label: string
    body: unknown
}): Promise<SubmitResult> {
    const online = typeof navigator === 'undefined' || navigator.onLine
    if (online) {
        const res = await httpSend(args.endpoint, args.body)
        if (res.ok) {
            void runSync() // opportunistically drain anything queued earlier
            return { status: 'submitted' }
        }
        if (!res.retriable) throw new CaptureValidationError(res.error)
        // transient → fall through to queue
    }
    await enqueue({ kind: args.kind, endpoint: args.endpoint, body: args.body, label: args.label })
    return { status: 'queued' }
}
