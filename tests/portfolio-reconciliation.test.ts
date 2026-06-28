// Reconciliation utils — pure helpers + fetcher. Run with: npm test (tsx --test).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    fetchReconciliation,
    flagStyle,
    formatTonnes,
    partitionByFlag,
    type GrowerReconciliation,
    type ReconciliationResponse,
} from '../lib/reconciliation-utils'

function g(id: string, flag: GrowerReconciliation['flag']): GrowerReconciliation {
    return {
        grower_id: id, grower_name: `G${id}`,
        contracted_volume_tonnes: 10, projected_volume_tonnes: 10,
        delivered_volume_tonnes: 5, expected_volume_tonnes: 10,
        delivery_gap_pct: 50, side_marketing_volume_tonnes: 5,
        flag, reasons: ['because'],
    }
}

test('flagStyle maps known flags and falls back to none', () => {
    assert.equal(flagStyle('flag').label, 'Side-marketing risk')
    assert.equal(flagStyle('watch').label, 'Watch')
    assert.equal(flagStyle('none').label, 'On track')
    assert.equal(flagStyle('garbage').label, 'On track')
})

test('partitionByFlag groups by flag', () => {
    const p = partitionByFlag([g('1', 'flag'), g('2', 'watch'), g('3', 'none'), g('4', 'flag')])
    assert.deepEqual(p.flagged.map((x) => x.grower_id), ['1', '4'])
    assert.deepEqual(p.watch.map((x) => x.grower_id), ['2'])
    assert.deepEqual(p.ok.map((x) => x.grower_id), ['3'])
})

test('formatTonnes rounds to 1dp and handles null', () => {
    assert.equal(formatTonnes(5.25), '5.3 t')
    assert.equal(formatTonnes(0), '0 t')
    assert.equal(formatTonnes(null), '—')
    assert.equal(formatTonnes(undefined), '—')
})

test('fetchReconciliation returns parsed body on success', async () => {
    const body: ReconciliationResponse = {
        tenant_id: 't1', grower_count: 1, flagged_count: 1, watch_count: 0,
        total_side_marketing_tonnes: 5, growers: [g('1', 'flag')],
    }
    const fakeFetch = (async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch
    const res = await fetchReconciliation('/x', async () => ({}), fakeFetch)
    assert.equal(res.flagged_count, 1)
    assert.equal(res.growers[0].grower_id, '1')
})

test('fetchReconciliation throws on non-ok', async () => {
    const fakeFetch = (async () => ({ ok: false, status: 403 })) as unknown as typeof fetch
    await assert.rejects(() => fetchReconciliation('/x', async () => ({}), fakeFetch), /403/)
})
