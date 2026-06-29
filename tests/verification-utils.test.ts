// Verification utils — pure helpers + fetcher. Run with: npm test (tsx --test).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    fetchFieldVerification,
    statusStyle,
    verificationHeadline,
    type FieldVerification,
} from '../lib/verification-utils'

function fv(p: Partial<FieldVerification> = {}): FieldVerification {
    return {
        field_id: 'f1', n_inputs: 0, n_verified: 0, n_flagged: 0, n_unknown: 0,
        verification_pct: null, inputs: [], ...p,
    }
}

test('statusStyle maps statuses and falls back to unknown', () => {
    assert.equal(statusStyle('verified').label, 'Verified')
    assert.equal(statusStyle('flagged').label, 'No response')
    assert.equal(statusStyle('unknown').label, 'Unverifiable')
    assert.equal(statusStyle('garbage').label, 'Unverifiable')
})

test('verificationHeadline: no inputs', () => {
    assert.equal(verificationHeadline(fv({ n_inputs: 0 })), 'No inputs logged yet')
})

test('verificationHeadline: inputs but none judgeable', () => {
    assert.equal(
        verificationHeadline(fv({ n_inputs: 2, n_unknown: 2 })),
        'Not enough satellite coverage to verify inputs',
    )
})

test('verificationHeadline: confirmed ratio (plural + singular)', () => {
    assert.equal(
        verificationHeadline(fv({ n_inputs: 3, n_verified: 2, n_flagged: 1 })),
        '2 of 3 verifiable inputs confirmed',
    )
    assert.equal(
        verificationHeadline(fv({ n_inputs: 1, n_verified: 1, n_flagged: 0 })),
        '1 of 1 verifiable input confirmed',
    )
})

test('fetchFieldVerification returns parsed body / throws on non-ok', async () => {
    const body = fv({ n_inputs: 1, n_verified: 1 })
    const okFetch = (async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch
    assert.equal((await fetchFieldVerification('/x', async () => ({}), okFetch)).n_verified, 1)

    const badFetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch
    await assert.rejects(() => fetchFieldVerification('/x', async () => ({}), badFetch), /404/)
})
