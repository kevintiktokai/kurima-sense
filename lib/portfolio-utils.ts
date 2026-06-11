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
    // Geometry + latest raw indices (Depth Sprint PR C backend) — for the map view.
    polygon_coordinates?: Array<{ lat: number; lon: number }> | null
    centroid?: { lat: number; lon: number } | null
    latest_ndvi?: number | null
    latest_soil_moisture?: number | null
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

// ---------------------------------------------------------------------------
// Fields roster — filter / sort / search (pure, for /portfolio/fields)
// ---------------------------------------------------------------------------

/** Pseudo-band used by the Health filter for null-score (awaiting) rows. */
export const AWAITING_BAND = 'awaiting'

export interface FieldsFilter {
    /** Matches grower_name OR field_name, case-insensitive, trimmed. */
    search: string
    /** Selected districts; empty = all. */
    districts: string[]
    /** Selected crop_type values; empty = all. */
    crops: string[]
    /** Selected kurima_label values, plus AWAITING_BAND; empty = all. */
    bands: string[]
}

export type FieldsSort =
    | 'score_asc'   // worst first (default)
    | 'score_desc'  // best first
    | 'size_desc'   // largest first
    | 'grower_az'
    | 'district_az'

export const DEFAULT_FIELDS_FILTER: FieldsFilter = { search: '', districts: [], crops: [], bands: [] }
export const DEFAULT_FIELDS_SORT: FieldsSort = 'score_asc'

/** The band key a row belongs to for the Health filter (its label, or AWAITING_BAND). */
function bandOf(p: PortfolioPriority): string {
    return p.kurima_score == null ? AWAITING_BAND : (p.kurima_label || AWAITING_BAND)
}

/**
 * Filter the roster. Search matches grower OR field name (case-insensitive,
 * trimmed); district/crop/band are multi-select (empty = all); all active
 * dimensions AND together.
 */
export function filterFields(priorities: PortfolioPriority[], filter: FieldsFilter): PortfolioPriority[] {
    const q = filter.search.trim().toLowerCase()
    return priorities.filter((p) => {
        if (q) {
            const hay = `${p.grower_name || ''} ${p.field_name || ''}`.toLowerCase()
            if (!hay.includes(q)) return false
        }
        if (filter.districts.length && !filter.districts.includes(p.district || '')) return false
        if (filter.crops.length && !filter.crops.includes(p.crop_type)) return false
        if (filter.bands.length && !filter.bands.includes(bandOf(p))) return false
        return true
    })
}

// Score comparators put awaiting (null) rows LAST in BOTH directions; ties break
// by size desc then field_id, so the order is always deterministic.
function compareKnownScore(a: PortfolioPriority, b: PortfolioPriority, dir: 'asc' | 'desc'): number {
    const sa = a.kurima_score as number
    const sb = b.kurima_score as number
    if (sa !== sb) return dir === 'asc' ? sa - sb : sb - sa
    if (a.size_hectares !== b.size_hectares) return b.size_hectares - a.size_hectares
    return a.field_id.localeCompare(b.field_id)
}

function awaitingLast(a: PortfolioPriority, b: PortfolioPriority, both: () => number): number {
    const aw = a.kurima_score == null
    const bw = b.kurima_score == null
    if (aw && bw) {
        if (a.size_hectares !== b.size_hectares) return b.size_hectares - a.size_hectares
        return a.field_id.localeCompare(b.field_id)
    }
    if (aw) return 1
    if (bw) return -1
    return both()
}

/**
 * Sort a (already filtered) roster. Returns a new array; never mutates input.
 * Null scores always sort last for both score directions.
 */
export function sortFields(priorities: PortfolioPriority[], sort: FieldsSort): PortfolioPriority[] {
    const rows = [...priorities]
    switch (sort) {
        case 'score_asc':
            return rows.sort((a, b) => awaitingLast(a, b, () => compareKnownScore(a, b, 'asc')))
        case 'score_desc':
            return rows.sort((a, b) => awaitingLast(a, b, () => compareKnownScore(a, b, 'desc')))
        case 'size_desc':
            return rows.sort((a, b) =>
                b.size_hectares - a.size_hectares || a.field_id.localeCompare(b.field_id))
        case 'grower_az':
            return rows.sort((a, b) => {
                const ga = a.grower_name, gb = b.grower_name
                if (ga && gb && ga !== gb) return ga.localeCompare(gb)
                if (ga && !gb) return -1          // null grower names last
                if (!ga && gb) return 1
                return (a.field_name || '').localeCompare(b.field_name || '')
            })
        case 'district_az':
            return rows.sort((a, b) => {
                const da = a.district, db = b.district
                if (da && db && da !== db) return da.localeCompare(db)
                if (da && !db) return -1          // null districts last
                if (!da && db) return 1
                return (a.field_name || '').localeCompare(b.field_name || '')
            })
        default:
            return rows
    }
}

export interface FieldsFilterOptions {
    districts: string[]
    crops: string[]
    bands: string[]
}

