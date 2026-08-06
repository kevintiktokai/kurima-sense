'use client'

// IrrigationOutlook — the decision-support strip for the Climatology page:
// every planted field's irrigation verdict, worst-first, with expandable
// reasoning and one-tap "Add to plan" for actionable fields. This is what
// turns the weather page from information into decisions.

import React, { useState } from 'react'
import { applyIrrigationToPlan, useIrrigationOutlook } from '@/hooks/useIrrigation'
import { actionMeta, formatDuration, type IrrigationRecommendation } from '@/lib/irrigation-types'

function OutlookRow({ rec }: { rec: IrrigationRecommendation }) {
    const meta = actionMeta(rec.action)
    const [expanded, setExpanded] = useState(false)
    const [applyState, setApplyState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')

    const onApply = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setApplyState('pending')
        try {
            const result = await applyIrrigationToPlan(rec.field_id)
            setApplyState(result.applied ? 'done' : 'error')
        } catch {
            setApplyState('error')
        }
    }

    return (
        <div className="rounded-[16px] p-4" style={{ background: 'var(--ee-bg)' }}>
            <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 text-left">
                <span className="material-symbols-outlined flex-shrink-0" style={{ color: meta.color, fontSize: '22px' }}>
                    {meta.icon}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                        <span className="font-black text-sm truncate" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                            {rec.field_name}
                        </span>
                        <span className="text-[11px] font-bold flex-shrink-0" style={{ color: 'var(--ee-muted)' }}>
                            {rec.crop} · {rec.stage}
                        </span>
                    </span>
                    <span className="block text-xs font-bold mt-0.5 truncate" style={{ color: meta.color }}>
                        {meta.label}
                        {rec.recommended_mm > 0 && ` · ~${Math.round(rec.recommended_mm)} mm`}
                        {rec.duration_minutes ? ` · ${formatDuration(rec.duration_minutes)}` : ''}
                    </span>
                </span>
                <span className="material-symbols-outlined flex-shrink-0" style={{ color: 'var(--ee-muted)', fontSize: '18px' }}>
                    {expanded ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {expanded && (
                <div className="mt-3 pl-9">
                    <p className="text-xs font-bold mb-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>
                        {rec.headline}
                    </p>
                    <ul className="flex flex-col gap-1 mb-3">
                        {rec.reasoning.map((r, i) => (
                            <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                <span style={{ color: 'var(--ee-primary)' }}>•</span>{r}
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center gap-3">
                        {(rec.action === 'irrigate_now' || rec.action === 'irrigate_soon') && (
                            <button
                                onClick={onApply}
                                disabled={applyState === 'pending' || applyState === 'done'}
                                className="px-4 py-2 rounded-[12px] font-bold text-xs disabled:opacity-60"
                                style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)' }}
                            >
                                {applyState === 'done' ? '✓ In your plan'
                                    : applyState === 'pending' ? 'Adding…'
                                    : applyState === 'error' ? 'Retry add to plan'
                                    : 'Add to plan'}
                            </button>
                        )}
                        <span className="text-[11px] font-bold" style={{ color: 'var(--ee-muted)' }}>
                            Confidence: {rec.confidence_label}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function IrrigationOutlook() {
    const { recommendations, actionable, evaluatedFields, isLoading, error } = useIrrigationOutlook()

    return (
        <div className="rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 mb-6 neu-surface"
            style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
            <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined" style={{ color: 'var(--ee-primary)', fontSize: '22px' }}>water_drop</span>
                <h2 className="font-black text-lg sm:text-xl" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    Irrigation Decisions
                </h2>
            </div>
            <p className="text-xs sm:text-sm mb-4" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                {isLoading
                    ? 'Weighing forecast rain against crop water demand for each field…'
                    : actionable > 0
                        ? `${actionable} of ${evaluatedFields} field${evaluatedFields === 1 ? '' : 's'} need${actionable === 1 ? 's' : ''} water — decisions below combine this forecast with soil and crop stage.`
                        : evaluatedFields > 0
                            ? 'No field needs irrigation right now — verdicts below explain why.'
                            : 'Add a field with a crop and planting date to get irrigation decisions here.'}
            </p>

            {error && (
                <p className="text-sm font-bold" style={{ color: 'var(--ee-muted)' }}>
                    Couldn&apos;t load irrigation guidance right now.
                </p>
            )}
            {isLoading && (
                <div className="h-16 rounded-[16px] animate-pulse" style={{ background: 'var(--ee-bg)' }} />
            )}
            <div className="flex flex-col gap-2">
                {recommendations.map((rec) => <OutlookRow key={rec.field_id} rec={rec} />)}
            </div>
        </div>
    )
}
