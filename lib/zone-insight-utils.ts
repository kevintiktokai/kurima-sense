// Presentation helpers for zone diagnosis and zone history. Pure — unit-tested
// in tests/zone-insight.test.ts.
//
// The distinction these encode is the one the whole feature exists for: a zone
// that is weak *this season* is a place to walk, and a zone that has been weak
// *every season* is ground worth spending money on. Rendering them the same
// way would collapse that difference back into a colour.

import type {
    ZoneDiagnosis,
    ZoneSeverity,
    ZoneTrack,
    ZoneVerdict,
} from './planning-types'

export interface SeverityStyle {
    label: string
    color: string
    /** Worth showing without the farmer expanding anything. */
    surfaced: boolean
}

const SEVERITY_STYLES: Record<ZoneSeverity, SeverityStyle> = {
    problem: { label: 'Well behind', color: '#dc2626', surfaced: true },
    watch: { label: 'Behind', color: '#ea580c', surfaced: true },
    ok: { label: 'In line', color: '#6DBE45', surfaced: false },
    unknown: { label: 'Not analysed', color: '#9ca3af', surfaced: false },
}

export function zoneSeverityStyle(severity: ZoneSeverity | null | undefined): SeverityStyle {
    if (!severity || !(severity in SEVERITY_STYLES)) return SEVERITY_STYLES.unknown
    return SEVERITY_STYLES[severity]
}

export interface VerdictStyle {
    label: string
    color: string
    /** True when this is about the ground rather than the year. */
    structural: boolean
}

const VERDICT_STYLES: Record<ZoneVerdict, VerdictStyle> = {
    persistent: { label: 'Every season', color: '#dc2626', structural: true },
    occasional: { label: 'Some seasons', color: '#eab308', structural: false },
    consistent: { label: 'Keeps up', color: '#6DBE45', structural: false },
    insufficient: { label: 'Too little history', color: '#9ca3af', structural: false },
}

export function zoneVerdictStyle(verdict: ZoneVerdict | null | undefined): VerdictStyle {
    if (!verdict || !(verdict in VERDICT_STYLES)) return VERDICT_STYLES.insufficient
    return VERDICT_STYLES[verdict]
}

/**
 * The zones worth putting in front of a farmer without them asking.
 *
 * Capped, and only the ones actually behind. Listing every zone would recreate
 * the flat list the zone view exists to replace — the point is where to go, not
 * a tour of the field.
 */
export function zonesNeedingAttention(
    zones: ZoneDiagnosis[] | undefined,
    limit = 3
): ZoneDiagnosis[] {
    if (!zones?.length) return []
    return zones.filter((z) => zoneSeverityStyle(z.severity).surfaced).slice(0, limit)
}

/** Zones that are weak across seasons — the ones where fixing the ground pays back. */
export function structuralZones(tracks: ZoneTrack[] | undefined): ZoneTrack[] {
    if (!tracks?.length) return []
    return tracks.filter((t) => zoneVerdictStyle(t.verdict).structural)
}

/**
 * A compact season-by-season record for a zone: one mark per season, oldest
 * first. Reads at a glance in a way a sparkline of four points does not.
 */
export function seasonMarks(track: ZoneTrack | undefined): {
    label: string
    behind: boolean
}[] {
    if (!track?.points?.length) return []
    return track.points.map((p) => ({
        label: p.season_label ?? '—',
        behind: p.behind,
    }))
}

/** `0.42` → `"0.42"`, missing → `"—"`. Never renders a bare 0 for absent data. */
export function formatNdvi(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    return value.toFixed(2)
}

/**
 * How far behind the field, in plain words. The raw NDVI gap means nothing to
 * a farmer; "well behind the rest of the field" does.
 */
export function gapLabel(gap: number | null | undefined): string {
    if (gap === null || gap === undefined || Number.isNaN(gap)) return ''
    if (gap < 0.08) return 'in line with the field'
    if (gap < 0.18) return 'behind the rest of the field'
    return 'well behind the rest of the field'
}
