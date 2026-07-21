// Zone NDVI → colour, shared by the map overlay and the zone legend/list so
// the fill on the map matches the label in the panel. Pure + unit-tested.

export type ZoneBand = 'excellent' | 'good' | 'moderate' | 'stressed' | 'critical' | 'unknown'

export interface ZoneStyle {
    band: ZoneBand
    label: string
    color: string
}

// Crop-agnostic NDVI bands (the backend already tunes per-crop thresholds for
// the headline insight; the zone overlay is a relative visual, so a single
// scale keeps the map legend simple and consistent across crops).
const BANDS: { min: number; band: ZoneBand; label: string; color: string }[] = [
    { min: 0.66, band: 'excellent', label: 'Excellent', color: '#15803d' },
    { min: 0.5, band: 'good', label: 'Good', color: '#65a30d' },
    { min: 0.35, band: 'moderate', label: 'Moderate', color: '#eab308' },
    { min: 0.2, band: 'stressed', label: 'Stressed', color: '#ea580c' },
    { min: -1, band: 'critical', label: 'Critical', color: '#dc2626' },
]

const UNKNOWN: ZoneStyle = { band: 'unknown', label: 'Not analyzed', color: '#9ca3af' }

export function zoneStyle(ndvi: number | null | undefined): ZoneStyle {
    if (ndvi === null || ndvi === undefined || Number.isNaN(ndvi)) return UNKNOWN
    for (const b of BANDS) {
        if (ndvi >= b.min) return { band: b.band, label: b.label, color: b.color }
    }
    return UNKNOWN
}

/** The worst (lowest-NDVI) analyzed zone — the one to send the farmer to. */
export function worstZone<T extends { ndvi: number | null; label: string }>(
    sections: T[],
): T | null {
    const analyzed = sections.filter((s) => s.ndvi !== null && s.ndvi !== undefined)
    if (analyzed.length === 0) return null
    return analyzed.reduce((worst, s) => (s.ndvi! < worst.ndvi! ? s : worst))
}
