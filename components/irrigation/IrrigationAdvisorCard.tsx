'use client'

// IrrigationAdvisorCard — the explainable irrigation recommendation for one
// field. Used on the Plan page (under the crop plan) and reusable on field
// detail. Shows the verdict, water numbers, a root-zone gauge, the reasoning
// chain (expandable) and a one-tap "Add to plan".

import React, { useState } from 'react'
import { applyIrrigationToPlan, useFieldIrrigation } from '@/hooks/useIrrigation'
import { actionMeta, formatDuration, rootZoneFullness } from '@/lib/irrigation-types'

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-3 rounded-[14px] text-center" style={{ background: 'var(--ee-bg)' }}>
            <p className="text-lg font-black leading-tight" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                {value}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--ee-muted)' }}>
                {label}
            </p>
        </div>
    )
}

export default function IrrigationAdvisorCard({ fieldId, fieldName }: {
    fieldId: string | null | undefined
    fieldName?: string
}) {
    const { available, unavailableReason, recommendation, isLoading, error, refresh } = useFieldIrrigation(fieldId)
    const [showReasoning, setShowReasoning] = useState(false)
    const [applyState, setApplyState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')

    if (!fieldId) return null

    const shell = (children: React.ReactNode) => (
        <div className="rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 neu-surface"
            style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
            <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined" style={{ color: 'var(--ee-primary)', fontSize: '20px' }}>water_drop</span>
                <h3 className="font-black text-base sm:text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    Irrigation Advisor
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)' }}>
                    AI
                </span>
            </div>
            {children}
        </div>
    )

    if (isLoading) {
        return shell(<p className="text-sm font-bold animate-pulse" style={{ color: 'var(--ee-muted)' }}>
            Analysing weather, soil and crop water demand…
        </p>)
    }
    if (error) {
        return shell(
            <p className="text-sm font-bold" style={{ color: 'var(--ee-muted)' }}>
                Couldn&apos;t load irrigation guidance right now.{' '}
                <button onClick={refresh} className="underline" style={{ color: 'var(--ee-primary)' }}>Retry</button>
            </p>,
        )
    }
    if (!available || !recommendation) {
        return shell(<p className="text-sm font-bold" style={{ color: 'var(--ee-muted)' }}>
            {unavailableReason || 'Add a crop and planting date to unlock irrigation guidance.'}
        </p>)
    }

    const rec = recommendation
    const meta = actionMeta(rec.action)
    const fullness = rootZoneFullness(rec)

    const onApply = async () => {
        setApplyState('pending')
        try {
            const result = await applyIrrigationToPlan(rec.field_id)
            setApplyState(result.applied ? 'done' : 'error')
        } catch {
            setApplyState('error')
        }
    }

    return shell(
        <div>
            {/* Verdict */}
            <div className="flex items-start gap-3 mb-4">
                <span className="material-symbols-outlined mt-0.5" style={{ color: meta.color, fontSize: '26px' }}>
                    {meta.icon}
                </span>
                <div className="min-w-0">
                    <p className="font-black text-sm uppercase tracking-wide" style={{ color: meta.color, fontFamily: 'var(--font-heading)' }}>
                        {meta.label}
                    </p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>
                        {rec.headline}
                    </p>
                </div>
            </div>

            {/* Root-zone water gauge */}
            <div className="mb-4">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ee-muted)' }}>
                    <span>Root-zone water</span>
                    <span>{Math.round(fullness * 100)}% full</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}>
                    <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(4, fullness * 100)}%`, background: fullness < 0.5 ? meta.color : 'var(--ee-primary)' }} />
                </div>
            </div>

            {/* Numbers */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                <Stat label="Deficit" value={`${Math.round(rec.water_deficit_mm)} mm`} />
                {rec.recommended_mm > 0
                    ? <Stat label="Apply" value={`${Math.round(rec.recommended_mm)} mm`} />
                    : <Stat label="Rain 3d" value={`${Math.round(rec.expected_rain_mm_3d)} mm`} />}
                {rec.duration_minutes
                    ? <Stat label={rec.method.replace('_', ' ')} value={formatDuration(rec.duration_minutes)} />
                    : <Stat label="Crop use" value={`${rec.etc_mm_per_day.toFixed(1)} mm/d`} />}
            </div>

            {/* Reasoning (the "why") */}
            <button
                onClick={() => setShowReasoning((v) => !v)}
                className="flex items-center gap-1 text-xs font-bold mb-2"
                style={{ color: 'var(--ee-primary)' }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {showReasoning ? 'expand_less' : 'expand_more'}
                </span>
                Why this recommendation · confidence {rec.confidence_label}
            </button>
            {showReasoning && (
                <ul className="mb-3 flex flex-col gap-1.5">
                    {rec.reasoning.map((r, i) => (
                        <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            <span style={{ color: 'var(--ee-primary)' }}>•</span>{r}
                        </li>
                    ))}
                </ul>
            )}

            {/* Action */}
            {(rec.action === 'irrigate_now' || rec.action === 'irrigate_soon') && (
                <button
                    onClick={onApply}
                    disabled={applyState === 'pending' || applyState === 'done'}
                    className="w-full py-3 rounded-[14px] font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'var(--ee-primary)', color: '#fff', fontFamily: 'var(--font-body)' }}
                >
                    {applyState === 'done' ? '✓ Added to your plan'
                        : applyState === 'pending' ? 'Adding…'
                        : applyState === 'error' ? 'Could not add — tap to retry'
                        : `Add to plan${fieldName ? ` for ${fieldName}` : ''}`}
                </button>
            )}
            {rec.next_review_date && rec.action !== 'irrigate_now' && (
                <p className="text-[11px] font-bold mt-2 text-center" style={{ color: 'var(--ee-muted)' }}>
                    Next check: {rec.next_review_date}
                </p>
            )}
        </div>,
    )
}
