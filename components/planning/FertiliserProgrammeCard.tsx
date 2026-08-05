'use client'

// The fertiliser programme as a dated timeline.
//
// Every crop profile has carried a full FertilizerSchedule — basal, top-dress
// splits, foliar, liming, each with rates, timings and scientific basis — since
// the knowledge base was written, and no screen ever rendered it. This is that
// surface.
//
// Two presentation rules carry real meaning:
//   * Scheduled work is separated from conditional work. Mixing them makes the
//     season look heavier than it is, and an overloaded plan is the documented
//     path to abandonment.
//   * Costs are absent by design. Farmers price against their own quotes.

import React, { useState } from 'react'
import {
    formatShortDate,
    formatStepAmount,
    relativeDayLabel,
    splitProgramme,
} from '@/lib/planning-utils'
import type { FertiliserProgramme, FertiliserStep } from '@/lib/planning-types'

interface Props {
    programme: FertiliserProgramme | null
    loading?: boolean
}

function StepRow({ step, conditional }: { step: FertiliserStep; conditional?: boolean }) {
    const [open, setOpen] = useState(false)
    const hasWhy = Boolean(step.why || step.application)

    return (
        <li
            className="rounded-[16px] p-4"
            style={{
                background: 'var(--ee-bg)',
                boxShadow: 'var(--shadow-neu-inset)',
                opacity: conditional ? 0.85 : 1,
            }}
        >
            <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="min-w-0">
                    <p
                        className="text-sm font-black"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        {step.label}
                    </p>
                    <p
                        className="text-xs mt-0.5 break-words"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        {step.product}
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <p
                        className="text-sm font-black whitespace-nowrap"
                        style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-heading)' }}
                    >
                        {formatStepAmount(step)}
                    </p>
                    {step.rate_text && (
                        <p
                            className="text-[11px]"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            {step.rate_text}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                {conditional ? (
                    <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                            color: 'var(--ee-muted)',
                            background: 'var(--ee-surface)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        {step.conditional_on ?? 'only if needed'}
                    </span>
                ) : (
                    <span
                        className="text-xs font-bold"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                    >
                        {step.scheduled_date
                            ? `${formatShortDate(step.scheduled_date)} · ${relativeDayLabel(step.scheduled_date)}`
                            : step.timing_text}
                    </span>
                )}
                {step.stage_code && (
                    <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                            color: 'var(--ee-primary)',
                            background: 'var(--ee-surface)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        {step.stage_code}
                    </span>
                )}
            </div>

            {hasWhy && (
                <>
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="text-[11px] font-bold uppercase mt-2.5"
                        style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                        aria-expanded={open}
                    >
                        {open ? 'Hide why' : 'Why this matters'}
                    </button>
                    {open && (
                        <div className="mt-2 space-y-2">
                            {step.application && (
                                <p
                                    className="text-xs leading-relaxed font-bold"
                                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                >
                                    How: {step.application}
                                </p>
                            )}
                            {step.why && (
                                <p
                                    className="text-xs leading-relaxed"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    {step.why}
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}
        </li>
    )
}

export function FertiliserProgrammeCard({ programme, loading }: Props) {
    if (loading) {
        return (
            <div className="neu-surface rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--ee-surface)' }}>
                <div className="animate-pulse space-y-3">
                    <div className="h-4 w-44 rounded" style={{ background: 'var(--ee-bg)' }} />
                    <div className="h-20 rounded-[16px]" style={{ background: 'var(--ee-bg)' }} />
                    <div className="h-20 rounded-[16px]" style={{ background: 'var(--ee-bg)' }} />
                </div>
            </div>
        )
    }
    if (!programme || programme.steps.length === 0) {
        return (
            <div className="neu-surface rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--ee-surface)' }}>
                <h3
                    className="text-base sm:text-lg font-black mb-2"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                >
                    Fertiliser programme
                </h3>
                <p
                    className="text-sm"
                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                >
                    No fertiliser programme is available for this crop yet.
                </p>
            </div>
        )
    }

    const { scheduled, conditional } = splitProgramme(programme.steps)

    return (
        <div
            className="neu-surface rounded-[20px] p-5 sm:p-6"
            style={{ background: 'var(--ee-surface)' }}
        >
            <h3
                className="text-base sm:text-lg font-black mb-1"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                <span
                    className="material-symbols-outlined align-middle mr-1.5"
                    style={{ fontSize: '1.15rem', color: 'var(--ee-primary)' }}
                >
                    science
                </span>
                Fertiliser programme
            </h3>
            <p
                className="text-xs mb-4"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                Quantities are for your whole field. Prices aren&apos;t included —
                use your own supplier quotes.
            </p>

            {/* Soil-driven changes to the standard programme. These are the
                money decisions, so they lead. */}
            {programme.adjustments.map((a, i) => (
                <p
                    key={i}
                    className="text-sm leading-relaxed rounded-[12px] p-3 mb-2 flex gap-2"
                    style={{
                        background: 'var(--ee-primary)18',
                        color: 'var(--ee-text)',
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    <span
                        className="material-symbols-outlined shrink-0"
                        style={{ fontSize: '1rem', color: 'var(--ee-primary)', marginTop: '0.1rem' }}
                    >
                        tune
                    </span>
                    <span>{a}</span>
                </p>
            ))}

            {programme.warnings.map((w, i) => (
                <p
                    key={i}
                    className="text-sm leading-relaxed rounded-[12px] p-3 mb-2 flex gap-2"
                    style={{ background: '#eab30818', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                >
                    <span
                        className="material-symbols-outlined shrink-0"
                        style={{ fontSize: '1rem', color: '#eab308', marginTop: '0.1rem' }}
                    >
                        warning
                    </span>
                    <span>{w}</span>
                </p>
            ))}

            <ul className="space-y-2.5 mt-3">
                {scheduled.map((s) => (
                    <StepRow key={s.key} step={s} />
                ))}
            </ul>

            {conditional.length > 0 && (
                <>
                    <p
                        className="text-[11px] font-bold uppercase mt-5 mb-2"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        Only if needed
                    </p>
                    <ul className="space-y-2.5">
                        {conditional.map((s) => (
                            <StepRow key={s.key} step={s} conditional />
                        ))}
                    </ul>
                </>
            )}

            {programme.notes && (
                <p
                    className="text-[11px] leading-relaxed mt-4 pt-3"
                    style={{
                        color: 'var(--ee-muted)',
                        fontFamily: 'var(--font-body)',
                        borderTop: '1px solid var(--ee-bg)',
                    }}
                >
                    {programme.notes}
                </p>
            )}
        </div>
    )
}

export default FertiliserProgrammeCard
