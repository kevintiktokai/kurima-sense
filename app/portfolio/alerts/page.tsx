'use client'

/**
 * /portfolio/alerts — the problems-only surface (MVP PR 7), the last real MVP
 * screen. Narrower and sharper than Today: two categories —
 *   1. Field health — fields at critical/high urgency (concern-first).
 *   2. Data — monitoring gaps: fields awaiting a first observation, or whose
 *      newest observation is stale (> STALE_OBSERVATION_DAYS old).
 * Category 2 is what makes Alerts non-redundant with Today. Everything derives
 * client-side from the shared usePortfolioAggregate request — no backend change.
 */

import { useMemo, useState } from 'react'
import { usePortfolioAggregate } from '@/hooks/usePortfolioAggregate'
import {
    deriveAlerts, alertCounts, isStale, selectScreenState, STALE_OBSERVATION_DAYS,
    type PortfolioPriority,
} from '@/lib/portfolio-utils'
import { PageContainer } from '@/components/layout/PageContainer'
import { FieldRowCard } from '@/components/portfolio/FieldRowCard'
import type { FromContext } from '@/lib/nav-links'

// Contextual back label for every field link on this screen.
const ALERTS_FROM: FromContext = { label: 'Alerts', href: '/portfolio/alerts' }

// ─── State cards (shared patterns) ───────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="animate-pulse h-28"
            style={{ background: 'var(--ee-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-neu)' }}>
            <div className="p-5 space-y-3">
                <div className="h-3.5 rounded-full w-2/3" style={{ background: 'var(--ee-bg)' }} />
                <div className="h-3 rounded-full w-1/3" style={{ background: 'var(--ee-bg)' }} />
            </div>
        </div>
    )
}

function StateCard({ icon, color, title, body, action }: { icon: string; color: string; title: string; body: string; action?: React.ReactNode }) {
    return (
        <div className="p-8 text-center" style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color }}>{icon}</span>
            <p className="font-black text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{title}</p>
            <p className="text-sm mt-1 mb-5 max-w-sm mx-auto" style={{ color: 'var(--ee-muted)' }}>{body}</p>
            {action}
        </div>
    )
}

// ─── Data subgroup (collapses when long, like Today's stable group) ──────────

function staleMeta(p: PortfolioPriority): string {
    return p.days_since_observation != null
        ? `Last observed ${p.days_since_observation}d ago`
        : 'Observation age unknown'
}

function DataSubgroup({
    label, rows, suffixFor,
}: {
    label: string
    rows: PortfolioPriority[]
    suffixFor: (p: PortfolioPriority) => string
}) {
    const COLLAPSE_AT = 5
    const [expanded, setExpanded] = useState(false)
    if (rows.length === 0) return null
    const shown = expanded ? rows : rows.slice(0, COLLAPSE_AT)
    const hidden = rows.length - shown.length

    return (
        <div>
            <div className="flex items-center gap-3 mb-2.5 px-1">
                <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--ee-muted)' }}>
                    {label}
                </h3>
                <div className="flex-1 h-px" style={{ background: 'var(--ee-bg-border)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--ee-muted)' }}>{rows.length}</span>
            </div>
            <div className="space-y-3">
                {shown.map((p) => <FieldRowCard key={p.field_id} priority={p} variant="roster" metaSuffix={suffixFor(p)} from={ALERTS_FROM} />)}
                {hidden > 0 && (
                    <button
                        onClick={() => setExpanded(true)}
                        className="w-full p-3 text-sm font-bold flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01]"
                        style={{ background: 'var(--ee-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-neu)', color: 'var(--ee-muted)' }}
                    >
                        Show {hidden} more
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioAlertsPage() {
    const { data, isLoading, error, refresh } = usePortfolioAggregate()

    const derived = useMemo(() => deriveAlerts(data?.priorities ?? []), [data])
    const counts = useMemo(() => alertCounts(derived), [derived])

    const state = data ? selectScreenState(data.summary) : null
    const total = data?.summary.total_fields ?? 0

    return (
        <PageContainer variant="reading">
            {/* Header */}
            <div className="mb-6 lg:mb-8">
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    Alerts
                </h1>
                <p className="mt-1 font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                    {data
                        ? (counts.total === 0
                            ? `All clear across ${total} field${total === 1 ? '' : 's'}`
                            : `${counts.health} field health · ${counts.data} data`)
                        : 'What needs attention right now'}
                </p>
            </div>

            {isLoading && !data && (
                <div className="space-y-3" aria-busy="true">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
            )}

            {error && !data && (
                <StateCard icon="cloud_off" color="var(--ee-muted)" title="Couldn't load your alerts" body="Check your connection and try again."
                    action={
                        <button onClick={refresh}
                            className="px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                            style={{ background: 'var(--ee-primary)', color: '#FFFFFF' }}>Retry</button>
                    } />
            )}

            {data && state === 'empty' && (
                <StateCard icon="grass" color="var(--ee-primary)" title="No fields yet"
                    body="Alerts will appear here once fields are added to your portfolio." />
            )}

            {/* All-clear — a good outcome, intentionally framed */}
            {data && state !== 'empty' && counts.total === 0 && (
                <StateCard icon="check_circle" color="var(--ee-primary)" title="No active alerts"
                    body={`${total} field${total === 1 ? '' : 's'} monitored, all reporting within expected ranges.`} />
            )}

            {/* Sections */}
            {data && state !== 'empty' && counts.total > 0 && (
                <div className="space-y-7">
                    {derived.health.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                    Field health
                                </h2>
                                <span className="text-sm font-bold" style={{ color: 'var(--ee-muted)' }}>{derived.health.length}</span>
                            </div>
                            <div className="space-y-3">
                                {derived.health.map((p) => (
                                    <FieldRowCard
                                        key={p.field_id}
                                        priority={p}
                                        variant="priority"
                                        metaSuffix={isStale(p) ? `last observed ${p.days_since_observation ?? '?'}d ago` : undefined}
                                        from={ALERTS_FROM}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {counts.data > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                    Data
                                </h2>
                                <span className="text-sm font-bold" style={{ color: 'var(--ee-muted)' }}>{counts.data}</span>
                            </div>
                            <div className="space-y-5">
                                <DataSubgroup
                                    label={`Awaiting first observations (${derived.awaiting.length})`}
                                    rows={derived.awaiting}
                                    suffixFor={() => 'No satellite data yet'}
                                />
                                <DataSubgroup
                                    label={`Stale observations (${derived.stale.length})`}
                                    rows={derived.stale}
                                    suffixFor={staleMeta}
                                />
                            </div>
                        </section>
                    )}

                    <p className="text-xs pt-1 pb-4 text-center" style={{ color: 'var(--ee-muted)' }}>
                        Observations are considered stale after {STALE_OBSERVATION_DAYS} days. Tap any field for full detail.
                    </p>
                </div>
            )}
        </PageContainer>
    )
}
