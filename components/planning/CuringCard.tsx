'use client'

// Flue-curing: the barn cycle, and how many barns this field needs.
//
// `PostHarvestCard` covers grain — dry to a target, keep the weevils out. None
// of that applies to a leaf that has to be held at 85% humidity for two days on
// purpose, and tobacco is what most of this product's farmers actually grow. A
// grower can execute a flawless season and destroy it in the barn in three days,
// and the app had nothing to say at exactly that point.
//
// Two things drive the layout:
//
// 1. **The ramp leads.** Curing is a sequence of temperatures over days, and a
//    farmer standing at a barn door needs to see where they are in it — not
//    read a paragraph. The stages are a numbered ladder with the temperature as
//    the largest thing on each rung.
//
// 2. **Barns come before the season, not after it.** A grower decides how many
//    barns to build, and cuts or buys the wood to fire them, months before the
//    first leaf is ready. So this card shows from the day a tobacco field is
//    mapped — unlike the post-harvest card, which waits for a harvested season.
//
// The card renders nothing for any crop that is not flue-cured; the backend
// answers 204 and the hook turns that into `null`. Burley is included in that
// silence deliberately: it is tobacco, and it is air-cured, and a 70 °C ramp
// would destroy it.

import React, { useState } from 'react'

import { useCuringPlan } from '@/hooks/useSeasons'
import { barnLabel, formatRange, isRenderable } from '@/lib/curing-utils'
import type { CuringBarnOption, CuringPlan, CuringStage } from '@/lib/planning-types'

interface Props {
    fieldId: string
    crop?: string
}

