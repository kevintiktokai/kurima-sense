'use client'

// Post-harvest: drying, storage and monitoring once the crop is off the field.
//
// The season used to end here. For the farmer it doesn't — regional storage
// losses run 20-30%, so this is where a flawless season can still lose a
// quarter of itself. The card appears once a season reaches harvested, which is
// exactly when the app previously went quiet.
//
// The moisture target leads, because it is the one number that decides whether
// the crop keeps: everything else in the card is downstream of hitting it.

import React, { useState } from 'react'

import { usePostHarvestPlan, useSeasons } from '@/hooks/useSeasons'
import type { PostHarvestPlan, PostHarvestStep } from '@/lib/planning-types'

interface Props {
    fieldId: string
    /** Render regardless of season state — used by the reference view. */
    force?: boolean
    crop?: string
}

function Step({ step, index }: { step: PostHarvestStep; index: number }) {
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
                        background: step.critical ? '#ea580c' : 'var(--ee-surface)',
                        color: step.critical ? '#fff' : 'var(--ee-muted)',
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
                        {step.title}
                    </p>
                    <p
                        className="text-sm leading-relaxed mt-1"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                    >
                        {step.detail}
                    </p>
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="text-[11px] font-bold uppercase mt-2"
                        style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                        aria-expanded={open}
                    >
                        {open ? 'Hide why' : 'Why this matters'}
                    </button>
                    {open && (
                        <p
                            className="text-xs leading-relaxed mt-2"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            {step.why}
                        </p>
                    )}
                </div>
            </div>
        </li>
    )
}

function Body({ plan }: { plan: PostHarvestPlan }) {
    return (
        <>
            {/* The number the whole phase turns on. */}
            {plan.storage_moisture_pct !== null && (
                <div
                    className="rounded-[16px] p-4 mb-4"
                    style={{ background: 'var(--ee-primary)', color: '#fff' }}
                >
                    <p
                        className="text-[10px] font-bold uppercase opacity-80 mb-1"
                        style={{ fontFamily: 'var(--font-body)' }}
                    >
                        Dry to this before storing
                    </p>
                    <p
                        className="text-2xl font-black leading-tight"
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        {plan.storage_moisture_pct}% moisture
                    </p>
                    <p className="text-sm mt-1 opacity-95" style={{ fontFamily: 'var(--font-body)' }}>
                        {plan.fumigation_possible
                            ? 'Dry enough for storage chemicals to work properly.'
                            : 'Store hermetically — sealed bags or a metal silo.'}
                    </p>
                </div>
            )}

            {plan.aflatoxin_risk && (
                <p
                    className="text-sm leading-relaxed rounded-[12px] p-3 mb-3 flex gap-2"
                    style={{ background: '#dc262618', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                >
                    <span
                        className="material-symbols-outlined shrink-0"
                        style={{ fontSize: '1rem', color: '#dc2626', marginTop: '0.1rem' }}
                    >
                        health_and_safety
                    </span>
                    <span>
                        Mould on this crop is a food-safety problem, not just a quality
                        one. Aflatoxin is not removed by cooking — reject discoloured or
                        mouldy grain rather than blending it in.
                    </span>
                </p>
            )}

            {plan.warnings
                .filter((w) => !w.includes('aflatoxin'))
                .map((w, i) => (
                    <p
                        key={i}
                        className="text-sm leading-relaxed rounded-[12px] p-3 mb-3"
                        style={{ background: '#eab30818', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                    >
                        {w}
                    </p>
                ))}

            <ol className="space-y-2.5">
                {plan.steps.map((s, i) => (
                    <Step key={s.key} step={s} index={i} />
                ))}
            </ol>
        </>
    )
}

export function PostHarvestCard({ fieldId, force = false, crop }: Props) {
    const { seasons } = useSeasons(fieldId)

    // Show once the crop is off the field — that is when the risk starts and
    // when the app used to fall silent.
    const harvested = seasons.find((s) => s.status === 'harvested')
    const shouldShow = force || Boolean(harvested)

    const { plan, isLoading, error } = usePostHarvestPlan(
        fieldId,
        crop ?? harvested?.crop_type ?? undefined,
        shouldShow
    )

    if (!shouldShow) return null
    // Silent absence beats a broken card on the farmer's main surface.
    if (isLoading || error || !plan || plan.steps.length === 0) return null

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
                    inventory_2
                </span>
                After harvest
            </h2>
            <p
                className="text-[11px] font-bold mb-5"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                A quarter of a crop can be lost in the shed — this is how to keep it
            </p>
            <Body plan={plan} />
        </div>
    )
}

export default PostHarvestCard