/**
 * Distinct, sorted filter values actually present in the payload, so a chip is
 * never offered for a dimension with no matching fields. Bands list real
 * kurima_labels first (worst→best by score) and appends AWAITING_BAND if any
 * row is awaiting.
 */
export function deriveFilterOptions(priorities: PortfolioPriority[]): FieldsFilterOptions {
    const districts = new Set<string>()
    const crops = new Set<string>()
    // label → representative score, so bands sort by severity not alphabetically
    const bandScore = new Map<string, number>()
    let hasAwaiting = false

    for (const p of priorities) {
        if (p.district) districts.add(p.district)
        if (p.crop_type) crops.add(p.crop_type)
        if (p.kurima_score == null) hasAwaiting = true
        else if (p.kurima_label) bandScore.set(p.kurima_label, p.kurima_score)
    }

    const bands = [...bandScore.entries()].sort((a, b) => a[1] - b[1]).map(([label]) => label)
    if (hasAwaiting) bands.push(AWAITING_BAND)

    return {
        districts: [...districts].sort((a, b) => a.localeCompare(b)),
        crops: [...crops].sort((a, b) => a.localeCompare(b)),
        bands,
    }
}

/** True when any filter dimension is active (drives the "Clear all" affordance). */
export function isFilterActive(filter: FieldsFilter): boolean {
    return filter.search.trim() !== '' ||
        filter.districts.length > 0 || filter.crops.length > 0 || filter.bands.length > 0
}

// ---------------------------------------------------------------------------
// Debounce (used for the search input)
// ---------------------------------------------------------------------------

/**
 * Trailing-edge debounce. Returns a wrapped function that delays calling `fn`
 * until `wait` ms after the last invocation, plus a `cancel()` to drop a
 * pending call (e.g. on unmount).
 */
export function debounce<A extends unknown[]>(
    fn: (...args: A) => void,
    wait: number,
): ((...args: A) => void) & { cancel: () => void } {
    let timer: ReturnType<typeof setTimeout> | null = null
    const wrapped = (...args: A) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => { timer = null; fn(...args) }, wait)
    }
    wrapped.cancel = () => { if (timer) { clearTimeout(timer); timer = null } }
    return wrapped
}

// ---------------------------------------------------------------------------
// Growers — type, stats merge, search, sort (pure, for /portfolio/growers)
// ---------------------------------------------------------------------------

/** Mirrors the backend Grower schema (`kurimasense-backend/schemas.py`). */
export interface Grower {
    id: string
    tenant_id: string
    name: string
    phone?: string | null
    email?: string | null
    coordinates?: unknown
    claimed_by_user_id?: string | null
    created_by_user_id?: string | null
    notes?: string | null
    created_at: string
    updated_at: string
}

/** A grower joined with stats derived from the aggregate's priority rows. */
export interface GrowerWithStats extends Grower {
    field_count: number
    total_hectares: number
    /** Min KurimaScore across the grower's scored fields; null if none scored. */
    worst_score: number | null
    worst_label: string | null
    worst_color: string | null
    /** True when any of the grower's fields has no satellite data yet. */
    has_awaiting: boolean
}

/**
 * Join growers with the aggregate's priority rows to derive per-grower stats:
 * field_count, total_hectares, and the worst (lowest) KurimaScore across their
 * scored fields. Growers with zero fields get count 0 and null score stats.
 * Pure — never mutates its inputs.
 */
export function mergeGrowerStats(growers: Grower[], priorities: PortfolioPriority[]): GrowerWithStats[] {
    const byGrower = new Map<string, PortfolioPriority[]>()
    for (const p of priorities) {
        if (!p.grower_id) continue
        const list = byGrower.get(p.grower_id)
        if (list) list.push(p)
        else byGrower.set(p.grower_id, [p])
    }

    return growers.map((g) => {
        const fields = byGrower.get(g.id) ?? []
        const total_hectares = Math.round(fields.reduce((s, f) => s + (f.size_hectares || 0), 0) * 10) / 10
        const scored = fields.filter((f) => f.kurima_score != null).map((f) => f.kurima_score as number)
        const worst_score = scored.length ? Math.min(...scored) : null
        const band = worst_score != null ? scoreToLabel(worst_score) : null
        return {
            ...g,
            field_count: fields.length,
            total_hectares,
            worst_score,
            worst_label: band?.label ?? null,
            worst_color: band?.color ?? null,
            has_awaiting: fields.some((f) => f.kurima_score == null),
        }
    })
}

/** Filter growers by name (case-insensitive, trimmed). Empty query = all. */
export function searchGrowers<T extends { name: string }>(growers: T[], query: string): T[] {
    const q = query.trim().toLowerCase()
    if (!q) return growers
    return growers.filter((g) => (g.name || '').toLowerCase().includes(q))
}

/**
 * Default roster order: most at-risk grower first (worst_score ascending),
 * growers with no scored fields last, ties broken by field_count desc then
 * name A–Z. Returns a new array; never mutates input.
 */
