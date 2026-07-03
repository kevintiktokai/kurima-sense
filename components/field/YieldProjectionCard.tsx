'use client'

/**
 * YieldProjectionCard — on-demand AI yield projection for a field.
 *
 * Shared across surfaces (consumer + institutional). Generation is explicit
 * (button) because the backend call is LLM-assisted and rate-limited
 * (15/minute); the response is client-cached by services/api for 10 minutes,
 * so re-opening the field is instant. Renders projected yield vs potential,
 * confidence, and the model's next actions.
 */

import { useState } from 'react'
import { api } from '@/services/api'

interface YieldResult {
    projected_yield?: number | string
    yield_potential?: number | string
    confidence_score?: number
    current_stage?: string
    days_to_harvest?: number
    progress_percent?: number
    next_actions?: string[]
    pest_alert?: string
    methodology?: string
}

export function YieldProjectionCard({ fieldId, cropLabel }: { fieldId: string; cropLabel?: string }) {
    const [result, setResult] = useState<YieldResult | null>(null)
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const generate = async () => {
        setPending(true)
        setError(null)
        try {
            const data = await api.generateYieldProjection(fieldId)
            if (!data) throw new Error('Projection unavailable — try again shortly')
            setResult(data as YieldResult)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Projection failed')
        } finally {
            setPending(false)
        }
    }

    const num = (v: number | string | undefined) => {
        const n = typeof v === 'string' ? parseFloat(v) : v
        return n != null && !Number.isNaN(n) ? n.toFixed(1) : null
    }

    return (
        <div className="p-6 lg:p-8"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
            <div className="flex items-center justify-between gap-3 mb-1">
                <h2 className="text-lg font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    Yield Projection
                </h2>
                {result && (
                    <button onClick={generate} disabled={pending}
                        className="text-xs font-bold px-3 py-1.5 rounded-full disabled:opacity-50"
                        style={{ background: 'var(--ee-bg)', color: 'var(--ee-primary)' }}>
                        {pending ? 'Updating…' : 'Refresh'}
                    </button>
                )}
            </div>

            {!result && (
                <div className="pt-2">
                    <p className="text-sm mb-4" style={{ color: 'var(--ee-muted)' }}>
                        Model-based estimate combining {cropLabel ? `${cropLabel} ` : ''}variety potential,
                        growth stage, satellite health and season conditions.
                    </p>
                    {error && <p className="text-sm font-bold mb-3" style={{ color: '#dc2626' }}>{error}</p>}
                    <button onClick={generate} disabled={pending}
                        className="flex items-center gap-2 px-5 py-3 rounded-full font-black text-sm disabled:opacity-60 hover:scale-105 transition-transform"
                        style={{ background: 'var(--ee-primary)', color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}>
                        <span className={`material-symbols-outlined ${pending ? 'animate-spin' : ''}`} style={{ fontSize: 18 }}>
                            {pending ? 'progress_activity' : 'insights'}
                        </span>
                        {pending ? 'Analysing…' : 'Generate projection'}
                    </button>
                </div>
            )}

            {result && (
                <div className="pt-3 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ee-muted)' }}>Projected</p>
                            <p className="text-2xl font-black" style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-heading)' }}>
                                {num(result.projected_yield) ?? '—'}<span className="text-sm font-bold" style={{ color: 'var(--ee-muted)' }}> t/ha</span>
                            </p>
                        </div>
                        <div className="p-4 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ee-muted)' }}>Potential</p>
                            <p className="text-2xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                {num(result.yield_potential) ?? '—'}<span className="text-sm font-bold" style={{ color: 'var(--ee-muted)' }}> t/ha</span>
                            </p>
                        </div>
                    </div>

                    {(result.current_stage || result.days_to_harvest != null || result.confidence_score != null) && (
                        <p className="text-xs font-bold" style={{ color: 'var(--ee-muted)' }}>
                            {[
                                result.current_stage ? result.current_stage.split(' - ')[0] : null,
                                result.days_to_harvest != null ? `~${result.days_to_harvest}d to harvest` : null,
                                result.confidence_score != null ? `confidence ${Math.round((result.confidence_score <= 1 ? result.confidence_score * 100 : result.confidence_score))}%` : null,
                            ].filter(Boolean).join(' · ')}
                        </p>
                    )}

                    {result.next_actions && result.next_actions.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--ee-muted)' }}>
                                Recommended next
                            </p>
                            <ul className="space-y-1.5">
                                {result.next_actions.slice(0, 4).map((a, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm leading-snug" style={{ color: 'var(--ee-text)' }}>
                                        <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 15, color: 'var(--ee-primary)', marginTop: 2 }}>
                                            arrow_forward
                                        </span>
                                        {a}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <p className="text-[11px]" style={{ color: 'var(--ee-muted)' }}>
                        Estimates depend on weather, pests and management — verify against field scouting.
                    </p>
                </div>
            )}
        </div>
    )
}
