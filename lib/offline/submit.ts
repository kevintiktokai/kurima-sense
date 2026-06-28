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
    // Always attempt the live send first. We do NOT gate on navigator.onLine —
    // it is unreliable in PWAs/WKWebViews (often false while online) and would
    // wrongly divert submissions to the offline queue. httpSend already returns a
    // retriable result on an actual network failure, so a genuinely-offline send
    // simply falls through to the outbox below.
    const res = await httpSend(args.endpoint, args.body)
    if (res.ok) {
        void runSync() // opportunistically drain anything queued earlier
        return { status: 'submitted' }
    }
    if (!res.retriable) throw new CaptureValidationError(res.error)

    // transient / offline → queue for automatic replay
    await enqueue({ kind: args.kind, endpoint: args.endpoint, body: args.body, label: args.label })
    return { status: 'queued' }
}
