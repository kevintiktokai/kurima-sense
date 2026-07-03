'use client'

/**
 * SoilProfileCard — renders a field's persistent Soil Intelligence Profile.
 *
 * The profile is built once at field creation from multiple public providers
 * (SoilGrids for soil chemistry/texture, Open-Meteo for terrain/climate) and
 * stored, so this card is cheap to load. Each attribute carries its own source
 * and confidence, which we surface honestly rather than presenting modelled
 * figures as ground truth.
 *
 * Purely additive: owns its own fetch, renders nothing on the consumer surface
 * when no profile is available yet (a freshly created field builds it in the
 * background), so mounting it never breaks the host page.
 */

import { useEffect, useState, useCallback } from 'react'
import { api, type SoilProfileResponse, type SoilAttribute } from '@/services/api'

export interface SoilProfileCardProps {
    fieldId: string
}

// Attribute groups shown in the card, in display order.
const GROUPS: Array<{ title: string; keys: Array<[string, string]> }> = [
    {
        title: 'Classification & texture',
        keys: [
            ['soil_classification', 'Soil type'],
            ['texture_class', 'Texture'],
            ['sand_pct', 'Sand'],
            ['silt_pct', 'Silt'],
            ['clay_pct', 'Clay'],
        ],
    },
    {
        title: 'Chemistry',
        keys: [
            ['ph', 'pH (H₂O)'],
            ['organic_matter', 'Organic matter'],
            ['organic_carbon', 'Organic carbon'],
            ['nitrogen', 'Total nitrogen'],
            ['cec', 'CEC'],
        ],
    },
    {
        title: 'Physical & water',
        keys: [
            ['bulk_density', 'Bulk density'],
            ['water_holding_capacity', 'Water capacity'],
            ['available_water', 'Available water'],
            ['root_depth', 'Rooting depth'],
            ['drainage', 'Drainage'],
            ['erosion_risk', 'Erosion risk'],
        ],
    },
    {
        title: 'Terrain & climate',
        keys: [
            ['elevation', 'Elevation'],
            ['slope', 'Slope'],
            ['terrain', 'Terrain'],
            ['climate_zone', 'Agro-ecological zone'],
            ['historical_rainfall', 'Mean annual rainfall'],
        ],
    },
]

function confidenceLabel(c?: number | null): { label: string; color: string } {
    if (c == null) return { label: 'unknown', color: 'var(--ee-muted)' }
    if (c >= 0.75) return { label: 'high', color: '#2E7D32' }
    if (c >= 0.5) return { label: 'moderate', color: '#F9A825' }
    if (c >= 0.25) return { label: 'low', color: '#EF6C00' }
    return { label: 'very low', color: '#C62828' }
}

function formatValue(a: SoilAttribute): string {
    if (a.value == null) return '—'
    const v = typeof a.value === 'number' ? a.value : String(a.value)
    return a.unit ? `${v} ${a.unit}` : `${v}`
}

function AttrRow({ label, attr }: { label: string; attr: SoilAttribute }) {
    const conf = confidenceLabel(attr.confidence)
    return (
        <div className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="text-sm" style={{ color: 'var(--ee-muted)' }}>{label}</span>
            <span className="flex items-baseline gap-2 text-right">
                <span className="font-bold text-sm" style={{ color: 'var(--ee-text)' }}>
                    {formatValue(attr)}
                </span>
                <span
                    className="text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: conf.color }}
                    title={`Source: ${attr.source}${attr.detail ? ` — ${attr.detail}` : ''}`}
                >
                    {conf.label}
                </span>
            </span>
        </div>
    )
}

export function SoilProfileCard({ fieldId }: SoilProfileCardProps) {
    const [profile, setProfile] = useState<SoilProfileResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        let cancelled = false
        // The async body defers the first setState past the await, so the effect
        // never calls setState synchronously (avoids cascading renders).
        void (async () => {
            const p = await api.getFieldSoil(fieldId)
            if (!cancelled) {
                setProfile(p)
                setLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [fieldId])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        const p = await api.refreshFieldSoil(fieldId)
        if (p) setProfile(p)
        setRefreshing(false)
    }, [fieldId])

    // Silent absence on the consumer surface: a just-created field builds its
    // profile in the background, so an empty state here would just be noise.
    if (loading) return null
    if (!profile || !profile.available) return null

    const attrs = profile.attributes || {}
    const sources = Object.keys(profile.provider_status || {}).join(', ')

    return (
        <div
            className="lg:col-span-12 neu-surface p-8 lg:p-10"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px' }}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--ee-primary)' }}>
                        landslide
                    </span>
                    <div>
                        <h2 className="font-black text-xl" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                            Soil Intelligence
                        </h2>
                        {sources && (
                            <p className="text-[11px]" style={{ color: 'var(--ee-muted)' }}>
                                Sources: {sources}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="text-xs font-bold px-4 py-2 rounded-[12px] transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--ee-bg)', color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                >
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {GROUPS.map((group) => {
                    const rows = group.keys
                        .map(([key, label]) => {
                            const a = attrs[key]
                            return a && a.value != null ? <AttrRow key={key} label={label} attr={a} /> : null
                        })
                        .filter(Boolean)
                    if (rows.length === 0) return null
                    return (
                        <div key={group.title} className="p-5 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                            <h3 className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--ee-muted)' }}>
                                {group.title}
                            </h3>
                            {rows}
                        </div>
                    )
                })}
            </div>

            <p className="text-[11px] mt-5" style={{ color: 'var(--ee-muted)' }}>
                Modelled from public soil &amp; terrain datasets — a baseline for planning.
                Confidence reflects each source&apos;s own uncertainty. For precision decisions,
                confirm with a laboratory soil test.
            </p>
        </div>
    )
}
