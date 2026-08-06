'use client'

// What's actually wrong with the weak parts of this field, and whether it is
// the year or the ground.
//
// Sits beneath the zone map, which answers "where". This answers "what" and
// "is it worth fixing" — the two questions a coloured square leaves open.
//
// Two sections, deliberately separated:
//   * This season — zones behind right now, with whatever corroborates it.
//   * Every season — zones that have been behind repeatedly. These are the ones
//     where fixing the ground pays back every year, not just this one, and they
//     justify a soil test in a way one bad season never does.

import React from 'react'

import { useZoneDiagnosis, useZoneHistory } from '@/hooks/useFieldSections'
import {
    formatNdvi,
    seasonMarks,
    structuralZones,
    zoneSeverityStyle,
    zonesNeedingAttention,
} from '@/lib/zone-insight-utils'
import type { ZoneDiagnosis, ZoneTrack } from '@/lib/planning-types'

interface Props {
    fieldId: string
}

function DiagnosisRow({ zone }: { zone: ZoneDiagnosis }) {
    const style = zoneSeverityStyle(zone.severity)
    return (
        <li
            className="rounded-[16px] p-4"
            style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
        >
            <div className="flex items-start justify-between gap-3 mb-1">
                <p
                    className="text-sm font-black"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                >
                    {zone.label}
                </p>
                <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                        color: style.color,
                        background: `${style.color}1a`,
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    {style.label} · {formatNdvi(zone.ndvi)}
                </span>
            </div>

            <ul className="space-y-1 mt-2">
                {zone.causes.map((c, i) => (
                    <li
                        key={i}
                        className="text-xs leading-relaxed flex gap-2"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                    >
                        <span style={{ color: 'var(--ee-muted)' }}>•</span>
                        <span>{c}</span>
                    </li>
                ))}
            </ul>

            {zone.action && (
                <p
                    className="text-xs font-bold mt-2.5"
                    style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                >
                    {zone.action}
                </p>
            )}
        </li>
    )
}

function HistoryRow({ track }: { track: ZoneTrack }) {
    const marks = seasonMarks(track)
    return (
        <li
            className="rounded-[16px] p-4"
            style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <p
                    className="text-sm font-black"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                >
                    {track.label}
                </p>
                <span
                    className="text-[11px] font-bold whitespace-nowrap"
                    style={{ color: '#dc2626', fontFamily: 'var(--font-body)' }}
                >
                    {track.seasons_behind} of {track.seasons_compared} seasons
                </span>
            </div>

            {/* One mark per season, oldest first — reads at a glance in a way a
                four-point sparkline does not. */}
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {marks.map((m, i) => (
                    <span
                        key={i}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                            background: m.behind ? '#dc262622' : '#0fb88522',
                            color: m.behind ? '#dc2626' : '#0fb885',
                            fontFamily: 'var(--font-body)',
                        }}
                        title={m.behind ? 'Behind the field' : 'Kept up'}
                    >
                        {m.label}
                    </span>
                ))}
            </div>

            {track.action && (
                <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                >
                    {track.action}
                </p>
            )}
        </li>
    )
}

export function ZoneInsightCard({ fieldId }: Props) {
    const { diagnosis, isLoading: dLoading, error: dError } = useZoneDiagnosis(fieldId)
    const { history, isLoading: hLoading, error: hError } = useZoneHistory(fieldId)

    if (dLoading && hLoading) return null

    const attention = zonesNeedingAttention(dError ? undefined : diagnosis?.zones)
    const structural = structuralZones(hError ? undefined : history?.zones)

    // Nothing wrong and nothing historic is a good outcome, not a card. Silent
    // absence beats "no issues found" taking up a screen.
    if (attention.length === 0 && structural.length === 0) return null

    return (
        <div
            className="lg:col-span-12 p-6 lg:p-8"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}
        >
            <h2
                className="text-lg font-black flex items-center gap-2 mb-1"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 22, color: 'var(--ee-primary)' }}
                >
                    troubleshoot
                </span>
                What&apos;s going on in your zones
            </h2>
            <p
                className="text-[11px] font-bold mb-5"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                Compared against the rest of this field, not a fixed score
            </p>

            {attention.length > 0 && (
                <>
                    <p
                        className="text-[10px] font-bold uppercase mb-2"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        Behind this season
                    </p>
                    <ul className="space-y-2.5 mb-5">
                        {attention.map((z) => (
                            <DiagnosisRow key={z.index} zone={z} />
                        ))}
                    </ul>
                </>
            )}

            {structural.length > 0 && (
                <>
                    <p
                        className="text-[10px] font-bold uppercase mb-1"
                        style={{ color: '#dc2626', fontFamily: 'var(--font-body)' }}
                    >
                        Behind every season
                    </p>
                    <p
                        className="text-xs leading-relaxed mb-2.5"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        A patch that underperforms year after year is usually the ground,
                        not the season. These are where fixing it pays back every year.
                    </p>
                    <ul className="space-y-2.5">
                        {structural.map((t) => (
                            <HistoryRow key={t.index} track={t} />
                        ))}
                    </ul>
                </>
            )}
        </div>
    )
}

export default ZoneInsightCard
