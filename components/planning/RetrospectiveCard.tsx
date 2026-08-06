'use client'

// Season retrospective — where the yield gap went.
//
// The presentation carries the same commitment as the backend: this does NOT
// render as a pie chart or a stacked bar that fills to 100%. Those shapes imply
// a complete decomposition, and the decomposition is deliberately incomplete —
// only factors with a measurement behind them are named, and the remainder is
// shown as unexplained.
//
// A chart that closes perfectly would be the visual equivalent of the fudge the
// backend refuses to make. So the unexplained portion is rendered with the same
// weight as the named factors, in the same list, rather than hidden in a
// footnote or quietly dropped.

import React from 'react'

import { useRetrospective } from '@/hooks/useSeasons'
import type { GapFactor, Retrospective } from '@/lib/planning-types'

interface Props {
    seasonId: string
}

function Bar({ value, total, color }: { value: number; total: number; color: string }) {
    const pct = total > 0 ? Math.max(2, Math.round((value / total) * 100)) : 0
    return (
        <div
            className="h-1.5 rounded-full mt-2"
            style={{ background: 'var(--ee-bg)', overflow: 'hidden' }}
        >
            <div style={{ width: `${pct}%`, height: '100%', background: color }} />
        </div>
    )
}

function FactorRow({ factor, gap }: { factor: GapFactor; gap: number }) {
    return (
        <li
            className="rounded-[16px] p-4"
            style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
        >
            <div className="flex items-start justify-between gap-3">
                <p
                    className="text-sm font-black"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                >
                    {factor.label}
                </p>
                <p
                    className="text-sm font-black whitespace-nowrap"
                    style={{ color: '#ea580c', fontFamily: 'var(--font-heading)' }}
                >
                    −{factor.tonnes_per_ha} t/ha
                </p>
            </div>
            <Bar value={factor.tonnes_per_ha} total={gap} color="#ea580c" />
            <p
                className="text-xs leading-relaxed mt-2"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
            >
                {factor.evidence}
            </p>
            {factor.controllable && (
                <p
                    className="text-xs leading-relaxed mt-2 pt-2"
                    style={{
                        color: 'var(--ee-muted)',
                        fontFamily: 'var(--font-body)',
                        borderTop: '1px solid var(--ee-surface)',
                    }}
                >
                    <strong style={{ color: 'var(--ee-primary)' }}>Next season: </strong>
                    {factor.next_season}
                </p>
            )}
        </li>
    )
}

function Body({ r }: { r: Retrospective }) {
    const gap = r.gap_t_ha ?? 0

    return (
        <>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                    className="rounded-[16px] p-4"
                    style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
                >
                    <p
                        className="text-[10px] font-bold uppercase mb-1"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        You harvested
                    </p>
                    <p
                        className="text-xl font-black"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        {r.actual_yield_t_ha} t/ha
                    </p>
                </div>
                <div
                    className="rounded-[16px] p-4"
                    style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
                >
                    <p
                        className="text-[10px] font-bold uppercase mb-1"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        Realistic ceiling
                    </p>
                    <p
                        className="text-xl font-black"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        {r.potential_yield_t_ha} t/ha
                    </p>
                </div>
            </div>

            {gap > 0 && (
                <>
                    <p
                        className="text-[11px] font-bold uppercase mb-2"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        Where the {gap} t/ha went
                    </p>
                    <ul className="space-y-2.5">
                        {r.factors.map((f) => (
                            <FactorRow key={f.key} factor={f} gap={gap} />
                        ))}

                        {/* Rendered as a peer of the named factors, not a
                            footnote. Hiding it would imply the breakdown is
                            complete, which is exactly the claim we decline. */}
                        {r.unexplained_t_ha !== null && r.unexplained_t_ha > 0 && (
                            <li
                                className="rounded-[16px] p-4"
                                style={{
                                    background: 'var(--ee-bg)',
                                    boxShadow: 'var(--shadow-neu-inset)',
                                }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p
                                        className="text-sm font-black"
                                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-heading)' }}
                                    >
                                        Not accounted for
                                    </p>
                                    <p
                                        className="text-sm font-black whitespace-nowrap"
                                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-heading)' }}
                                    >
                                        −{r.unexplained_t_ha} t/ha
                                    </p>
                                </div>
                                <Bar value={r.unexplained_t_ha} total={gap} color="#9ca3af" />
                                <p
                                    className="text-xs leading-relaxed mt-2"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    Weather, soil variation and pest pressure all play a
                                    part. We only name what we measured.
                                </p>
                            </li>
                        )}
                    </ul>
                </>
            )}

            {r.notes.length > 0 && (
                <div className="mt-4 space-y-2">
                    {r.notes.map((n, i) => (
                        <p
                            key={i}
                            className="text-xs leading-relaxed"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            {n}
                        </p>
                    ))}
                </div>
            )}
        </>
    )
}

export function RetrospectiveCard({ seasonId }: Props) {
    const { retrospective: r, isLoading, error } = useRetrospective(seasonId)

    if (isLoading || error || !r) return null

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
                    summarize
                </span>
                Season review
            </h2>
            <p
                className="text-sm leading-relaxed mb-5"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
            >
                {r.headline}
            </p>

            {r.actual_yield_t_ha !== null && r.potential_yield_t_ha !== null && <Body r={r} />}
        </div>
    )
}

export default RetrospectiveCard
