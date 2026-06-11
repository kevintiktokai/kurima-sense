'use client'

/**
 * /portfolio/fields/[id] — institutional field detail (MVP PR 3, Step E
 * Option 2).
 *
 * A focused drill-down from the Today screen. The consumer field page is
 * monolithic (scouting, exports, AI chat — see docs/portfolio_today_audit.md),
 * so rather than extracting it this route reuses the same data plumbing
 * directly: `useFieldState` (GET /field/{id}/state — institutional tenant
 * access is authorized by the backend aggregator) and the same recharts
 * KurimaScore trend pattern. Scope is deliberate: grower context, score +
 * band, trend, current indices, alerts, recommended action. No Plan tab, no
 * AI advisory, no scouting/export.
 *
 * Grower name/district come from the portfolio aggregate (the field-state
 * payload has no grower fields — documented gap, no backend change). Inherits
 * the portfolio layout's RoleGuard + shell.
 */

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
    Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useFieldState } from '@/hooks/useFieldState'
import { usePortfolioAggregate } from '@/hooks/usePortfolioAggregate'
import { humanizeCrop, stripDemoPrefix } from '@/lib/portfolio-utils'

function BackLink() {
    return (
        <Link
            href="/portfolio/today"
            className="inline-flex items-center gap-1.5 text-sm font-bold mb-5 rounded-full"
            style={{ color: 'var(--ee-muted)' }}
        >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Back to Today
        </Link>
    )
}

