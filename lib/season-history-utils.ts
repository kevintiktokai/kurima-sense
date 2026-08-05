// Pure helpers for the season-comparison chart.
//
// The chart plots several seasons on one x-axis of *days after planting*, which
// is the only axis on which two seasons are comparable — calendar dates put a
// six-leaf crop and a tasselling one on the same tick and call the difference
// performance. Recharts wants one row per x-value with a column per series, so
// the main job here is pivoting per-season point lists into that shape without
// inventing data where a season has no observation.

import type { FieldHistory, FieldTrend, SeasonHistory } from './planning-types'

// Distinct, colour-blind-safe series colours. The current season always takes
// index 0, so it reads as "yours now" against the muted history behind it.
export const SERIES_COLORS = ['#0fb885', '#6366f1', '#ea580c', '#64748b', '#a855f7']

export interface SeasonSeries {
    seasonId: string
    label: string
    color: string
    /** Dimmed in the legend when its peak can't be trusted. */
    confident: boolean
}

export interface ChartRow {
    day: number
    /** `ndvi_<seasonId>` → value. Absent keys leave a gap rather than a zero. */
    [seriesKey: string]: number | null
}

export const seriesKey = (seasonId: string) => `ndvi_${seasonId}`

/** A stable display label, falling back through label → crop → date → id. */
export function seasonSeriesLabel(season: SeasonHistory): string {
    if (season.season_label) return season.season_label
    if (season.crop_type && season.planting_date) {
        return `${season.crop_type} ${season.planting_date.slice(0, 4)}`
    }
    return season.crop_type || season.planting_date || season.season_id.slice(0, 6)
}

/** Series metadata in render order (newest season first, so it takes colour 0). */
export function buildSeries(history: FieldHistory | undefined): SeasonSeries[] {
    if (!history?.seasons?.length) return []
    return history.seasons.slice(0, SERIES_COLORS.length).map((s, i) => ({
        seasonId: s.season_id,
        label: seasonSeriesLabel(s),
        color: SERIES_COLORS[i],
        confident: s.peak_is_confident,
    }))
}

/**
 * Pivot per-season points into recharts rows keyed by days after planting.
 *
 * Observations rarely land on the same crop-age day across seasons, so days are
 * bucketed. A bucket a season didn't observe is simply absent from that row —
 * recharts renders a gap, which is honest, where a zero would draw a canopy
 * collapse that never happened.
 */
export function buildChartRows(
    history: FieldHistory | undefined,
    bucketDays = 5
): ChartRow[] {
    if (!history?.seasons?.length) return []
    if (bucketDays < 1) bucketDays = 1

    const byDay = new Map<number, ChartRow>()

    for (const season of history.seasons.slice(0, SERIES_COLORS.length)) {
        const key = seriesKey(season.season_id)
        // Average within a bucket so two nearby observations don't fight.
        const buckets = new Map<number, number[]>()
        for (const p of season.points) {
            if (p.ndvi === null || p.ndvi === undefined) continue
            const day = Math.round(p.days_after_planting / bucketDays) * bucketDays
            const list = buckets.get(day)
            if (list) list.push(p.ndvi)
            else buckets.set(day, [p.ndvi])
        }
        for (const [day, values] of buckets) {
            const row = byDay.get(day) ?? ({ day } as ChartRow)
            row[key] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000
            byDay.set(day, row)
        }
    }

    return [...byDay.values()].sort((a, b) => a.day - b.day)
}

export interface TrendStyle {
    label: string
    color: string
    icon: string
}

const TREND_STYLES: Record<FieldTrend, TrendStyle> = {
    improving: { label: 'Improving', color: '#0fb885', icon: 'trending_up' },
    stable: { label: 'Holding steady', color: '#64748b', icon: 'trending_flat' },
    declining: { label: 'Declining', color: '#ea580c', icon: 'trending_down' },
    unknown: { label: 'Not enough history', color: '#9ca3af', icon: 'help' },
}

export function trendStyle(trend: FieldTrend | null | undefined): TrendStyle {
    if (!trend || !(trend in TREND_STYLES)) return TREND_STYLES.unknown
    return TREND_STYLES[trend]
}

/**
 * Whether there is enough to draw a comparison at all. One season is a chart of
 * itself, which is already covered by the in-season trend card — this component
 * only earns its place from two.
 */
export function hasComparableHistory(history: FieldHistory | undefined): boolean {
    if (!history?.seasons) return false
    return history.seasons.filter((s) => s.points.some((p) => p.ndvi !== null)).length >= 2
}

/** `t/ha` with one decimal, or a dash. Yield is the outcome farmers compare on. */
export function formatYield(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    return `${Math.round(value * 10) / 10} t/ha`
}
