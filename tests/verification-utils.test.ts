// Verification utils — pure helpers + fetcher. Run with: npm test (tsx --test).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    fetchFieldVerification,
    fetchPortfolioVerification,
    fieldSummaryHeadline,
    partitionFieldsByFlag,
    statusStyle,
    verificationHeadline,
    type FieldVerification,
    type FieldVerificationSummary,
} from '../lib/verification-utils'

function fv(p: Partial<FieldVerification> = {}): FieldVerification {
    return {
        field_id: 'f1', n_inputs: 0, n_verified: 0, n_flagged: 0, n_unknown: 0,
        verification_pct: null, inputs: [], ...p,
    }
}

function fs(p: Partial<FieldVerificationSummary> = {}): FieldVerificationSummary {
    return {
        field_id: 'f1', field_name: 'Field 1', grower_name: null,
        n_inputs: 0, n_verified: 0, n_flagged: 0, n_unknown: 0, verification_pct: null, ...p,
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

test('partitionFieldsByFlag splits on n_flagged', () => {
    const fields = [fs({ field_id: 'a', n_flagged: 2 }), fs({ field_id: 'b', n_flagged: 0 }), fs({ field_id: 'c', n_flagged: 1 })]
    const { flagged, ok } = partitionFieldsByFlag(fields)
    assert.deepEqual(flagged.map((f) => f.field_id), ['a', 'c'])
    assert.deepEqual(ok.map((f) => f.field_id), ['b'])
})

test('fieldSummaryHeadline: flagged vs verified, plural, unknown suffix', () => {
    assert.equal(fieldSummaryHeadline(fs({ n_inputs: 5, n_flagged: 2, n_verified: 3 })), '2 flagged of 5 inputs')
    assert.equal(fieldSummaryHeadline(fs({ n_inputs: 1, n_flagged: 1 })), '1 flagged of 1 input')
    assert.equal(fieldSummaryHeadline(fs({ n_inputs: 4, n_verified: 4 })), '4 of 4 verified')
    assert.equal(
        fieldSummaryHeadline(fs({ n_inputs: 3, n_flagged: 1, n_verified: 1, n_unknown: 1 })),
        '1 flagged of 3 inputs · 1 unverifiable',
    )
})

test('fetchPortfolioVerification returns parsed body / throws on non-ok', async () => {
    const body = { tenant_id: 't1', field_count: 1, fields_with_flagged: 1, total_flagged_inputs: 2, total_inputs: 5, fields: [fs({ n_flagged: 2 })] }
    const okFetch = (async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch
    assert.equal((await fetchPortfolioVerification('/x', async () => ({}), okFetch)).total_flagged_inputs, 2)

    const badFetch = (async () => ({ ok: false, status: 403 })) as unknown as typeof fetch
    await assert.rejects(() => fetchPortfolioVerification('/x', async () => ({}), badFetch), /403/)
})
