'use client'

// The Stand Check — count what actually came up, and find out what it means
// while there is still time to act.
//
// This is the highest-information, lowest-effort measurement in the season and
// the one the product was previously blind to. Establishment is decided in week
// one, unrecoverable by week three, and invisible to satellites: NDVI cannot
// separate a thin healthy stand from a full stressed one, and those two demand
// opposite actions. The number this screen captures is the denominator that
// tells them apart.
//
// Design notes:
//   * The measured row length is computed from THIS season's row spacing, so
//     the farmer measures once and the arithmetic is ours, not theirs.
//   * Multiple samples are encouraged in the copy — one count from a good patch
//     tells you nothing about the field.
//   * The result leads with the decision, not the number. "31,000 plants/ha" is
//     a fact; "gap-fill the worst patches, you have about 5 days" is advice.

import React, { useEffect, useState } from 'react'
import {
    getStandCheckInstructions,
    submitStandCheck,
} from '@/hooks/useSeasons'
import { formatPopulation, standVerdictStyle } from '@/lib/planning-utils'
import type {
    Season,
    StandAssessment,
    StandCheckInstructions,
} from '@/lib/planning-types'

interface Props {
    fieldId: string
    season: Season
    onComplete?: (assessment: StandAssessment) => void
}

const UNIFORMITY = [
    { value: 'uniform', label: 'Even', hint: 'Most plants came up together' },
    { value: 'moderate', label: 'Patchy', hint: 'Some came up noticeably later' },
    { value: 'poor', label: 'Very uneven', hint: 'Big spread — a week or more' },
]

const inputStyle: React.CSSProperties = {
    background: 'var(--ee-bg)',
    color: 'var(--ee-text)',
    fontFamily: 'var(--font-body)',
    boxShadow: 'var(--shadow-neu-inset)',
    border: 'none',
}

