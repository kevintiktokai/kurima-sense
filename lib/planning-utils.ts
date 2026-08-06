// Pure presentation helpers for the season-planning surfaces. Shared by the
// pre-plant stepper, the season list and the Stand Check, so the colour on one
// screen always matches the label on another. Unit-tested in
// tests/season-planning.test.ts.

import type {
    FertiliserStep,
    RotationRisk,
    Season,
    SeasonStatus,
    StandVerdict,
} from './planning-types'

// --- Season status ----------------------------------------------------------

export interface StatusStyle {
    label: string
    color: string
    /** What the farmer can do next, in their words — drives the CTA. */
    nextAction: string | null
}

const STATUS_STYLES: Record<SeasonStatus, StatusStyle> = {
    planned: { label: 'Planned', color: '#6366f1', nextAction: 'Confirm planting' },
    active: { label: 'Growing', color: '#6DBE45', nextAction: 'Record harvest' },
    harvested: { label: 'Harvested', color: '#eab308', nextAction: 'Close season' },
    closed: { label: 'Closed', color: '#64748b', nextAction: null },
    abandoned: { label: 'Abandoned', color: '#94a3b8', nextAction: null },
}

export function seasonStatusStyle(status: SeasonStatus | null | undefined): StatusStyle {
    if (!status || !(status in STATUS_STYLES)) {
        return { label: 'Unknown', color: '#9ca3af', nextAction: null }
    }
    return STATUS_STYLES[status]
}

/** Seasons a farmer can still act on, newest first. */
export function liveSeasons(seasons: Season[]): Season[] {
    return seasons.filter((s) => s.status === 'planned' || s.status === 'active')
}

export function activeSeason(seasons: Season[]): Season | null {
    return seasons.find((s) => s.status === 'active') ?? null
}

/** Closed history, most recent first — the multi-season comparison spine. */
export function closedSeasons(seasons: Season[]): Season[] {
    return seasons.filter((s) => s.status === 'closed' || s.status === 'harvested')
}

// --- Rotation ---------------------------------------------------------------

export interface RiskStyle {
    label: string
    color: string
    /** Whether this warrants interrupting the farmer. */
    prominent: boolean
}

const RISK_STYLES: Record<RotationRisk, RiskStyle> = {
    high: { label: 'High disease carry-over risk', color: '#dc2626', prominent: true },
    moderate: { label: 'Moderate carry-over risk', color: '#eab308', prominent: true },
    low: { label: 'Good rotation', color: '#6DBE45', prominent: false },
    unknown: { label: 'No history yet', color: '#9ca3af', prominent: false },
}

export function rotationRiskStyle(risk: RotationRisk | null | undefined): RiskStyle {
    if (!risk || !(risk in RISK_STYLES)) return RISK_STYLES.unknown
    return RISK_STYLES[risk]
}

// --- Stand check ------------------------------------------------------------

export interface VerdictStyle {
    label: string
    color: string
    /** True when the farmer should act now rather than just note it. */
    actionable: boolean
}

const VERDICT_STYLES: Record<StandVerdict, VerdictStyle> = {
    good: { label: 'On target', color: '#6DBE45', actionable: false },
    acceptable: { label: 'Slightly below target', color: '#65a30d', actionable: false },
    thin: { label: 'Thin stand', color: '#ea580c', actionable: true },
    severely_thin: { label: 'Severely thin', color: '#dc2626', actionable: true },
}

export function standVerdictStyle(verdict: StandVerdict | null | undefined): VerdictStyle {
    if (!verdict || !(verdict in VERDICT_STYLES)) {
        return { label: 'Not assessed', color: '#9ca3af', actionable: false }
    }
    return VERDICT_STYLES[verdict]
}

// --- Formatting -------------------------------------------------------------

/** `44000` → `"44,000"`. Population reads as a quantity, not an id. */
export function formatPopulation(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    return Math.round(value).toLocaleString('en-US')
}

/**
 * Spacing in the form a farmer can execute: `"90 cm rows × 25 cm apart"`.
 * The plants/ha figure is the agronomy; this is the instruction.
 */
export function formatSpacing(
    rowCm: number | null | undefined,
    inRowCm: number | null | undefined
): string {
    if (!rowCm || !inRowCm) return '—'
    return `${Math.round(rowCm)} cm rows × ${Math.round(inRowCm)} cm apart`
}

/** `"1 Dec"` / `"1 Dec 2027"` when the year differs from the reference. */
export function formatShortDate(
    iso: string | null | undefined,
    reference?: Date
): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    const ref = reference ?? new Date()
    const sameYear = d.getUTCFullYear() === ref.getUTCFullYear()
    return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        ...(sameYear ? {} : { year: 'numeric' }),
        timeZone: 'UTC',
    })
}

/**
 * Days from today until an ISO date. Negative = past.
 * `null` when there is no date to count to.
 */
export function daysUntil(iso: string | null | undefined, today?: Date): number | null {
    if (!iso) return null
    const target = new Date(iso)
    if (Number.isNaN(target.getTime())) return null
    const now = today ?? new Date()
    const a = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate())
    const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    return Math.round((a - b) / 86_400_000)
}

/** "in 12 days" / "today" / "9 days ago" — countdown language, not a raw date. */
export function relativeDayLabel(iso: string | null | undefined, today?: Date): string {
    const d = daysUntil(iso, today)
    if (d === null) return '—'
    if (d === 0) return 'today'
    if (d === 1) return 'tomorrow'
    if (d === -1) return 'yesterday'
    return d > 0 ? `in ${d} days` : `${Math.abs(d)} days ago`
}

/**
 * A fertiliser step's amount for the whole field, as a range when the profile
 * gives one: `"480–720 kg"`. Falls back to the per-hectare rate text when the
 * field area is unknown, so the step is never blank.
 */
export function formatStepAmount(step: FertiliserStep): string {
    const { amount_low: low, amount_high: high, rate_unit: unit } = step
    if (low === null || low === undefined) return step.rate_text || '—'
    const u = unit ?? ''
    if (high !== null && high !== undefined && high !== low) {
        return `${trimNumber(low)}–${trimNumber(high)} ${u}`.trim()
    }
    return `${trimNumber(low)} ${u}`.trim()
}

function trimNumber(n: number): string {
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}

/**
 * Split a programme into the steps that are scheduled work and the ones that
 * only happen if a condition appears. Mixing them makes a plan look heavier
 * than it is, which is the documented path to abandonment.
 */
export function splitProgramme(steps: FertiliserStep[]): {
    scheduled: FertiliserStep[]
    conditional: FertiliserStep[]
} {
    return {
        scheduled: steps.filter((s) => !s.optional),
        conditional: steps.filter((s) => s.optional),
    }
}

/**
 * The next step due relative to today — what the farmer needs to see first.
 * Ignores conditional steps and anything already past.
 */
export function nextDueStep(
    steps: FertiliserStep[],
    today?: Date
): FertiliserStep | null {
    const upcoming = steps
        .filter((s) => !s.optional && s.scheduled_date)
        .map((s) => ({ step: s, days: daysUntil(s.scheduled_date, today) }))
        .filter((x) => x.days !== null && (x.days as number) >= 0)
        .sort((a, b) => (a.days as number) - (b.days as number))
    return upcoming.length ? upcoming[0].step : null
}
