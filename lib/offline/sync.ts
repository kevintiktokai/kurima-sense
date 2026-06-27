// Outbox sync engine — drains pending items through an injected sender.
// Storage and transport are both injected, so this is fully unit-testable
// (no IndexedDB, no fetch) and the same logic runs in the browser.

import { hasExhausted, isReadyToRetry, nextRetryDelayMs } from './backoff'
import type { OutboxItem, OutboxStore } from './types'

export type SendResult =
    | { ok: true }
    | { ok: false; retriable: boolean; error: string }

/** Transport: send one item. Network/5xx/429 → retriable; 4xx validation →
 *  not retriable (retrying won't help — park as failed for the user to fix). */
export type Sender = (item: OutboxItem) => Promise<SendResult>

export interface SyncSummary {
    sent: number
    failed: number
    remaining: number
}

/**
 * One drain pass: send every ready ('pending' + backoff elapsed) item in
 * creation order. Success deletes the item; a retriable failure re-arms it
 * with backoff; a non-retriable failure (or exhausted retries) parks it as
 * 'failed'. Order is preserved so dependent captures replay in sequence.
 */
export async function syncOutbox(
    store: OutboxStore,
    send: Sender,
    now: number = Date.now(),
): Promise<SyncSummary> {
    const all = await store.getAll()
    const ready = all
        .filter((it) => isReadyToRetry(it, now))
        .sort((a, b) => a.createdAt - b.createdAt)

    let sent = 0
    let failed = 0

    for (const item of ready) {
        let res: SendResult
        try {
            res = await send(item)
        } catch (e) {
            res = { ok: false, retriable: true, error: (e as Error)?.message ?? 'send threw' }
        }

        if (res.ok) {
            await store.delete(item.id)
            sent++
            continue
        }

        const attempts = item.attempts + 1
        const park = !res.retriable || hasExhausted(attempts)
        await store.put({
            ...item,
            attempts,
            lastAttemptAt: now,
            lastError: res.error,
            status: park ? 'failed' : 'pending',
            // Parked items get a far-future gate so they are not auto-retried.
            nextAttemptAt: park ? Number.MAX_SAFE_INTEGER : now + nextRetryDelayMs(attempts),
        })
        failed++
    }

    const remaining = (await store.getAll()).length
    return { sent, failed, remaining }
}
