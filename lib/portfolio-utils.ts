// Portfolio Today — pure types + helpers (MVP PR 3).
//
// Everything here is renderless and side-effect free so it can be unit-tested
// with node:test (no DOM, no React). The SWR hook (`hooks/usePortfolioAggregate`)
// is a thin wrapper over `fetchPortfolioAggregate` and re-exports these types.
//
// IMPORTANT: this module must not import `lib/api-cache` / `lib/supabase`
// (auth is injected into `fetchPortfolioAggregate` by the hook) so tests can
// import it without a browser or Supabase env.

import { scoreToLabel } from '@/lib/field-state-types'

// ---------------------------------------------------------------------------
// Types — mirror kurimasense-backend GET /portfolio/aggregate exactly
// ---------------------------------------------------------------------------

export type Urgency = 'critical' | 'high' | 'medium' | 'low' | 'awaiting_data'

export interface ScoreDistribution {
    thriving: number
    strong: number
    adequate: number
    stressed: number
    distressed: number
    critical: number
    awaiting_data: number
}

export interface PortfolioTenant {
    id: string
    name: string
    institutional_type: string | null
}

export interface PortfolioSummary {
    total_fields: number
    total_growers: number
    total_hectares: number
    score_distribution: ScoreDistribution
    alerts_critical: number
    alerts_high: number
    average_kurima_score: number | null
    fields_with_data: number
    fields_awaiting_data: number
}

export interface PortfolioPriority {
    field_id: string
    field_name: string
    grower_id: string | null
    grower_name: string | null
    district: string | null
    natural_region: string | null
    crop_type: string
    variety: string | null
    size_hectares: number
    kurima_score: number | null
    kurima_label: string | null
    kurima_color: string | null
    primary_concern: string
    recommended_action: string
    urgency: Urgency
    days_since_observation: number | null
    planting_date: string | null
    days_since_planting: number | null
}

export interface PortfolioAggregate {
    tenant: PortfolioTenant
    summary: PortfolioSummary
    priorities: PortfolioPriority[]
    generated_at: string
}

// ---------------------------------------------------------------------------
// Field-name / crop presentation
// ---------------------------------------------------------------------------

const DEMO_PREFIX = /^DEMO_SEED:\s*/

/** Remove the demo-seed marker from a field name; non-prefixed names pass through. */
export function stripDemoPrefix(name: string): string {
    return name.replace(DEMO_PREFIX, '')
}

const CROP_NAMES: Record<string, string> = {
    tobacco_flue_cured: 'Flue-Cured Tobacco',
    tobacco_burley: 'Burley Tobacco',
    maize: 'Maize',
    cotton: 'Cotton',
    soybean: 'Soybean',
    soybeans: 'Soybean',
    groundnut: 'Groundnut',
    groundnuts: 'Groundnut',
    wheat: 'Wheat',
}

/**
 * Human label for a backend crop_type key, e.g. "tobacco_flue_cured" →
 * "Flue-Cured Tobacco". Unknown values pass through unchanged (never invent).
 */
export function humanizeCrop(cropType: string): string {
    return CROP_NAMES[cropType] ?? cropType
}

// ---------------------------------------------------------------------------
// Urgency groups
// ---------------------------------------------------------------------------

/** Display order of the urgency groups — backend priorities arrive in this order. */
export const URGENCY_ORDER: Urgency[] = ['critical', 'high', 'medium', 'low', 'awaiting_data']

const URGENCY_LABELS: Record<Urgency, string> = {
    critical: 'Urgent',
    high: 'High priority',
    medium: 'Monitor',
    low: 'Stable',
    awaiting_data: 'Awaiting first observations',
}

/** Section divider label for an urgency band. */
export function urgencyGroupLabel(urgency: Urgency): string {
    return URGENCY_LABELS[urgency]
}

export interface PriorityGroup {
    urgency: Urgency
    label: string
    items: PortfolioPriority[]
    /** Stable + awaiting groups start collapsed to keep attention on actionable rows. */
    collapsedByDefault: boolean
}

/**
 * Split the backend-ordered priority list into non-empty urgency groups, in
 * urgency order, preserving the backend's order within each group (the client
 * never re-sorts — the backend list is already worst-first).
 */
export function groupPriorities(priorities: PortfolioPriority[]): PriorityGroup[] {
    return URGENCY_ORDER.map((urgency) => ({
        urgency,
        label: urgencyGroupLabel(urgency),
        items: priorities.filter((p) => p.urgency === urgency),
        collapsedByDefault: urgency === 'low' || urgency === 'awaiting_data',
    })).filter((g) => g.items.length > 0)
}

// ---------------------------------------------------------------------------
// Screen state selection
// ---------------------------------------------------------------------------

