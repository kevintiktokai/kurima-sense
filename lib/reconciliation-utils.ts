// Reconciliation (side-marketing) — types mirror the backend
// GET /tenants/{id}/reconciliation (kurimasense-backend/schemas.py), plus pure
// display helpers. Kept framework-free so node:test can import them.

import { resilientFetch } from '@/lib/http'

export type ReconFlag = 'none' | 'watch' | 'flag'

export interface GrowerReconciliation {
    grower_id: string
    grower_name: string | null
    contracted_volume_tonnes: number
    projected_volume_tonnes: number
    delivered_volume_tonnes: number
    expected_volume_tonnes: number
    delivery_gap_pct: number
    side_marketing_volume_tonnes: number
    flag: ReconFlag
    reasons: string[]
}

export interface ReconciliationResponse {
    tenant_id: string
    grower_count: number
    flagged_count: number
    watch_count: number
    total_side_marketing_tonnes: number
    growers: GrowerReconciliation[]
}

export interface FlagStyle {
    label: string
    color: string
}

const FLAG_STYLE: Record<ReconFlag, FlagStyle> = {
    flag: { label: 'Side-marketing risk', color: '#c44' },
    watch: { label: 'Watch', color: '#b8860b' },
    none: { label: 'On track', color: 'var(--ee-primary)' },
}

export function flagStyle(flag: string): FlagStyle {
    return FLAG_STYLE[(flag as ReconFlag)] ?? FLAG_STYLE.none
}

export interface PartitionedReconciliation {
    flagged: GrowerReconciliation[]
    watch: GrowerReconciliation[]
    ok: GrowerReconciliation[]
}

/** Split growers by flag (backend already sorts most-concerning first). */
export function partitionByFlag(growers: GrowerReconciliation[]): PartitionedReconciliation {
    return {
        flagged: growers.filter((g) => g.flag === 'flag'),
        watch: growers.filter((g) => g.flag === 'watch'),
        ok: growers.filter((g) => g.flag === 'none'),
    }
}

export function formatTonnes(t: number | null | undefined): string {
    if (t == null) return '—'
    return `${Math.round(t * 10) / 10} t`
}

export async function fetchReconciliation(
    url: string,
    getHeaders: () => Promise<HeadersInit>,
    fetchImpl: typeof fetch = resilientFetch,
): Promise<ReconciliationResponse> {
    const headers = await getHeaders()
    const res = await fetchImpl(url, { headers })
    if (!res.ok) throw new Error(`Failed to load reconciliation (${res.status})`)
    return (await res.json()) as ReconciliationResponse
}
