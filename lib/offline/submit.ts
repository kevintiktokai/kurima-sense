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
    method?: 'POST' | 'PATCH'
}): Promise<SubmitResult> {
    // Always attempt the live send first. We do NOT gate on navigator.onLine —
    // it is unreliable in PWAs/WKWebViews (often false while online) and would
    // wrongly divert submissions to the offline queue. httpSend already returns a
    // retriable result on an actual network failure, so a genuinely-offline send
    // simply falls through to the outbox below.
    // One key for the live attempt AND the queued replay of that same attempt.
    //
    // This is the subtle half. The failure we queue on includes the ambiguous
    // case — the request arrived, the row was committed, and only the response
    // was lost. If the queued item got a fresh key, the replay would look like
    // a brand-new capture to the server and the harvest would be recorded
    // twice, which is precisely what the key exists to prevent. Minting it once
    // here is what ties the two attempts together.
    const idempotencyKey = crypto.randomUUID()

    const res = await httpSend(args.endpoint, args.body, args.method ?? 'POST', idempotencyKey)
    if (res.ok) {
        void runSync() // opportunistically drain anything queued earlier
        return { status: 'submitted' }
    }
    if (!res.retriable) throw new CaptureValidationError(res.error)

    // transient / offline → queue for automatic replay, under the same key
    await enqueue({
        kind: args.kind,
        endpoint: args.endpoint,
        body: args.body,
        label: args.label,
        method: args.method,
        id: idempotencyKey,
    })
    return { status: 'queued' }
}
