import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    carriesVerification,
    coveragePeriod,
    forwardedLabel,
    formatHectares,
    kindLabel,
    shortDigest,
    sortByIssued,
    type IssuedDocument,
} from '@/lib/document-utils'

function doc(over: Partial<IssuedDocument> = {}): IssuedDocument {
    return {
        issue_number: 'EP-2026-000143',
        kind: 'evidence_pack',
        subject: 'Servemox',
        coverage_start: '2025-11-01',
        coverage_end: '2026-05-31',
        hectares: 214,
        content_sha256: 'abcdef0123456789abcdef',
        issued_at: '2026-08-06T00:00:00Z',
        forwarded_at: null,
        forwarded_note: null,
        ...over,
    }
}

// ── Kinds ────────────────────────────────────────────────────────────────────

test('kindLabel matches the PDF cover', () => {
    assert.equal(kindLabel('evidence_pack'), 'Season Evidence Pack')
    assert.equal(kindLabel('season_plan'), 'Season Plan')
})

test('an unknown kind shows the key rather than an empty cell', () => {
    // A blank row is unreadable; a raw key is obviously odd and gets reported.
    assert.equal(kindLabel('something_new'), 'something_new')
})

test('only the two coverage-asserting documents carry a verification line', () => {
    // A "Verified" column would otherwise read as though the field report and
    // season plan had failed at something, rather than not claiming it.
    assert.equal(carriesVerification('evidence_pack'), true)
    assert.equal(carriesVerification('portfolio_report'), true)
    assert.equal(carriesVerification('field_report'), false)
    assert.equal(carriesVerification('season_plan'), false)
})

// ── Coverage ─────────────────────────────────────────────────────────────────

test('coveragePeriod reads as one range', () => {
    assert.equal(coveragePeriod(doc()), '1 Nov 2025 – 31 May 2026')
})

test('a half-known period is null rather than open-ended', () => {
    // "1 Nov 2025 –" invites the reader to fill in the rest themselves.
    assert.equal(coveragePeriod(doc({ coverage_end: null })), null)
    assert.equal(coveragePeriod(doc({ coverage_start: null })), null)
})

test('months are spelled, because these documents cross date conventions', () => {
    // 5/6/2026 means two different days in Harare and New York.
    assert.match(coveragePeriod(doc({ coverage_start: '2026-06-05', coverage_end: '2026-06-05' }))!, /Jun/)
})

// ── Hectares ─────────────────────────────────────────────────────────────────

test('formatHectares mirrors the backend precision rule', () => {
    // Satellite boundaries do not justify two decimals; 214.37 ha invites a
    // buyer to check it against a cadastral record and find it wrong.
    assert.equal(formatHectares(214.37), '214 ha')
    assert.equal(formatHectares(2.44), '2.4 ha')
})

test('absent hectares render as a dash, not a zero', () => {
    // Zero hectares is a claim; absent is not.
    assert.equal(formatHectares(null), '—')
})

test('large areas are thousands-separated', () => {
    assert.equal(formatHectares(12450), '12,450 ha')
})

// ── Digest ───────────────────────────────────────────────────────────────────

test('shortDigest is comparable by eye', () => {
    assert.equal(shortDigest('abcdef0123456789abcdef'), 'abcdef012345')
})

test('shortDigest survives a missing hash', () => {
    assert.equal(shortDigest(''), '')
})

// ── Forwarding ───────────────────────────────────────────────────────────────

test('an unsent document says the record is absent, not that it was not sent', () => {
    // We do not know — nothing tracks where a client's file went, by design.
    // Stating an absence of record as an absence of sending is exactly the
    // inference the registry refuses to make.
    assert.equal(forwardedLabel(doc()), 'Not recorded as sent')
})

test('a forwarded document shows when, and the note if there is one', () => {
    assert.equal(
        forwardedLabel(doc({ forwarded_at: '2026-08-07T00:00:00Z' })),
        'Sent 7 Aug 2026',
    )
    assert.equal(
        forwardedLabel(doc({ forwarded_at: '2026-08-07T00:00:00Z', forwarded_note: 'to BAT' })),
        'Sent 7 Aug 2026 · to BAT',
    )
})

// ── Ordering ─────────────────────────────────────────────────────────────────

test('newest first', () => {
    const rows = sortByIssued([
        doc({ issue_number: 'old', issued_at: '2026-01-01T00:00:00Z' }),
        doc({ issue_number: 'new', issued_at: '2026-08-06T00:00:00Z' }),
    ])
    assert.deepEqual(rows.map((r) => r.issue_number), ['new', 'old'])
})

test('a document with no issue date sorts last rather than disappearing', () => {
    // An unreadable timestamp is not a reason to hide a row from a registry.
    const rows = sortByIssued([
        doc({ issue_number: 'undated', issued_at: null }),
        doc({ issue_number: 'dated', issued_at: '2026-08-06T00:00:00Z' }),
    ])
    assert.deepEqual(rows.map((r) => r.issue_number), ['dated', 'undated'])
})

test('sorting does not mutate the input', () => {
    const input = [doc({ issue_number: 'a' }), doc({ issue_number: 'b', issued_at: '2027-01-01T00:00:00Z' })]
    sortByIssued(input)
    assert.equal(input[0].issue_number, 'a')
})