export default function InstitutionalFieldDetailPage() {
    const params = useParams()
    const fieldId = params.id as string

    const { fieldState: fs, isLoading, error, refresh } = useFieldState(fieldId)
    // Grower context from the portfolio aggregate (SWR-cached from the Today
    // screen; fetched fresh on a deep link).
    const { data: portfolio } = usePortfolioAggregate()
    const priority = portfolio?.priorities.find((p) => p.field_id === fieldId)

    if (isLoading || (!fs && !error)) {
        return (
            <div className="max-w-[800px] mx-auto" aria-busy="true">
                <BackLink />
                <div className="space-y-4">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="animate-pulse h-36"
                            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }} />
                    ))}
                </div>
            </div>
        )
    }

    if (error || !fs) {
        return (
            <div className="max-w-[800px] mx-auto">
                <BackLink />
                <div className="p-8 text-center"
                    style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
                    <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-muted)' }}>cloud_off</span>
                    <p className="font-black text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        Couldn&apos;t load this field
                    </p>
                    <p className="text-sm mt-1 mb-5" style={{ color: 'var(--ee-muted)' }}>
                        {error?.message === 'You do not have access to this field'
                            ? 'This field is not part of your portfolio.'
                            : 'Check your connection and try again.'}
                    </p>
                    <button
                        onClick={() => refresh()}
                        className="px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                        style={{ background: 'var(--ee-primary)', color: '#FFFFFF' }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    const ks = fs.kurima_score
    const awaiting = fs.indices?.current?.observation_quality === 'none'
    const fieldName = stripDemoPrefix(fs.field?.name || 'Field')
    const cropLabel = humanizeCrop(fs.field?.crop_type || '')
    const chartData = (fs.indices?.trend_30d || [])
        .filter((p) => p.kurima_score != null)
        .map((p) => ({ date: p.date, kurima_score: p.kurima_score }))

    const metaLine = [
        priority?.district,
        cropLabel || null,
        fs.field?.area_ha ? `${fs.field.area_ha} ha` : null,
        fs.field?.variety_code || null,
    ].filter(Boolean).join(' · ')

    return (
        <div className="max-w-[800px] mx-auto pb-8">
            <BackLink />

            {/* Grower context header — an offtaker thinks in growers, not field IDs */}
            <div className="mb-6">
                <h1
                    className="text-2xl lg:text-3xl font-black tracking-tight"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                >
                    {priority?.grower_name || fieldName}
                </h1>
                <p className="mt-1 font-medium" style={{ color: 'var(--ee-muted)' }}>
                    {priority?.grower_name ? `${fieldName} · ` : ''}{metaLine}
                </p>
            </div>

            <div className="space-y-5">
                {/* Score card */}
                <div className="p-6 lg:p-8"
                    style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
                    {awaiting ? (
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined flex-shrink-0" style={{ color: 'var(--ee-water)', fontSize: 24 }}>satellite_alt</span>
                            <div>
                                <p className="font-black text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                    Awaiting first satellite observation
                                </p>
                                <p className="text-sm mt-1" style={{ color: 'var(--ee-muted)' }}>
                                    This field will receive full KurimaScore health scoring as Sentinel-2 data arrives, typically within 24–48 hours.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ee-muted)' }}>
                                        KurimaScore
                                    </p>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-5xl font-black leading-none"
                                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                            {ks.score}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                                            style={{ background: `${ks.color}1A`, color: ks.color }}>
                                            {ks.label}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-right" style={{ color: 'var(--ee-muted)' }}>
                                    Confidence {ks.confidence_pct}%<br />
                                    Last pass {fs.meta?.as_of_satellite_pass || '—'}
                                </p>
                            </div>

                            {/* Current snapshot */}
                            <div className="grid grid-cols-3 gap-3 mt-6">
                                <div className="p-4 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ee-muted)' }}>NDVI</p>
                                    <p className="text-xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                        {fs.indices?.current?.ndvi != null ? fs.indices.current.ndvi.toFixed(2) : '—'}
                                    </p>
                                    {fs.indices?.current?.ndvi_label && (
                                        <p className="text-[10px] font-bold mt-0.5" style={{ color: fs.indices.current.ndvi_color || 'var(--ee-muted)' }}>
                                            {fs.indices.current.ndvi_label}
                                        </p>
                                    )}
                                </div>
                                <div className="p-4 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ee-muted)' }}>Planted</p>
                                    <p className="text-xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                        {fs.season?.days_since_planted != null ? `${fs.season.days_since_planted}d` : '—'}
                                    </p>
                                    {fs.season?.current_stage && (
                                        <p className="text-[10px] font-bold mt-0.5 capitalize" style={{ color: 'var(--ee-muted)' }}>
                                            {fs.season.current_stage.replace(/_/g, ' ')}
                                        </p>
                                    )}
                                </div>
                                <div className="p-4 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ee-muted)' }}>Observed</p>
                                    <p className="text-xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                        {fs.indices?.current?.as_of_date
                                            ? new Date(fs.indices.current.as_of_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                            : '—'}
                                    </p>
                                    <p className="text-[10px] font-bold mt-0.5 capitalize" style={{ color: 'var(--ee-muted)' }}>
                                        {fs.indices?.current?.observation_quality}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Trend chart */}
                {chartData.length > 0 && (
                    <div className="p-6 lg:p-8"
                        style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                Health Trend
                            </h2>
                            <p className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                                style={{ color: 'var(--ee-muted)', background: 'var(--ee-bg)' }}>
                                KurimaScore (0–100)
                            </p>
                        </div>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorKurimaInst" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0fb885" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#0fb885" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DF" />
                                    <XAxis
                                        dataKey="date" axisLine={false} tickLine={false}
                                        tick={{ fill: '#8B9D8F', fontSize: 10, fontWeight: 700 }} tickMargin={10}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    />
                                    <YAxis
                                        axisLine={false} tickLine={false} domain={[0, 100]}
                                        tick={{ fill: '#8B9D8F', fontSize: 10, fontWeight: 700 }}
                                    />
                                    <ReferenceArea y1={70} y2={100} fill="#0fb885" fillOpacity={0.06} />
                                    <ReferenceArea y1={55} y2={70} fill="#EAB308" fillOpacity={0.06} />
                                    <ReferenceArea y1={0} y2={55} fill="#dc2626" fillOpacity={0.05} />
                                    <ReferenceLine y={70} stroke="#0fb885" strokeDasharray="4 4" strokeOpacity={0.4} />
                                    <ReferenceLine y={55} stroke="#EAB308" strokeDasharray="4 4" strokeOpacity={0.4} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '16px', border: 'none',
                                            boxShadow: '0 8px 32px rgba(45, 58, 48, 0.08)',
                                            background: '#FFFFFF', color: '#2D3A30', fontFamily: 'var(--font-body)',
                                        }}
                                        cursor={{ stroke: '#8B9D8F', strokeWidth: 1 }}
                                        labelFormatter={(val) => new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    />
                                    <Area type="monotone" dataKey="kurima_score" stroke="#0fb885" strokeWidth={3}
                                        fillOpacity={1} fill="url(#colorKurimaInst)" name="KurimaScore" connectNulls />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Concerns + recommended action */}
                {!awaiting && (ks.primary_driver || ks.recommended_action || fs.alerts.length > 0) && (
                    <div className="p-6 lg:p-8"
                        style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
                        <h2 className="text-lg font-black mb-4" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                            What needs attention
                        </h2>

                        {fs.alerts.length > 0 && (
                            <div className="space-y-3 mb-5">
                                {fs.alerts.map((a, i) => (
                                    <div key={i} className="flex items-start gap-3 p-4 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                                        <span
                                            className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                                            style={{
                                                background: a.severity === 'high' ? 'rgba(220,38,38,0.10)' : 'rgba(232,163,101,0.15)',
                                                color: a.severity === 'high' ? '#dc2626' : 'var(--ee-sun)',
                                            }}
                                        >
                                            {a.severity}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm" style={{ color: 'var(--ee-text)' }}>{a.headline}</p>
                                            {a.recommended_action && (
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--ee-muted)' }}>{a.recommended_action}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {(ks.primary_driver || ks.likely_cause) && (
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--ee-text)' }}>
                                {[ks.primary_driver, ks.likely_cause].filter(Boolean).join(' ')}
                            </p>
                        )}
                        {ks.recommended_action && (
                            <p className="text-sm font-bold mt-2 flex items-start gap-1 leading-snug" style={{ color: 'var(--ee-text)' }}>
                                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 16, color: 'var(--ee-primary)', marginTop: 1 }}>
                                    arrow_forward
                                </span>
                                {ks.recommended_action}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
