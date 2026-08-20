// Generated documents — types and presentation helpers.
// Pure — unit-tested in tests/document-utils.test.ts.
//
// Mirrors the backend's `services/documents/`. The reason these labels live in
// a shared module rather than inline in a component: a document's kind appears
// on the PDF cover, in the registry list, and on the button that generated it,
// and a reader comparing the three has to see the same words.

export type DocumentKind =
    | 'evidence_pack'
    | 'portfolio_report'
    | 'field_report'
    | 'season_plan'

export interface IssuedDocument {
    issue_number: string
    kind: DocumentKind | string
    subject: string
    coverage_start: string | null
    coverage_end: string | null
    hectares: number | null
    content_sha256: string
    issued_at: string | null
    /** Set only when the client says they sent it. Never inferred. */
    forwarded_at: string | null
    forwarded_note: string | null
}

const KIND_LABELS: Record<string, string> = {
    evidence_pack: 'Season Evidence Pack',
    portfolio_report: 'Portfolio Report',
    field_report: 'Field Report',
    season_plan: 'Season Plan',
}

/** The readable name, matching the PDF cover. Unknown kinds show the key rather
 *  than an empty cell — a blank row is unreadable, a raw key is obviously odd. */
export function kindLabel(kind: string): string {
    return KIND_LABELS[kind] ?? kind
}

/**
 * Which documents carry a verification line.
 *
 * The evidence pack and portfolio report assert coverage across ground. The
 * field report explains one field's season and the season plan describes what
 * has not happened yet — verifying a forecast is a category error. Mirrors
 * `services/documents/render.py`, and matters here because a list showing a
 * "Verified" column would otherwise read as though two documents had failed.
 */
export function carriesVerification(kind: string): boolean {
    return kind === 'evidence_pack' || kind === 'portfolio_report'
}

/**
 * The coverage period as one readable string, or null.
 *
 * Null rather than a partial range: a document whose period is half known
 * covers an open-ended stretch of time, and printing "1 Nov 2025 –" invites the
 * reader to fill in the rest themselves.
 */
export function coveragePeriod(doc: IssuedDocument): string | null {
    if (!doc.coverage_start || !doc.coverage_end) return null
    return `${formatDate(doc.coverage_start)} – ${formatDate(doc.coverage_end)}`
}

/** `6 Aug 2026`. Month spelled, because 5/6/2026 means two different days in
 *  Harare and New York and these documents cross both. */
export function formatDate(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    return date.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
    })
}

/**
 * Hectares at the precision the measurement supports.
 *
 * Mirrors `identity.format_hectares`: below 10 ha one decimal, above it whole
 * hectares. Satellite-derived boundaries do not justify two decimals, and a
 * figure printed as 214.37 ha invites a buyer to check it against a cadastral
 * record and find it wrong.
 */
export function formatHectares(hectares: number | null): string {
    if (hectares == null) return '—'
    if (hectares < 10) return `${Math.round(hectares * 10) / 10} ha`
    return `${Math.round(hectares).toLocaleString('en-GB')} ha`
}

/**
 * The short fingerprint shown in the UI.
 *
 * Enough for someone holding a PDF to compare against a registry row by eye;
 * the full hash is still there for anything doing it properly. Twelve hex
 * characters is comfortably beyond accidental collision within one client's
 * documents and short enough to read down a phone line.
 */
export function shortDigest(sha256: string): string {
    return (sha256 || '').slice(0, 12)
}

/**
 * How to describe a document's delivery state.
 *
 * "Not recorded as sent" rather than "Not sent". We do not know — nothing
 * tracks where a client's file went, by design — and stating an absence of
 * record as an absence of sending would be exactly the inference the registry
 * refuses to make.
 */
export function forwardedLabel(doc: IssuedDocument): string {
    if (!doc.forwarded_at) return 'Not recorded as sent'
    const when = formatDate(doc.forwarded_at)
    return doc.forwarded_note ? `Sent ${when} · ${doc.forwarded_note}` : `Sent ${when}`
}

/** Newest first. Documents with no issue date sort last rather than being
 *  dropped — an unreadable timestamp is not a reason to hide a row. */
export function sortByIssued(docs: IssuedDocument[]): IssuedDocument[] {
    return [...docs].sort((a, b) => {
        const at = a.issued_at ? Date.parse(a.issued_at) : NaN
        const bt = b.issued_at ? Date.parse(b.issued_at) : NaN
        if (Number.isNaN(at) && Number.isNaN(bt)) return 0
        if (Number.isNaN(at)) return 1
        if (Number.isNaN(bt)) return -1
        return bt - at
    })
}
