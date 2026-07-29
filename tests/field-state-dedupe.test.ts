// Field-state request deduplication (Workstream: July 2026 perf).
//
// REGRESSION: useMultiFieldState (dashboard) and useFieldState (field page)
// kept entirely separate caches, so the same field's /field/{id}/state was
// requested by both. Production logs showed one field id fetched 4-5 times
// concurrently against an endpoint then taking 131-212 SECONDS per call.
//
// Run with: npm test (tsx --test).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { partitionCached } from '../hooks/useMultiFieldState'
import { fieldStateKey } from '../hooks/useFieldState'
import type { FieldState } from '../lib/field-state-types'

const fake = (id: string) => ({ field: { id, name: id } } as unknown as FieldState)

test('ids already in the per-field cache are not re-requested', () => {
    const cache: Record<string, FieldState> = { a: fake('a'), c: fake('c') }
    const { hits, misses } = partitionCached(['a', 'b', 'c', 'd'], (id) => cache[id])

    assert.deepEqual(misses, ['b', 'd'], 'only uncached ids should be fetched')
    assert.deepEqual(Object.keys(hits).sort(), ['a', 'c'])
    assert.equal(hits.a, cache.a, 'the cached value itself is reused')
})

test('with an empty cache every id is fetched', () => {
    const { hits, misses } = partitionCached(['a', 'b'], () => undefined)
    assert.deepEqual(misses, ['a', 'b'])
    assert.deepEqual(hits, {})
})

test('with no cache accessor at all nothing is skipped', () => {
    const { misses } = partitionCached(['a', 'b'])
    assert.deepEqual(misses, ['a', 'b'])
})

test('a fully cached set issues no requests', () => {
    const cache: Record<string, FieldState> = { a: fake('a'), b: fake('b') }
    const { misses } = partitionCached(['a', 'b'], (id) => cache[id])
    assert.deepEqual(misses, [], 'a warm cache must produce zero network calls')
})

// --- Source invariants: the two hooks must share ONE cache key space --------
const MULTI = readFileSync('hooks/useMultiFieldState.ts', 'utf8')

test('the multi-field fetch seeds the per-field cache useFieldState reads', () => {
    // Without this, loading the dashboard and then opening a field re-fetches
    // state the browser already has.
    assert.match(MULTI, /import \{ fieldStateKey \} from '\.\/useFieldState'/)
    assert.match(MULTI, /globalMutate\(fieldStateKey\(fieldId\), state, \{ revalidate: false \}\)/)
})

test('the multi-field hook reads the per-field cache before fetching', () => {
    assert.match(MULTI, /useSWRConfig\(\)/)
    assert.match(MULTI, /fetchMany\(ids, cachedState\)/)
})

test('both hooks derive their key from the same helper', () => {
    // A divergent key format would silently reintroduce two separate caches.
    assert.equal(fieldStateKey('abc'), 'field-state:abc')
    assert.equal(fieldStateKey(null), null)
    assert.equal(fieldStateKey(undefined), null)
})
