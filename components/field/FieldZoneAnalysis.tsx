'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { useFieldSections } from '@/hooks/useFieldSections'
import { zoneStyle, worstZone } from '@/lib/section-colors'

// Mapbox needs the DOM; the token gate lives in the component. Falls back to
// the existing Leaflet map when NEXT_PUBLIC_MAPBOX_TOKEN is absent so the
// feature degrades gracefully instead of breaking the page.
const hasMapboxToken = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const FieldMapbox = dynamic(() => import('@/components/field/FieldMapbox'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 24 }}>
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--ee-muted)' }} />
        </div>
    ),
})

const LeafletFieldMap = dynamic(() => import('@/components/field-map'), { ssr: false })

interface Props {
    fieldId: string
    polygon: { lat: number; lon: number }[]
    center?: [number, number]
    fieldName?: string
}

export function FieldZoneAnalysis({ fieldId, polygon, center, fieldName }: Props) {
    const { data, loading, error, analyzing, analyze } = useFieldSections(fieldId, 2)
    const sections = data?.sections ?? []
    const worst = worstZone(sections)
    const anyAnalyzed = sections.some((s) => s.ndvi !== null)

    return (
        <div className="neu-surface p-6 lg:p-8" style={{ background: 'var(--ee-surface)', borderRadius: 24 }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        Field Map & Zones
                    </h2>
                    <p className="text-sm font-semibold mt-1" style={{ color: 'var(--ee-muted)' }}>
                        {anyAnalyzed
                            ? 'Tap a zone on the map to see where to focus.'
                            : 'Analyze zones to see which part of the field needs attention.'}
                    </p>
                </div>
                <button
                    onClick={() => analyze()}
                    disabled={analyzing}
                    className="px-5 py-3 rounded-[16px] font-bold text-sm uppercase tracking-wider hover:scale-105 transition-transform disabled:opacity-50"
                    style={{ background: 'var(--ee-primary)', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                >
                    <span className="material-symbols-outlined text-sm mr-1 align-middle">
                        {analyzing ? 'progress_activity' : 'grid_view'}
                    </span>
                    {analyzing ? 'Scanning zones…' : anyAnalyzed ? 'Re-scan zones' : 'Analyze zones'}
                </button>
            </div>

            {/* Map */}
            <div style={{ height: 380, width: '100%' }}>
                {hasMapboxToken ? (
                    <FieldMapbox polygon={polygon} sections={sections} showSections={anyAnalyzed} />
                ) : (
                    <LeafletFieldMap
                        center={center}
                        polygon={polygon.map((p) => [p.lat, p.lon]) as [number, number][]}
                        fieldName={fieldName}
                    />
                )}
            </div>

            {/* Worst-zone callout — the actionable payoff of sectioning. */}
            {worst && (
                <div className="mt-5 p-4 rounded-[16px] flex items-center gap-3"
                    style={{ background: `${zoneStyle(worst.ndvi).color}14`, border: `1px solid ${zoneStyle(worst.ndvi).color}55` }}>
                    <span className="material-symbols-outlined" style={{ color: zoneStyle(worst.ndvi).color }}>my_location</span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ee-text)' }}>
                        Lowest vigour in the <strong>{worst.label}</strong> zone
                        {worst.ndvi !== null && <> (NDVI {worst.ndvi.toFixed(2)})</>} — start scouting there.
                    </p>
                </div>
            )}

            {/* Zone legend / list — works even without the fancy map. */}
            {sections.length > 0 && (
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {sections.map((s) => {
                        const z = zoneStyle(s.ndvi)
                        return (
                            <div key={s.index} className="p-3 rounded-[14px]" style={{ background: 'rgba(0,0,0,0.03)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span style={{ width: 10, height: 10, borderRadius: 3, background: z.color, display: 'inline-block' }} />
                                    <span className="text-xs font-bold" style={{ color: 'var(--ee-text)' }}>{s.label}</span>
                                </div>
                                <p className="text-xs font-semibold" style={{ color: 'var(--ee-muted)' }}>
                                    {s.ndvi !== null ? `${z.label} · NDVI ${s.ndvi.toFixed(2)}` : z.label}
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}

            {loading && !data && (
                <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--ee-muted)' }}>
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading zones…
                </div>
            )}
            {error && (
                <p className="mt-4 text-sm font-semibold" style={{ color: 'var(--ee-sun)' }}>
                    Couldn&apos;t load zone data — the field map still works above.
                </p>
            )}
        </div>
    )
}
