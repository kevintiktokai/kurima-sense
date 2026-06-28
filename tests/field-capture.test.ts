// Regression: isNetworkError must classify by the thrown error, NOT
// navigator.onLine — so a flaky online flag can never divert a real save to the
// offline queue, and real server errors are surfaced (not silently queued).
// Run with: npm test (tsx --test).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isNetworkError } from '../services/fieldCapture'

test('a failed fetch (TypeError) is a network error', () => {
    assert.equal(isNetworkError(new TypeError('Failed to fetch')), true)
    assert.equal(isNetworkError(new TypeError('Load failed')), true)
})

test('network-ish error messages are network errors', () => {
    assert.equal(isNetworkError(new Error('NetworkError when attempting to fetch resource')), true)
    assert.equal(isNetworkError(new Error('Network request failed')), true)
})

test('HTTP error responses are NOT network errors (must surface, not queue)', () => {
    assert.equal(isNetworkError(new Error('Failed to save field (500): boom')), false)
    assert.equal(isNetworkError(new Error('422: invalid')), false)
})

test('non-errors are not network errors', () => {
    assert.equal(isNetworkError(undefined), false)
    assert.equal(isNetworkError(null), false)
    assert.equal(isNetworkError('nope'), false)
})