export function StandCheckForm({ fieldId, season, onComplete }: Props) {
    const [instructions, setInstructions] = useState<StandCheckInstructions | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [counts, setCounts] = useState<string[]>(['', '', ''])
    const [uniformity, setUniformity] = useState('uniform')
    const [daysAfterEmergence, setDaysAfterEmergence] = useState('')

    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [assessment, setAssessment] = useState<StandAssessment | null>(null)

    useEffect(() => {
        let cancelled = false
        getStandCheckInstructions(season.id)
            .then((data) => { if (!cancelled) setInstructions(data) })
            .catch((e: unknown) => {
                if (!cancelled) {
                    setLoadError(e instanceof Error ? e.message : 'Could not load the stand check')
                }
            })
        return () => { cancelled = true }
    }, [season.id])

    const numericCounts = counts
        .map((c) => Number(c))
        .filter((n) => Number.isFinite(n) && n > 0)

    // Average the samples the farmer actually took. Averaging is the whole point
    // of taking several — a single sample is not a field measurement.
    const averageCount = numericCounts.length
        ? numericCounts.reduce((a, b) => a + b, 0) / numericCounts.length
        : null

    const submit = async () => {
        if (averageCount === null) return
        setSubmitting(true)
        setSubmitError(null)
        try {
            const result = await submitStandCheck(fieldId, season.id, {
                counted_plants: Math.round(averageCount),
                days_after_emergence: daysAfterEmergence ? Number(daysAfterEmergence) : undefined,
                emergence_uniformity: uniformity,
            })
            setAssessment(result.assessment)
            onComplete?.(result.assessment)
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Could not save the stand check')
        } finally {
            setSubmitting(false)
        }
    }

    // --- Result --------------------------------------------------------------
    if (assessment) {
        const style = standVerdictStyle(assessment.verdict)
        const ceilingPct = Math.round(assessment.yield_ceiling_factor * 100)
        return (
            <div
                className="neu-surface rounded-[20px] p-5 sm:p-6"
                style={{ background: 'var(--ee-surface)' }}
            >
                <div
                    className="rounded-[16px] p-4 mb-4"
                    style={{ background: style.color, color: '#fff' }}
                >
                    <p
                        className="text-[10px] font-bold uppercase opacity-85 mb-1"
                        style={{ fontFamily: 'var(--font-body)' }}
                    >
                        Your stand
                    </p>
                    <p
                        className="text-2xl font-black leading-tight"
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        {formatPopulation(assessment.established_population_per_ha)} plants/ha
                    </p>
                    <p className="text-sm font-bold mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                        {style.label} · {assessment.achieved_pct}% of your{' '}
                        {formatPopulation(assessment.target_population_per_ha)} target
                    </p>
                </div>

                {/* The decision leads. The measurement is above it as evidence. */}
                <div
                    className="rounded-[16px] p-4 mb-4"
                    style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
                >
                    <p
                        className="text-[10px] font-bold uppercase mb-1.5"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        What to do
                    </p>
                    <p
                        className="text-sm leading-relaxed font-bold"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                    >
                        {assessment.recommendation}
                    </p>
                </div>

                {ceilingPct < 100 && (
                    <p
                        className="text-sm leading-relaxed rounded-[12px] p-3 mb-3"
                        style={{ background: '#eab30818', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                    >
                        This season&apos;s realistic ceiling is now about{' '}
                        <strong>{ceilingPct}%</strong> of what a full stand would have
                        given. Your projection has been updated to match.
                    </p>
                )}

                <ul className="space-y-2">
                    {assessment.rationale.map((r, i) => (
                        <li
                            key={i}
                            className="text-sm leading-relaxed flex gap-2"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            <span>•</span>
                            <span>{r}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )
    }

    // --- Blocked -------------------------------------------------------------
    if (loadError) {
        return (
            <div
                className="neu-surface rounded-[20px] p-5 sm:p-6"
                style={{ background: 'var(--ee-surface)' }}
            >
                <h3
                    className="text-base font-black mb-2"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                >
                    Stand Check
                </h3>
                <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                >
                    {loadError}
                </p>
            </div>
        )
    }

    // --- Form ----------------------------------------------------------------
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
                    straighten
                </span>
                Stand Check
            </h3>
            <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                One minute with a tape measure. This is the measurement that sets
                your ceiling for the season — and it can&apos;t be taken later.
            </p>

            {!instructions ? (
                <div className="animate-pulse space-y-3">
                    <div className="h-20 rounded-[16px]" style={{ background: 'var(--ee-bg)' }} />
                    <div className="h-12 rounded-[16px]" style={{ background: 'var(--ee-bg)' }} />
                </div>
            ) : (
                <>
                    <div
                        className="rounded-[16px] p-4 mb-4"
                        style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)' }}
                    >
                        <p
                            className="text-[10px] font-bold uppercase opacity-80 mb-1"
                            style={{ fontFamily: 'var(--font-body)' }}
                        >
                            Measure this much row
                        </p>
                        <p
                            className="text-2xl font-black leading-tight mb-2"
                            style={{ fontFamily: 'var(--font-heading)' }}
                        >
                            {instructions.row_length_m} m
                        </p>
                        <p className="text-sm leading-relaxed opacity-95" style={{ fontFamily: 'var(--font-body)' }}>
                            {instructions.instructions}
                        </p>
                        {instructions.expected_count !== null && (
                            <p
                                className="text-sm font-bold mt-2 pt-2"
                                style={{
                                    fontFamily: 'var(--font-body)',
                                    borderTop: '1px solid rgba(255,255,255,0.25)',
                                }}
                            >
                                On target you&apos;d count about {instructions.expected_count} plants.
                            </p>
                        )}
                    </div>

                    <label
                        className="block text-xs font-bold uppercase mb-1.5"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        Your counts
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-1.5">
                        {counts.map((c, i) => (
                            <input
                                key={i}
                                type="number"
                                inputMode="numeric"
                                min="0"
                                className="w-full rounded-[16px] p-3 font-bold text-center focus:outline-none"
                                style={inputStyle}
                                placeholder={`#${i + 1}`}
                                value={c}
                                onChange={(e) => {
                                    const next = [...counts]
                                    next[i] = e.target.value
                                    setCounts(next)
                                }}
                                aria-label={`Sample ${i + 1} plant count`}
                            />
                        ))}
                    </div>
                    <p
                        className="text-xs mb-4"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        {averageCount !== null
                            ? `Average of ${numericCounts.length} sample${numericCounts.length > 1 ? 's' : ''}: ${Math.round(averageCount)} plants`
                            : 'Take at least two samples in different parts of the field.'}
                    </p>

                    <label
                        className="block text-xs font-bold uppercase mb-1.5"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        How even was emergence?
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {UNIFORMITY.map((u) => {
                            const selected = uniformity === u.value
                            return (
                                <button
                                    key={u.value}
                                    type="button"
                                    onClick={() => setUniformity(u.value)}
                                    className="rounded-[16px] p-3 text-left transition-all"
                                    style={{
                                        background: selected ? 'var(--ee-primary)' : 'var(--ee-bg)',
                                        color: selected ? '#fff' : 'var(--ee-text)',
                                        boxShadow: selected ? 'var(--shadow-ambient)' : 'var(--shadow-neu-inset)',
                                    }}
                                    aria-pressed={selected}
                                >
                                    <span
                                        className="block text-sm font-black"
                                        style={{ fontFamily: 'var(--font-heading)' }}
                                    >
                                        {u.label}
                                    </span>
                                    <span
                                        className="block text-[11px] leading-tight mt-0.5"
                                        style={{ fontFamily: 'var(--font-body)', opacity: 0.8 }}
                                    >
                                        {u.hint}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <label
                        className="block text-xs font-bold uppercase mb-1.5"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        Days since the crop came up{' '}
                        <span className="lowercase font-normal">(optional)</span>
                    </label>
                    <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        className="w-full rounded-[16px] p-3 font-bold focus:outline-none mb-1.5"
                        style={inputStyle}
                        placeholder="e.g. 10"
                        value={daysAfterEmergence}
                        onChange={(e) => setDaysAfterEmergence(e.target.value)}
                    />
                    <p
                        className="text-xs mb-4 leading-relaxed"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        This decides whether gap-filling can still catch up — replacements
                        planted much after two weeks stay behind all season.
                    </p>

                    {submitError && (
                        <p
                            className="text-sm rounded-[12px] p-3 mb-3"
                            style={{ background: '#dc262618', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            {submitError}
                        </p>
                    )}

                    <button
                        onClick={submit}
                        disabled={averageCount === null || submitting}
                        className="w-full py-3.5 rounded-[16px] font-bold disabled:opacity-60"
                        style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)', fontFamily: 'var(--font-body)' }}
                    >
                        {submitting ? 'Working it out…' : 'See what this means'}
                    </button>
                </>
            )}
        </div>
    )
}

export default StandCheckForm
