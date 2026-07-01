// Input verification — types mirror the backend GET /fields/{id}/verification
// (kurimasense-backend/schemas.py) + pure display helpers. Framework-free so
// node:test can import them.

export type VerificationStatus = 'verified' | 'flagged' | 'unknown'

export interface InputVerification {
    input_date: string
    input_type: string | null
    ndvi_before: number | null
    ndvi_after: number | null
    response_delta: number | null
    status: VerificationStatus
    reason: string
}

export interface FieldVerification {
    field_id: string
    n_inputs: number
    n_verified: number
    n_flagged: number
    n_unknown: number
    verification_pct: number | null
    inputs: InputVerification[]
}

export interface StatusStyle {
    label: string
    color: string
    icon: string // Material Symbols ligature
}

const STATUS_STYLE: Record<VerificationStatus, StatusStyle> = {
    verified: { label: 'Verified', color: 'var(--ee-primary)', icon: 'check_circle' },
    flagged: { label: 'No response', color: '#c44', icon: 'error' },
    unknown: { label: 'Unverifiable', color: 'var(--ee-muted)', icon: 'help' },
}

export function statusStyle(status: string): StatusStyle {
    return STATUS_STYLE[(status as VerificationStatus)] ?? STATUS_STYLE.unknown
}

/** Human headline for the card, e.g. "2 of 3 inputs verified" / "No inputs logged". */
export function verificationHeadline(v: FieldVerification): string {
    if (v.n_inputs === 0) return 'No inputs logged yet'
    const judgeable = v.n_verified + v.n_flagged
    if (judgeable === 0) return 'Not enough satellite coverage to verify inputs'
    return `${v.n_verified} of ${judgeable} verifiable input${judgeable === 1 ? '' : 's'} confirmed`
}

export async function fetchFieldVerification(
    url: string,
    getHeaders: () => Promise<HeadersInit>,
    fetchImpl: typeof fetch = fetch,
): Promise<FieldVerification> {
    const headers = await getHeaders()
    const res = await fetchImpl(url, { headers })
    if (!res.ok) throw new Error(`Failed to load verification (${res.status})`)
    return (await res.json()) as FieldVerification
}

// ───── Portfolio rollup — mirrors backend GET /tenants/{id}/verification ─────

/** Per-field summary within the portfolio rollup (backend sorts most-flagged first). */
export interface FieldVerificationSummary {
    field_id: string
    field_name: string | null
    grower_name: string | null
    n_inputs: number
    n_verified: number
    n_flagged: number
    n_unknown: number
    verification_pct: number | null
}

export interface PortfolioVerification {
    tenant_id: string
    field_count: number          // fields with ≥1 logged input
    fields_with_flagged: number
    total_flagged_inputs: number
    total_inputs: number
    fields: FieldVerificationSummary[]
}

/** Split fields into those with ≥1 flagged input (need attention) and the rest. */
export function partitionFieldsByFlag(fields: FieldVerificationSummary[]): {
    flagged: FieldVerificationSummary[]
    ok: FieldVerificationSummary[]
} {
    return {
        flagged: fields.filter((f) => f.n_flagged > 0),
        ok: fields.filter((f) => f.n_flagged === 0),
    }
}

/** Headline for a field summary row, e.g. "2 flagged of 5 inputs · 1 unverifiable". */
export function fieldSummaryHeadline(f: FieldVerificationSummary): string {
    const parts: string[] = []
    if (f.n_flagged > 0) parts.push(`${f.n_flagged} flagged of ${f.n_inputs} input${f.n_inputs === 1 ? '' : 's'}`)
    else parts.push(`${f.n_verified} of ${f.n_inputs} verified`)
    if (f.n_unknown > 0) parts.push(`${f.n_unknown} unverifiable`)
    return parts.join(' · ')
}

export async function fetchPortfolioVerification(
    url: string,
    getHeaders: () => Promise<HeadersInit>,
    fetchImpl: typeof fetch = fetch,
): Promise<PortfolioVerification> {
    const headers = await getHeaders()
    const res = await fetchImpl(url, { headers })
    if (!res.ok) throw new Error(`Failed to load verification (${res.status})`)
    return (await res.json()) as PortfolioVerification
}
