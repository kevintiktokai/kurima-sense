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
