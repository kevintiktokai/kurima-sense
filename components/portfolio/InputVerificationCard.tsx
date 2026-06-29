'use client'

import { useFieldVerification } from '@/hooks/useFieldVerification'
import { statusStyle, verificationHeadline } from '@/lib/verification-utils'

/**
 * Input verification card (Sprint 4) for the portfolio field detail: shows
 * whether each logged input produced a satellite canopy response. Self-contained
 * (own data hook); renders nothing while loading/erroring or when no inputs are
 * logged, so it never disrupts the surrounding layout.
 */
export function InputVerificationCard({ fieldId }: { fieldId: string }) {
    const { data, isLoading } = useFieldVerification(fieldId)

    if (isLoading || !data || data.n_inputs === 0) return null

    return (
        <div className="p-6 lg:p-8" style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
            <div className="mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: 'var(--ee-primary)' }}>fact_check</span>
                <h2 className="text-lg font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    Input verification
                </h2>
            </div>
            <p className="mb-4 text-sm" style={{ color: 'var(--ee-muted)' }}>
                {verificationHeadline(data)}
            </p>

            <div className="space-y-2">
                {data.inputs.map((inp, i) => {
                    const s = statusStyle(inp.status)
                    return (
                        <div key={i} className="rounded-[16px] px-4 py-3" style={{ background: 'var(--ee-bg)' }}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
                                    <span className="truncate font-semibold" style={{ color: 'var(--ee-text)' }}>
                                        {inp.input_type || 'Input'}
                                    </span>
                                    <span className="text-xs" style={{ color: 'var(--ee-muted)' }}>{inp.input_date}</span>
                                </div>
                                <span className="shrink-0 text-xs font-bold uppercase tracking-wide" style={{ color: s.color }}>
                                    {s.label}
                                </span>
                            </div>
                            {inp.response_delta != null && (
                                <div className="mt-1 text-xs" style={{ color: 'var(--ee-muted)' }}>
                                    NDVI {inp.ndvi_before ?? '—'} → {inp.ndvi_after ?? '—'} ({inp.response_delta >= 0 ? '+' : ''}{inp.response_delta})
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
