// Offline capture outbox — pure logic tests. Run with: npm test (tsx --test).
// Storage and transport are injected, so no IndexedDB / fetch is needed.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    MAX_ATTEMPTS,
    hasExhausted,
    isReadyToRetry,
    nextRetryDelayMs,
} from '../lib/offline/backoff'
import { syncOutbox, type Sender } from '../lib/offline/sync'
import { createMemoryStore } from '../lib/offline/store'
import type { OutboxItem } from '../lib/offline/types'

function item(p: Partial<OutboxItem> = {}): OutboxItem {
    return {
        id: p.id ?? crypto.randomUUID(),
        kind: 'harvest',
        endpoint: '/fields/f1/harvest',
        method: 'POST',
        body: { actual_yield_tonnes: 2.1 },
        label: 'Harvest — Test',
        createdAt: p.createdAt ?? 1000,
        attempts: p.attempts ?? 0,
        nextAttemptAt: p.nextAttemptAt ?? 0,
        status: p.status ?? 'pending',
        ...p,
    }
}

// ── backoff ──────────────────────────────────────────────────────────────
test('nextRetryDelayMs is exponential from 5s and capped at 1h', () => {
    assert.equal(nextRetryDelayMs(1), 5_000)
    assert.equal(nextRetryDelayMs(2), 10_000)
    assert.equal(nextRetryDelayMs(3), 20_000)
    assert.equal(nextRetryDelayMs(50), 60 * 60 * 1000) // capped
})

test('hasExhausted at MAX_ATTEMPTS', () => {
    assert.equal(hasExhausted(MAX_ATTEMPTS - 1), false)
    assert.equal(hasExhausted(MAX_ATTEMPTS), true)
})

test('isReadyToRetry needs pending status and elapsed gate', () => {
    assert.equal(isReadyToRetry(item({ status: 'pending', nextAttemptAt: 100 }), 200), true)
    assert.equal(isReadyToRetry(item({ status: 'pending', nextAttemptAt: 300 }), 200), false)
    assert.equal(isReadyToRetry(item({ status: 'failed', nextAttemptAt: 0 }), 200), false)
})

// ── sync engine ─────────────────────────────────────────────────────────
test('successful send deletes the item', async () => {
    const store = createMemoryStore([item({ id: 'a' })])
    const send: Sender = async () => ({ ok: true })
    const summary = await syncOutbox(store, send, 5000)
    assert.equal(summary.sent, 1)
    assert.equal(summary.remaining, 0)
    assert.deepEqual(await store.getAll(), [])
})

test('retriable failure re-arms with backoff and increments attempts', async () => {
    const store = createMemoryStore([item({ id: 'a', attempts: 0, nextAttemptAt: 0 })])
    const send: Sender = async () => ({ ok: false, retriable: true, error: 'offline' })
    const now = 10_000
    const summary = await syncOutbox(store, send, now)
    assert.equal(summary.sent, 0)
    assert.equal(summary.failed, 1)
    const [it] = await store.getAll()
    assert.equal(it.attempts, 1)
    assert.equal(it.status, 'pending')
    assert.equal(it.lastError, 'offline')
    assert.equal(it.nextAttemptAt, now + 5_000) // backoff for attempt 1
})

test('non-retriable failure parks the item as failed (no auto-retry)', async () => {
    const store = createMemoryStore([item({ id: 'a' })])
    const send: Sender = async () => ({ ok: false, retriable: false, error: '422: bad yield' })
    const summary = await syncOutbox(store, send, 5000)
    assert.equal(summary.failed, 1)
    const [it] = await store.getAll()
    assert.equal(it.status, 'failed')
    assert.equal(it.nextAttemptAt, Number.MAX_SAFE_INTEGER)
    assert.equal(isReadyToRetry(it, Date.now()), false)
})

test('exhausted retries park as failed', async () => {
    const store = createMemoryStore([item({ id: 'a', attempts: MAX_ATTEMPTS - 1, nextAttemptAt: 0 })])
    const send: Sender = async () => ({ ok: false, retriable: true, error: 'still offline' })
    await syncOutbox(store, send, 5000)
    const [it] = await store.getAll()
    assert.equal(it.attempts, MAX_ATTEMPTS)
    assert.equal(it.status, 'failed')
})

test('a sender that throws is treated as retriable', async () => {
    const store = createMemoryStore([item({ id: 'a' })])
    const send: Sender = async () => {
        throw new Error('boom')
    }
    await syncOutbox(store, send, 5000)
    const [it] = await store.getAll()
    assert.equal(it.status, 'pending')
    assert.equal(it.attempts, 1)
    assert.equal(it.lastError, 'boom')
})

test('items below their backoff gate are skipped', async () => {
    const store = createMemoryStore([item({ id: 'a', nextAttemptAt: 999_999 })])
    let calls = 0
    const send: Sender = async () => {
        calls++
        return { ok: true }
    }
    const summary = await syncOutbox(store, send, 1000)
    assert.equal(calls, 0)
    assert.equal(summary.sent, 0)
    assert.equal(summary.remaining, 1)
})

test('ready items are sent in creation order', async () => {
    const store = createMemoryStore([
        item({ id: 'second', createdAt: 2000 }),
        item({ id: 'first', createdAt: 1000 }),
    ])
    const order: string[] = []
    const send: Sender = async (it) => {
        order.push(it.id)
        return { ok: true }
    }
    await syncOutbox(store, send, 5000)
    assert.deepEqual(order, ['first', 'second'])
})
