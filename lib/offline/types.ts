// Offline capture outbox — shared types.
//
// The grower app must capture institutional data inputs even with no network
// (rural connectivity is the norm). Backend mutations are cross-origin (the
// Render API), so Workbox's same-origin BackgroundSync does not cover them, and
// a queued request cannot re-attach a fresh Supabase JWT on replay. So we keep
// an explicit app-level outbox in IndexedDB that the UI can surface and that
// re-authenticates each item when it is sent.

export type CaptureKind =
    | 'harvest'
    | 'field_boundary'
    | 'crop_planting'
    | 'input_log'
    | 'scouting'
    | 'task'

export type OutboxStatus = 'pending' | 'failed'

export interface OutboxItem {
    /** Client-generated UUID — stable across retries (idempotency anchor). */
    id: string
    kind: CaptureKind
    /** API path relative to NEXT_PUBLIC_API_URL, e.g. "/fields/<id>/harvest". */
    endpoint: string
    method: 'POST'
    body: unknown
    /** Short human label for the pending-items UI, e.g. "Harvest — North Block". */
    label: string
    createdAt: number
    attempts: number
    /** Epoch ms when this item is next eligible to send (backoff gate). */
    nextAttemptAt: number
    lastAttemptAt?: number
    status: OutboxStatus
    /** Last error message, surfaced in the UI for failed items. */
    lastError?: string
}

/** Minimal persistence contract — implemented by IndexedDB (browser) and an
 *  in-memory store (tests). Keeps the sync engine storage-agnostic/testable. */
export interface OutboxStore {
    getAll(): Promise<OutboxItem[]>
    put(item: OutboxItem): Promise<void>
    delete(id: string): Promise<void>
}