function Stage({ stage, index }: { stage: CuringStage; index: number }) {
    const [open, setOpen] = useState(false)
    return (
        <li
            className="rounded-[16px] p-4"
            style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
        >
            <div className="flex items-start gap-3">
                <span
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                    style={{
                        background: 'var(--ee-surface)',
                        color: 'var(--ee-muted)',
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                    <p
                        className="text-sm font-black"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        {stage.name}
                    </p>

                    {/* The two numbers a farmer at the barn door is looking for. */}
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-1.5">
                        <span
                            className="text-xl font-black leading-none"
                            style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-heading)' }}
                        >
                            {formatRange(stage.temperature_c)} °C
                        </span>
                        <span
                            className="text-sm font-bold"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            {formatRange(stage.duration_days)} days
                        </span>
                        {stage.relative_humidity_pct !== null && (
                            <span
                                className="text-sm font-bold"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                            >
                                ~{stage.relative_humidity_pct}% humidity
                            </span>
                        )}
                    </div>

                    <p
                        className="text-sm leading-relaxed mt-2"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                    >
                        {stage.what_happens}
                    </p>
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="text-[11px] font-bold uppercase mt-2"
                        style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                        aria-expanded={open}
                    >
                        {open ? 'Hide' : 'What goes wrong here'}
                    </button>
                    {open && (
                        <p
                            className="text-xs leading-relaxed mt-2"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            {stage.watch_for}
                        </p>
                    )}
                </div>
            </div>
        </li>
    )
}

function Barn({ option }: { option: CuringBarnOption }) {
    return (
        <li
            className="rounded-[16px] p-4"
            style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
        >
            <p
                className="text-sm font-black"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                {barnLabel(option)}
            </p>
            <p
                className="text-xs mt-1"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                {option.hectares} ha each · suits {option.suits}
            </p>
            {/* The number a grower budgets wood or coal against. Absent where the
                source publishes none — borrowing a neighbouring barn's figure
                would invent the one thing they plan a purchase around. */}
            {option.fuel_kg_per_kg_cured !== null && option.fuel && (
                <p
                    className="text-xs font-bold mt-1.5"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                >
                    ≈ {option.fuel_kg_per_kg_cured} kg of {option.fuel} per kg of cured leaf
                </p>
            )}
            {option.notes && (
                <p
                    className="text-xs leading-relaxed mt-1.5"
                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                >
                    {option.notes}
                </p>
            )}
        </li>
    )
}

function Body({ plan }: { plan: CuringPlan }) {
    const [showBarns, setShowBarns] = useState(false)
    const conditioning = formatRange(plan.conditioning_moisture_pct)

    return (
        <>
            <div
                className="rounded-[16px] p-4 mb-4"
                style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)' }}
            >
                <p
                    className="text-[10px] font-bold uppercase opacity-80 mb-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                >
                    Time in the barn
                </p>
                <p
                    className="text-2xl font-black leading-tight"
                    style={{ fontFamily: 'var(--font-heading)' }}
                >
                    {formatRange(plan.total_days)} days
                </p>
                <p className="text-sm mt-1 opacity-95" style={{ fontFamily: 'var(--font-body)' }}>
                    Three stages, each one ramping the heat higher than the last.
                </p>
            </div>

            <ol className="space-y-2.5">
                {plan.stages.map((s, i) => (
                    <Stage key={s.key} stage={s} index={i} />
                ))}
            </ol>

            {/* Conditioning is a step, not a footnote — it is the one most often
                skipped and the skip costs the grade, not just the leaf. */}
            <div
                className="rounded-[16px] p-4 mt-2.5 flex gap-3"
                style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
            >
                <span
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                    style={{
                        background: 'var(--ee-surface)',
                        color: 'var(--ee-muted)',
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    {plan.stages.length + 1}
                </span>
                <div className="min-w-0">
                    <p
                        className="text-sm font-black"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        Conditioning
                    </p>
                    <p
                        className="text-sm leading-relaxed mt-1"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                    >
                        Add {conditioning}% moisture back into the leaf before taking it
                        off the sticks. Bone-dry leaf shatters on handling, and the grade
                        goes with it.
                    </p>
                </div>
            </div>

            {plan.barn_options.length > 0 && (
                <div className="mt-5">
                    <button
                        onClick={() => setShowBarns((v) => !v)}
                        className="text-[11px] font-bold uppercase flex items-center gap-1"
                        style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                        aria-expanded={showBarns}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                            {showBarns ? 'expand_less' : 'expand_more'}
                        </span>
                        Barn capacity for this field
                    </button>
                    {showBarns && (
                        <>
                            <ul className="space-y-2.5 mt-3">
                                {plan.barn_options.map((b) => (
                                    <Barn key={b.key} option={b} />
                                ))}
                            </ul>
                            {/* Fuel decides this, not efficiency, and we do not know
                                what the grower can actually source. */}
                            <p
                                className="text-xs leading-relaxed mt-3"
                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                            >
                                Which of these is right depends on the fuel you can
                                actually get hold of, not on which is most efficient.
                            </p>
                        </>
                    )}
                </div>
            )}

            {plan.warnings.map((w, i) => (
                <p
                    key={i}
                    className="text-sm leading-relaxed rounded-[12px] p-3 mt-3"
                    style={{
                        background: '#eab30818',
                        color: 'var(--ee-text)',
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    {w}
                </p>
            ))}
        </>
    )
}

export function CuringCard({ fieldId, crop }: Props) {
    const { plan, isLoading, error } = useCuringPlan(fieldId, crop)

    // Silent absence beats a broken card on the farmer's main surface — and for
    // every crop that is not flue-cured, absence is the correct answer.
    if (isLoading || error || !isRenderable(plan)) return null

    return (
        <div
            className="lg:col-span-12 p-6 lg:p-8"
            style={{
                background: 'var(--ee-surface)',
                borderRadius: '24px',
                boxShadow: 'var(--shadow-neu)',
            }}
        >
            <h2
                className="text-lg font-black flex items-center gap-2 mb-1"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 22, color: 'var(--ee-primary)' }}
                >
                    local_fire_department
                </span>
                Curing the crop
            </h2>
            <p
                className="text-[11px] font-bold mb-5"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                A season&apos;s work can be lost in three days in the barn
            </p>
            <Body plan={plan} />
        </div>
    )
}

export default CuringCard
