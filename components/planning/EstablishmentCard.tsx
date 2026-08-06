'use client'

// The establishment plan: target population translated into something a farmer
// can execute holding a hoe.
//
// The ordering here is deliberate. Spacing and the field check come first,
// because "44,000 plants/ha" is not an instruction — "90 cm rows, a plant every
// 25 cm, count 16 plants in 4 paces" is. The population figure is the agronomy
// behind it and sits underneath as supporting detail.

import React from 'react'
import { formatPopulation, formatSpacing } from '@/lib/planning-utils'
import { useUserProfile } from '@/components/providers/UserProfileProvider'
import {
    establishmentEquipmentTips,
    establishmentHandTips,
    seedQuantityLabel,
    spacingCheckInstruction,
} from '@/lib/persona'
import type { EstablishmentPlan } from '@/lib/planning-types'

interface Props {
    plan: EstablishmentPlan | null
    crop: string
    loading?: boolean
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div
            className="rounded-[16px] p-3.5"
            style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
        >
            <p
                className="text-[10px] font-bold uppercase mb-1"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                {label}
            </p>
            <p
                className="text-base font-black leading-tight"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                {value}
            </p>
            {hint && (
                <p
                    className="text-[11px] mt-0.5"
                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                >
                    {hint}
                </p>
            )}
        </div>
    )
}

export function EstablishmentCard({ plan, crop, loading }: Props) {
    // Persona changes how this is said and which instructions apply — never the
    // agronomy. The target population is the same number for everyone.
    const { profile } = useUserProfile()
    const persona = profile?.persona ?? null
    if (loading) {
        return (
            <div className="neu-surface rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--ee-surface)' }}>
                <div className="animate-pulse space-y-3">
                    <div className="h-4 w-40 rounded" style={{ background: 'var(--ee-bg)' }} />
                    <div className="grid grid-cols-2 gap-3">
                        <div className="h-16 rounded-[16px]" style={{ background: 'var(--ee-bg)' }} />
                        <div className="h-16 rounded-[16px]" style={{ background: 'var(--ee-bg)' }} />
                    </div>
                </div>
            </div>
        )
    }

    // An unsupported crop is stated plainly rather than filled with a guess —
    // a wrong plant population is worse than none, because the farmer acts on it.
    if (!plan) {
        return (
            <div
                className="neu-surface rounded-[20px] p-5 sm:p-6"
                style={{ background: 'var(--ee-surface)' }}
            >
                <h3
                    className="text-base sm:text-lg font-black mb-2"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                >
                    Planting &amp; spacing
                </h3>
                <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                >
                    We don&apos;t have spacing agronomy for <strong>{crop}</strong> yet, so
                    no target population is offered. You can still plan the season and
                    enter your own spacing.
                </p>
            </div>
        )
    }

    return (
        <div
            className="neu-surface rounded-[20px] p-5 sm:p-6"
            style={{ background: 'var(--ee-surface)' }}
        >
            <h3
                className="text-base sm:text-lg font-black mb-4"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                <span
                    className="material-symbols-outlined align-middle mr-1.5"
                    style={{ fontSize: '1.15rem', color: 'var(--ee-primary)' }}
                >
                    grid_on
                </span>
                Planting &amp; spacing
            </h3>

            {/* The instruction, in field units. */}
            <div
                className="rounded-[16px] p-4 mb-4"
                style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)' }}
            >
                <p
                    className="text-[10px] font-bold uppercase opacity-80 mb-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                >
                    Space your plants
                </p>
                <p
                    className="text-xl sm:text-2xl font-black leading-tight mb-2"
                    style={{ fontFamily: 'var(--font-heading)' }}
                >
                    {formatSpacing(plan.row_spacing_cm, plan.in_row_spacing_cm)}
                </p>
                <p className="text-sm leading-relaxed opacity-95" style={{ fontFamily: 'var(--font-body)' }}>
                    {spacingCheckInstruction(plan.in_row_spacing_cm, persona) || plan.field_check}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <Stat
                    label="Target population"
                    value={`${formatPopulation(plan.target_population_per_ha)}`}
                    hint="plants per hectare"
                />
                <Stat
                    label="Planting depth"
                    value={`${plan.planting_depth_cm.min}–${plan.planting_depth_cm.max} cm`}
                />
                <Stat
                    label="Seed needed"
                    value={seedQuantityLabel(plan.seed_rate_kg_ha, plan.seed_required_kg, persona)}
                    hint={plan.seed_required_kg === null ? 'field area unknown' : undefined}
                />
                <Stat
                    label="Seeds per station"
                    value={String(plan.seeds_per_station)}
                    hint={plan.thin_at_stage ? `thin at ${plan.thin_at_stage}` : undefined}
                />
            </div>

            {/* Why — deterministic reasoning the farmer can interrogate. */}
            {plan.rationale.length > 0 && (
                <ul className="space-y-1.5 mb-3">
                    {plan.rationale.map((r, i) => (
                        <li
                            key={i}
                            className="text-sm leading-relaxed flex gap-2"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            <span style={{ color: 'var(--ee-muted)' }}>•</span>
                            <span>{r}</span>
                        </li>
                    ))}
                </ul>
            )}

            {plan.warnings.map((w, i) => (
                <p
                    key={i}
                    className="text-sm leading-relaxed rounded-[12px] p-3 mt-2 flex gap-2"
                    style={{
                        background: '#eab30818',
                        color: 'var(--ee-text)',
                        fontFamily: 'var(--font-body)',
                    }}
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

            {/* Advice that only applies to one way of planting. A smallholder
                gets none of the planter guidance, and a mechanised grower gets
                none of the string-line guidance — padding either screen with
                the other is what makes an app feel like it was not built for
                you. */}
            {[...establishmentEquipmentTips(persona), ...establishmentHandTips(persona)].map(
                (tip, i) => (
                    <p
                        key={i}
                        className="text-xs leading-relaxed rounded-[12px] p-3 mt-2 flex gap-2"
                        style={{
                            background: 'var(--ee-bg)',
                            color: 'var(--ee-text)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        <span
                            className="material-symbols-outlined shrink-0"
                            style={{ fontSize: '0.95rem', color: 'var(--ee-primary)', marginTop: '0.1rem' }}
                        >
                            tips_and_updates
                        </span>
                        <span>{tip}</span>
                    </p>
                )
            )}

            <p
                className="text-[11px] leading-relaxed mt-4 pt-3"
                style={{
                    color: 'var(--ee-muted)',
                    fontFamily: 'var(--font-body)',
                    borderTop: '1px solid var(--ee-bg)',
                }}
            >
                After emergence, run the Stand Check to confirm what you actually
                established — it&apos;s the one measurement that sets this season&apos;s
                ceiling, and it can&apos;t be taken later.
            </p>
        </div>
    )
}

export default EstablishmentCard
