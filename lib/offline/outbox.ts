// Browser-facing outbox API: enqueue captures, drain them, and broadcast
// pending-count changes to the UI. The pure queue logic lives in sync.ts /
// backoff.ts; this module wires it to IndexedDB, fetch, and DOM events.

'use client'

import { getAuthHeaders } from '@/lib/api-cache'
import { createIdbStore } from './store'
import { syncOutbox, type SendResult } from './sync'
import type { CaptureKind, OutboxItem, OutboxStore } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

let _store: OutboxStore | null = null
function store(): OutboxStore {
    if (!_store) _store = createIdbStore()
    return _store
}

// ── pending-count pub/sub (UI badge) ───────────────────────────────────────
type Listener = (count: number) => void
const listeners = new Set<Listener>()

export function subscribeOutbox(cb: Listener): () => void {
    listeners.add(cb)
    void getItems().then((items) => cb(items.length))
    return () => listeners.delete(cb)
}

async function notify(): Promise<void> {
    const items = await store().getAll()
    listeners.forEach((cb) => cb(items.length))
}

// ── HTTP transport (shared by the sync engine and direct submits) ───────────
/**
 * Send one capture to the backend with a freshly-minted Supabase JWT.
 * Classifies the outcome: 4xx validation = permanent (don't retry); network
 * errors, 5xx, 408 and 429 = retriable.
 */
export async function httpSend(
    endpoint: string,
    body: unknown,
    method: 'POST' = 'POST',
): Promise<SendResult> {
    try {
        const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: JSON.stringify(body),
        })
        if (res.ok) return { ok: true }

        const transient = res.status >= 500 || res.status === 408 || res.status === 429
        let detail = res.statusText
        try {
            const j = await res.json()
            if (j?.detail) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
        } catch {
            /* non-JSON error body */
        }
        return { ok: false, retriable: transient, error: `${res.status}: ${detail}` }
    } catch (e) {
        // fetch threw → offline / DNS / CORS: retriable
        return { ok: false, retriable: true, error: (e as Error)?.message ?? 'network error' }
    }
}

// ── public API ──────────────────────────────────────────────────────────────
export async function enqueue(args: {
    kind: CaptureKind
    endpoint: string
    body: unknown
    label: string
}): Promise<OutboxItem> {
    const now = Date.now()
    const item: OutboxItem = {
        id: crypto.randomUUID(),
        kind: args.kind,
        endpoint: args.endpoint,
        method: 'POST',
        body: args.body,
        label: args.label,
        createdAt: now,
        attempts: 0,
        nextAttemptAt: now,
        status: 'pending',
    }
    await store().put(item)
    await notify()
    return item
}

export async function getItems(): Promise<OutboxItem[]> {
    return (await store().getAll()).sort((a, b) => a.createdAt - b.createdAt)
}

export async function getPendingCount(): Promise<number> {
    return (await store().getAll()).filter((i) => i.status === 'pending').length
}

/** Discard a parked/failed item (user chose not to retry). */
export async function discard(id: string): Promise<void> {
    await store().delete(id)
    await notify()
}

/** Re-arm a failed item for an immediate retry. */
export async function retryNow(id: string): Promise<void> {
    const items = await store().getAll()
    const item = items.find((i) => i.id === id)
    if (!item) return
    await store().put({ ...item, status: 'pending', nextAttemptAt: Date.now() })
    await runSync()
}

let _syncing = false
export async function runSync() {
    if (_syncing) return
    _syncing = true
    try {
        const summary = await syncOutbox(store(), (it) => httpSend(it.endpoint, it.body, it.method))
        await notify()
        return summary
    } finally {
        _syncing = false
    }
}

/** Wire automatic draining: on reconnect, on tab focus, and on an interval.
 *  Safe to call once from a top-level client component. Returns a cleanup fn. */
export function initOutboxAutoSync(): () => void {
    if (typeof window === 'undefined') return () => {}
    const onOnline = () => void runSync()
    const onVisible = () => {
        if (document.visibilityState === 'visible') void runSync()
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    // Always attempt on the interval — never gate on navigator.onLine, which can
    // be stuck false in PWAs/WKWebViews and would leave queued items stranded.
    // runSync()/httpSend handle a genuinely-offline attempt by re-queuing.
    const timer = window.setInterval(() => void runSync(), 60_000)
    // Opportunistic drain on startup.
    void runSync()
    return () => {
        window.removeEventListener('online', onOnline)
        document.removeEventListener('visibilitychange', onVisible)
        window.clearInterval(timer)
    }
}
