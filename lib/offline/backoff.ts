// Pure retry/backoff helpers for the offline outbox. No I/O — unit tested.

import type { OutboxItem } from './types'

/** Stop auto-retrying after this many attempts; the item is parked as 'failed'. */
export const MAX_ATTEMPTS = 8

const BASE_DELAY_MS = 5_000
const MAX_DELAY_MS = 60 * 60 * 1000 // 1 hour ceiling

/** Exponential backoff: 5s, 10s, 20s, … capped at 1h. attempts is 1-based. */
export function nextRetryDelayMs(attempts: number): number {
    const n = Math.max(1, attempts)
    const delay = BASE_DELAY_MS * 2 ** (n - 1)
    return Math.min(delay, MAX_DELAY_MS)
}

export function hasExhausted(attempts: number): boolean {
    return attempts >= MAX_ATTEMPTS
}

/** A pending item is sendable once its backoff gate has elapsed. */
export function isReadyToRetry(item: OutboxItem, now: number): boolean {
    return item.status === 'pending' && item.nextAttemptAt <= now
}
