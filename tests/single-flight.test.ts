// Concurrent callers asking for the same thing make one request.
//
// A TTL cache answers "have we fetched this?". It cannot answer "are we
// fetching it right now?", and on a cold cache — a fresh page load, which is
// exactly when the app is judged — that gap is a thundering herd. Production:
//
//     "path": "/climate/historical", "duration_ms": 4572.42
//     "path": "/climate/historical", "duration_ms": 4572.61
//     "path": "/climate/historical", "duration_ms": 4572.61
//     "path": "/climate/historical", "duration_ms": 4572.62
//
// Four requests for one answer, settling within a fifth of a millisecond of
// each other, because four components mounted together and every one of them
// checked the cache before any of them had written to it. The server runs a
// single worker; each of those requests held a slot on it.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { coalesce, newInflightMap } from '../lib/single-flight'

const ROOT = process.cwd()

const deferred = <T>() => {
    let resolve!: (v: T) => void
    let reject!: (e: unknown) => void
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
}

test('four concurrent callers produce one request', async () => {
    const inflight = newInflightMap<string>()
    let calls = 0
    const gate = deferred<string>()
    const producer = () => { calls++; return gate.promise }

    const all = Promise.all([
        coalesce('climate_historical|field_id=abc', inflight, producer),
        coalesce('climate_historical|field_id=abc', inflight, producer),
        coalesce('climate_historical|field_id=abc', inflight, producer),
        coalesce('climate_historical|field_id=abc', inflight, producer),
    ])
    gate.resolve('24°C')

    assert.deepEqual(await all, ['24°C', '24°C', '24°C', '24°C'])
    assert.equal(calls, 1, 'the four callers must share one request')
})

test('different keys are not coalesced together', async () => {
    // The counterpart. Collapsing two genuinely different questions onto one
    // answer would be far worse than the duplicate requests this fixes — one
    // field would silently show another field's weather.
    const inflight = newInflightMap<string>()
    const seen: string[] = []
    const producer = (name: string) => async () => { seen.push(name); return name }

    const [a, b] = await Promise.all([
        coalesce('climate_historical|field_id=abc', inflight, producer('abc')),
        coalesce('climate_historical|field_id=xyz', inflight, producer('xyz')),
    ])

    assert.equal(a, 'abc')
    assert.equal(b, 'xyz')
    assert.deepEqual(seen.sort(), ['abc', 'xyz'])
})

test('a later caller starts a fresh request once the first has settled', async () => {
    // Coalescing, not caching. Holding the result here would silently give the
    // caller stale data with no TTL governing it — the cache layer owns that.
    const inflight = newInflightMap<number>()
    let calls = 0
    const producer = async () => ++calls

    assert.equal(await coalesce('k', inflight, producer), 1)
    assert.equal(await coalesce('k', inflight, producer), 2)
    assert.equal(inflight.size, 0, 'a settled flight must not be left in the map')
})

test('a failure reaches everyone waiting on it', async () => {
    // They asked the same question; there is one answer, including when the
    // answer is a failure. Resolving the joiners with undefined would hand a
    // component a blank card and no error.
    const inflight = newInflightMap<string>()
    const gate = deferred<string>()
    const producer = () => gate.promise

    const first = coalesce('k', inflight, producer)
    const second = coalesce('k', inflight, producer)
    gate.reject(new Error('HTTP 503'))

    await assert.rejects(first, /HTTP 503/)
    await assert.rejects(second, /HTTP 503/)
    assert.equal(inflight.size, 0, 'a rejected flight must not wedge the key')
})

test('a producer that throws synchronously leaves no dangling entry', async () => {
    // Without wrapping the producer call, a synchronous throw escapes before the
    // map is written — or worse, after — and wedges the key for the session.
    const inflight = newInflightMap<string>()
    const producer = () => { throw new Error('boom') }

    await assert.rejects(coalesce('k', inflight, producer as () => Promise<string>), /boom/)
    assert.equal(inflight.size, 0)
})

test('a slow flight settling late does not evict a newer one', async () => {
    // The subtle one. Clearing the key unconditionally in `finally` means an old
    // flight finishing after a new one began deletes the new entry, and the next
    // caller starts a third request — the herd, reintroduced under load.
    const inflight = newInflightMap<string>()
    const slow = deferred<string>()

    const first = coalesce('k', inflight, () => slow.promise)
    // Force the key to a newer flight, as a retry or a cache expiry would.
    const newer = Promise.resolve('newer')
    inflight.set('k', newer)

    slow.resolve('older')
    await first

    assert.equal(inflight.get('k'), newer, 'the newer flight must survive')
})

test('the climate service actually uses it', () => {
    // Wiring guard. The helper can be perfect and unreached, which is the state
    // the duplicate requests were already in — nothing failed, the page worked,
    // and it cost four times the server capacity it needed.
    const src = readFileSync(join(ROOT, 'services', 'climate.ts'), 'utf8')
    assert.match(src, /from '@\/lib\/single-flight'/)
    assert.match(src, /coalesce\(cacheKey, inflight/)
})

test('the in-flight key matches the cache key exactly', () => {
    // If the two keys were derived differently, two callers could share a
    // request but write to different cache entries — or miss each other
    // entirely and the coalescing would quietly do nothing.
    const src = readFileSync(join(ROOT, 'services', 'climate.ts'), 'utf8')
    assert.match(src, /const cacheKey = `\$\{cacheKeyPrefix\}\|\$\{buildKey\(options\)\}`/)
    assert.match(src, /coalesce\(cacheKey,/)
})
