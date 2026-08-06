'use client'

// Rotation context for the pre-plant brief: what this field has grown, and
// what that implies for the crop about to go in.
//
// This card is the visible half of a capability the backend has always had and
// could never use — the crop profiles model residue-borne inoculum in detail
// ("worse under continuous maize", "bury crop residue by ploughing"), but
// nothing recorded what grew here last season. Now something does.

import React from 'react'
import { rotationRiskStyle, formatShortDate } from '@/lib/planning-utils'
import type { RotationSummary } from '@/lib/planning-types'

interface Props {
    rotation: RotationSummary | undefined
    loading?: boolean
    /** Shown when there is no history, to point at the fix. */
    onAddPastSeason?: () => void
}

export function RotationCard({ rotation, loading, onAddPastSeason }: Props) {
    if (loading) {
        return (
            <div className="neu-surface rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--ee-surface)' }}>
                <div className="animate-pulse space-y-3">
                    <div className="h-4 w-32 rounded" style={{ background: 'var(--ee-bg)' }} />
                    <div className="h-3 w-full rounded" style={{ background: 'var(--ee-bg)' }} />
                    <div className="h-3 w-4/5 rounded" style={{ background: 'var(--ee-bg)' }} />
                </div>
            </div>
        )
    }
    if (!rotation) return null

    const risk = rotationRiskStyle(rotation.rotation_risk)
    const hasHistory = rotation.seasons_recorded > 0

    return (
        <div
            className="neu-surface rounded-[20px] p-5 sm:p-6"
            style={{ background: 'var(--ee-surface)' }}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <h3
                    className="text-base sm:text-lg font-black"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                >
                    <span
                        className="material-symbols-outlined align-middle mr-1.5"
                        style={{ fontSize: '1.15rem', color: 'var(--ee-primary)' }}
                    >
                        history
                    </span>
                    Rotation
                </h3>
                <span
                    className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{
                        color: risk.color,
                        background: `${risk.color}1a`,
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    {risk.label}
                </span>
            </div>

            {/* Why — the reasons are the whole value; a bare risk label is a
                claim the farmer can't check. */}
            {rotation.risk_reasons.length > 0 && (
                <ul className="space-y-2 mb-4">
                    {rotation.risk_reasons.map((reason, i) => (
                        <li
                            key={i}
                            className="text-sm leading-relaxed flex gap-2"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            <span
                                className="material-symbols-outlined shrink-0"
                                style={{ fontSize: '1rem', color: risk.color, marginTop: '0.15rem' }}
                            >
                                {risk.prominent ? 'warning' : 'check_circle'}
                            </span>
                            <span>{reason}</span>
                        </li>
                    ))}
                </ul>
            )}

            {hasHistory ? (
                <>
                    <p
                        className="text-[11px] font-bold uppercase mb-2"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        What has grown here
                    </p>
                    <ol className="space-y-1.5">
                        {rotation.history.slice(0, 5).map((h, i) => (
                            <li
                                key={h.season_id ?? i}
                                className="flex items-center justify-between gap-3 text-sm"
                                style={{ fontFamily: 'var(--font-body)' }}
                            >
                                <span className="font-bold" style={{ color: 'var(--ee-text)' }}>
                                    {h.crop_type}
                                    {h.variety ? (
                                        <span className="font-normal" style={{ color: 'var(--ee-muted)' }}>
                                            {' '}· {h.variety}
                                        </span>
                                    ) : null}
                                </span>
                                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--ee-muted)' }}>
                                    {h.season_label || formatShortDate(h.planting_date)}
                                    {h.yield_tonnes_per_ha
                                        ? ` · ${h.yield_tonnes_per_ha} t/ha`
                                        : ''}
                                </span>
                            </li>
                        ))}
                    </ol>

                    {rotation.last_n_fixing_crop && (
                        <p
                            className="text-xs mt-3 leading-relaxed"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            Last nitrogen-fixing crop here: <strong>{rotation.last_n_fixing_crop}</strong>.
                        </p>
                    )}
                </>
            ) : (
                <div
                    className="rounded-[16px] p-4"
                    style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
                >
                    <p
                        className="text-sm leading-relaxed mb-3"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                    >
                        No cropping history for this field yet, so disease carry-over
                        risk can&apos;t be assessed. Adding the last two or three
                        seasons takes a minute and unlocks it.
                    </p>
                    {onAddPastSeason && (
                        <button
                            onClick={onAddPastSeason}
                            className="text-sm font-bold py-2 px-4 rounded-[12px]"
                            style={{
                                background: 'var(--ee-primary)',
                                color: 'var(--ee-on-primary)',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            Add a past season
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default RotationCard
