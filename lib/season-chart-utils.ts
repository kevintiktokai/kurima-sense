// Season accumulation charts — pure helpers (Depth Sprint PR D frontend).
// No React/recharts import: tick selection + value formatting, unit-testable.

export interface SeasonAccumulationDay {
    date: string
    gdd: number
    gdd_cumulative: number
    precip_mm: number
    precip_cumulative: number
}

export interface SeasonAccumulations {
    field_id: string
    crop_type: string
    planting_date: string
    days_elapsed: number
    gdd_base_c: number
    gdd_cap_c: number
    total_gdd: number
    total_precip_mm: number
    series: SeasonAccumulationDay[]
}

/**
 * Sparse month ticks for the x-axis: the first series date in each calendar
 * month (so a ~150-day window shows ~5 labels, not 150). Returns the date
 * strings to pass as explicit XAxis ticks.
 */
export function monthTicks(series: Array<{ date: string }>): string[] {
    const ticks: string[] = []
    let lastKey = ''
    for (const d of series) {
        const key = (d.date || '').slice(0, 7) // YYYY-MM
        if (key && key !== lastKey) {
            ticks.push(d.date)
            lastKey = key
        }
    }
    return ticks
}

/** Short month-day label for a tick / tooltip, e.g. "4 Feb". "—" if unparseable. */
export function formatTickDate(iso: string): string {
    const t = Date.parse(iso)
    if (Number.isNaN(t)) return '—'
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Full date for tooltips, e.g. "4 February 2026". */
export function formatFullDate(iso: string): string {
    const t = Date.parse(iso)
    if (Number.isNaN(t)) return '—'
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Millimetres, no decimals for whole numbers, one otherwise. */
export function formatMm(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return '—'
    const rounded = Math.round(value * 10) / 10
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} mm`
}

/** GDD value as a rounded integer with a leading "+", e.g. "+1240 GDD". */
export function formatGdd(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return '—'
    return `+${Math.round(value)} GDD`
}

/** Caption noting the GDD base/cap used, e.g. "Base 10°C, cap 30°C since planting". */
export function gddCaption(base: number, cap: number): string {
    const n = (v: number) => (Number.isInteger(v) ? String(v) : String(v))
    return `Base ${n(base)}°C, cap ${n(cap)}°C since planting`
}

export type SeasonChartState = 'loading' | 'data' | 'missing-planting' | 'error'

/**
 * Pure state selection for the charts. `errorStatus` is the HTTP status when the
 * request failed (422 → missing planting date). `hasSeries` is whether the
 * payload has at least one day.
 */
export function selectChartState(opts: {
    isLoading: boolean
    hasData: boolean
    hasSeries: boolean
    errorStatus: number | null
}): SeasonChartState {
    if (opts.errorStatus === 422) return 'missing-planting'
    if (opts.isLoading && !opts.hasData) return 'loading'
    if (opts.errorStatus != null) return 'error'
    if (opts.hasData && opts.hasSeries) return 'data'
    if (opts.hasData && !opts.hasSeries) return 'missing-planting' // planted today / no days yet
    return 'error'
}