export function sortGrowersDefault(growers: GrowerWithStats[]): GrowerWithStats[] {
    return [...growers].sort((a, b) => {
        const aw = a.worst_score == null
        const bw = b.worst_score == null
        if (!aw && !bw && a.worst_score !== b.worst_score) {
            return (a.worst_score as number) - (b.worst_score as number)
        }
        if (aw !== bw) return aw ? 1 : -1            // null-stats growers last
        if (a.field_count !== b.field_count) return b.field_count - a.field_count
        return a.name.localeCompare(b.name)
    })
}

// ---------------------------------------------------------------------------
// Grower form — validation + payload shaping (pure)
// ---------------------------------------------------------------------------

export interface GrowerFormValues {
    name: string
    phone: string
    email: string
    notes: string
}

export interface GrowerPayload {
    name: string
    phone?: string
    email?: string
    notes?: string
}

/** Minimal email shape check — only meaningful when the user typed something. */
export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export interface GrowerFormValidation {
    valid: boolean
    errors: { name?: string; email?: string }
}

/** Name required (trimmed, non-empty); email checked only when non-empty. */
export function validateGrowerForm(values: GrowerFormValues): GrowerFormValidation {
    const errors: { name?: string; email?: string } = {}
    if (!values.name.trim()) errors.name = 'Name is required'
    if (values.email.trim() && !isValidEmail(values.email)) errors.email = 'Enter a valid email'
    return { valid: Object.keys(errors).length === 0, errors }
}

/** Trim, and drop empty optional fields so the API never stores blank strings. */
export function buildGrowerPayload(values: GrowerFormValues): GrowerPayload {
    const payload: GrowerPayload = { name: values.name.trim() }
    const phone = values.phone.trim()
    const email = values.email.trim()
    const notes = values.notes.trim()
    if (phone) payload.phone = phone
    if (email) payload.email = email
    if (notes) payload.notes = notes
    return payload
}

// ---------------------------------------------------------------------------
// Alerts — derivation (pure, for /portfolio/alerts)
// ---------------------------------------------------------------------------

/** A scored field is "stale" once its newest observation is older than this. */
export const STALE_OBSERVATION_DAYS = 7

export interface DerivedAlerts {
    /** Field-health alerts: critical then high urgency, score ascending. */
    health: PortfolioPriority[]
    /** Fields with no observation yet (null score). */
    awaiting: PortfolioPriority[]
    /** Scored fields whose newest observation is stale (or of unknown age). */
    stale: PortfolioPriority[]
}

// Order health alerts: critical (0) before high (1), then lowest score first,
// then larger fields, then field_id — fully deterministic.
const _HEALTH_URGENCY_RANK: Record<string, number> = { critical: 0, high: 1 }

function _compareHealth(a: PortfolioPriority, b: PortfolioPriority): number {
    const ra = _HEALTH_URGENCY_RANK[a.urgency] ?? 9
    const rb = _HEALTH_URGENCY_RANK[b.urgency] ?? 9
    if (ra !== rb) return ra - rb
    const sa = a.kurima_score ?? Number.POSITIVE_INFINITY
    const sb = b.kurima_score ?? Number.POSITIVE_INFINITY
    if (sa !== sb) return sa - sb
    if (a.size_hectares !== b.size_hectares) return b.size_hectares - a.size_hectares
    return a.field_id.localeCompare(b.field_id)
}

// Deterministic order for the data lists: larger fields first, then field_id.
function _compareData(a: PortfolioPriority, b: PortfolioPriority): number {
    if (a.size_hectares !== b.size_hectares) return b.size_hectares - a.size_hectares
    return a.field_id.localeCompare(b.field_id)
}

/** True when a *scored* field's newest observation is stale (or of unknown age). */
export function isStale(p: PortfolioPriority): boolean {
    if (p.kurima_score == null) return false // null score → awaiting, not stale
    return p.days_since_observation == null || p.days_since_observation > STALE_OBSERVATION_DAYS
}

/**
 * Partition the portfolio into alert buckets. Each field lands in **at most
 * one** list; health takes precedence over stale (a critical field with old
 * data is a health alert — its staleness is shown in the row meta, not
 * duplicated into Data). `awaiting` (null score) and `stale` (scored but old)
 * are mutually exclusive by definition. Pure — never mutates its input.
 */
export function deriveAlerts(priorities: PortfolioPriority[]): DerivedAlerts {
    const health: PortfolioPriority[] = []
    const awaiting: PortfolioPriority[] = []
    const stale: PortfolioPriority[] = []

    for (const p of priorities) {
        if (p.urgency === 'critical' || p.urgency === 'high') {
            health.push(p)            // health precedence — never also data
        } else if (p.kurima_score == null) {
            awaiting.push(p)
        } else if (isStale(p)) {
            stale.push(p)
        }
    }

    return {
        health: [...health].sort(_compareHealth),
        awaiting: [...awaiting].sort(_compareData),
        stale: [...stale].sort(_compareData),
    }
}

export interface AlertCounts {
    health: number
    data: number
    total: number
}

/** Counts for the header: health, data (awaiting + stale), and total. */
export function alertCounts(derived: DerivedAlerts): AlertCounts {
    const health = derived.health.length
    const data = derived.awaiting.length + derived.stale.length
    return { health, data, total: health + data }
}