export type ScreenState = 'empty' | 'awaiting' | 'active'

/**
 * Which of the three data states the screen is in:
 *  - 'empty'    — tenant has no fields at all;
 *  - 'awaiting' — fields exist but none has a satellite observation yet
 *                 (the demo tenant's state until backfill lands);
 *  - 'active'   — at least one field has data (mixed or fully populated).
 */
export function selectScreenState(summary: PortfolioSummary): ScreenState {
    if (summary.total_fields === 0) return 'empty'
    if (summary.fields_with_data === 0) return 'awaiting'
    return 'active'
}

/** Number of fields in the critical urgency band (drives the attention banner). */
export function criticalFieldCount(priorities: PortfolioPriority[]): number {
    return priorities.filter((p) => p.urgency === 'critical').length
}

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------

/**
 * Compact relative time for the "Updated …" caption, e.g. "just now",
 * "4m ago", "2h ago", "yesterday", "5d ago". Falls back to a short date for
 * anything older than a week, and "—" for unparseable input.
 */
export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
    const t = Date.parse(iso)
    if (Number.isNaN(t)) return '—'
    const diffSec = Math.max(0, Math.floor((nowMs - t) / 1000))
    if (diffSec < 60) return 'just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h ago`
    const diffD = Math.floor(diffH / 24)
    if (diffD === 1) return 'yesterday'
    if (diffD < 7) return `${diffD}d ago`
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ---------------------------------------------------------------------------
// Distribution bar
// ---------------------------------------------------------------------------

/** Neutral (non-band) colour for the awaiting-data segment — an existing token. */
export const AWAITING_SEGMENT_COLOR = 'var(--ee-bg-pressed)'

// Band colours reuse the client's existing band mirror (scoreToLabel in
// field-state-types — the same vocabulary as the backend classifiers), so the
// bar can never disagree with a field's own chip.
const BAND_META: Array<{ key: keyof ScoreDistribution; label: string; color: string }> = [
    { key: 'thriving', label: 'Thriving', color: scoreToLabel(90).color },
    { key: 'strong', label: 'Strong', color: scoreToLabel(75).color },
    { key: 'adequate', label: 'Adequate', color: scoreToLabel(60).color },
    { key: 'stressed', label: 'Stressed', color: scoreToLabel(45).color },
    { key: 'distressed', label: 'Distressed', color: scoreToLabel(30).color },
    { key: 'critical', label: 'Critical', color: scoreToLabel(10).color },
    { key: 'awaiting_data', label: 'Awaiting data', color: AWAITING_SEGMENT_COLOR },
]

export interface DistributionSegment {
    key: keyof ScoreDistribution
    label: string
    color: string
    /** Integer percentage width; all segments sum to exactly 100. */
    pct: number
}

/**
 * Proportional segments for the stacked distribution bar. Zero bands are
 * omitted; integer percentages are normalized so they always sum to exactly
 * 100 (rounding drift is absorbed by the largest segment). Empty distribution
 * → empty array.
 */
export function distributionToSegments(dist: ScoreDistribution): DistributionSegment[] {
    const present = BAND_META
        .map((b) => ({ ...b, count: dist[b.key] || 0 }))
        .filter((b) => b.count > 0)
    const total = present.reduce((s, b) => s + b.count, 0)
    if (total === 0) return []

    const segments = present.map((b) => ({
        key: b.key, label: b.label, color: b.color,
        pct: Math.max(1, Math.round((b.count / total) * 100)),
    }))
    // Absorb rounding drift into the largest segment so widths sum to 100.
    const drift = segments.reduce((s, b) => s + b.pct, 0) - 100
    if (drift !== 0) {
        const largest = segments.reduce((a, b) => (b.pct > a.pct ? b : a))
        largest.pct -= drift
    }
    return segments
}

// ---------------------------------------------------------------------------
// Data fetch (auth + fetch injected so this stays testable)
// ---------------------------------------------------------------------------

/**
 * Fetch and normalize the portfolio aggregate. The hook injects
 * `getAuthHeaders` (Supabase) and the browser `fetch`; tests inject mocks.
 * Demo-seed prefixes are stripped here so the UI never sees them.
 */
export async function fetchPortfolioAggregate(
    url: string,
    getHeaders: () => Promise<HeadersInit>,
    fetchImpl: typeof fetch = fetch,
): Promise<PortfolioAggregate> {
    const headers = await getHeaders()
    const res = await fetchImpl(url, { headers })
    if (!res.ok) throw new Error(`Failed to load portfolio (${res.status})`)
    const data = (await res.json()) as PortfolioAggregate
    return {
        ...data,
        priorities: (data.priorities || []).map((p) => ({
            ...p,
            field_name: stripDemoPrefix(p.field_name || ''),
        })),
    }
}
