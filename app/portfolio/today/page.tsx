'use client'

/**
 * /portfolio/today — the institutional attention-allocation surface (MVP PR 3).
 *
 * One question, answerable in under ten seconds: "Of all my contracted fields,
 * which need my attention this week, and what should I do about them?"
 *
 * Single data source: GET /portfolio/aggregate via usePortfolioAggregate.
 * Renders calmly in all three data states — all-awaiting (demo tenant until
 * satellite backfill lands), mixed, and fully populated — plus loading,
 * error, and empty-tenant states.
 */

import { usePortfolioAggregate } from '@/hooks/usePortfolioAggregate'
import {
    criticalFieldCount,
    formatRelativeTime,
    selectScreenState,
} from '@/lib/portfolio-utils'
import { scoreToLabel } from '@/lib/field-state-types'
import { PageContainer } from '@/components/layout/PageContainer'
import { PortfolioPulse } from '@/components/portfolio/PortfolioPulse'
import { PriorityList } from '@/components/portfolio/PriorityList'

// ─── Loading / error / empty building blocks ────────────────────────────────

function SkeletonCard({ tall = false }: { tall?: boolean }) {
    return (
        <div
            className={`animate-pulse ${tall ? 'h-36' : 'h-28'}`}
            style={{ background: 'var(--ee-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-neu)' }}
        >
            <div className="p-5 space-y-3">
                <div className="h-3.5 rounded-full w-2/3" style={{ background: 'var(--ee-bg)' }} />
                <div className="h-3 rounded-full w-1/3" style={{ background: 'var(--ee-bg)' }} />
                <div className="h-3 rounded-full w-5/6" style={{ background: 'var(--ee-bg)' }} />
            </div>
        </div>
    )
}

function LoadingState() {
    return (
        <div className="space-y-4" aria-busy="true" aria-label="Loading portfolio">
            <SkeletonCard tall />
            {[0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
    )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            className="p-8 text-center"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}
        >
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-muted)' }}>cloud_off</span>
            <p className="font-black text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                Couldn&apos;t load your portfolio
            </p>
            <p className="text-sm mt-1 mb-5" style={{ color: 'var(--ee-muted)' }}>
                Check your connection and try again.
            </p>
            <button
                onClick={onRetry}
                className="px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                style={{ background: 'var(--ee-primary)', color: '#FFFFFF' }}
            >
                Retry
            </button>
        </div>
    )
}

function EmptyTenantState() {
    return (
        <div
            className="p-8 text-center"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}
        >
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-primary)' }}>grass</span>
            <p className="font-black text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                No fields yet
            </p>
            <p className="text-sm mt-1 max-w-sm mx-auto" style={{ color: 'var(--ee-muted)' }}>
                Fields will appear here, ranked by attention needed, once they are added to your portfolio.
            </p>
        </div>
    )
}

// ─── Banner ─────────────────────────────────────────────────────────────────

function AttentionBanner({ kind, count }: { kind: 'critical' | 'calm'; count: number }) {
    if (kind === 'critical') {
        const critical = scoreToLabel(10) // existing band mirror — not a new hex
        return (
            <div
                className="flex items-center gap-3 p-4 lg:p-5"
                style={{
                    background: 'var(--ee-surface)', borderRadius: '20px',
                    boxShadow: 'var(--shadow-neu)', borderLeft: `4px solid ${critical.color}`,
                }}
                role="status"
            >
                <span className="material-symbols-outlined flex-shrink-0" style={{ color: critical.color, fontSize: 22 }}>error</span>
                <p className="font-bold text-sm" style={{ color: 'var(--ee-text)' }}>
                    {count} field{count === 1 ? '' : 's'} need{count === 1 ? 's' : ''} urgent attention
                </p>
            </div>
        )
    }
    return (
        <div
            className="flex items-center gap-3 p-4 lg:p-5"
            style={{
                background: 'var(--ee-surface)', borderRadius: '20px',
                boxShadow: 'var(--shadow-neu)', borderLeft: '4px solid var(--ee-primary)',
            }}
            role="status"
        >
            <span className="material-symbols-outlined flex-shrink-0" style={{ color: 'var(--ee-primary)', fontSize: 22 }}>check_circle</span>
            <p className="font-bold text-sm" style={{ color: 'var(--ee-text)' }}>
                No critical issues across your portfolio today
            </p>
        </div>
    )
}

function AwaitingSyncCard({ count }: { count: number }) {
    return (
        <div
            className="flex items-start gap-3 p-4 lg:p-5"
            style={{
                background: 'var(--ee-surface)', borderRadius: '20px',
                boxShadow: 'var(--shadow-neu)', borderLeft: '4px solid var(--ee-water)',
            }}
            role="status"
        >
            <span className="material-symbols-outlined flex-shrink-0" style={{ color: 'var(--ee-water)', fontSize: 22 }}>satellite_alt</span>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ee-text)' }}>
                <span className="font-bold">Satellite observations are syncing for {count} fields.</span>{' '}
                <span style={{ color: 'var(--ee-muted)' }}>
                    Fields appear here with full health scoring as Sentinel-2 data arrives, typically within 24–48 hours.
                </span>
            </p>
        </div>
    )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PortfolioTodayPage() {
    const { data, isLoading, error, refresh } = usePortfolioAggregate()

    const state = data ? selectScreenState(data.summary) : null
    const criticalCount = data
        ? Math.max(criticalFieldCount(data.priorities), data.summary.score_distribution.critical)
        : 0
    const showCriticalBanner = data
        ? (data.summary.alerts_critical > 0 || data.summary.score_distribution.critical > 0)
        : false

    return (
        <PageContainer variant="reading">
            {/* Header */}
            <div className="mb-6 lg:mb-8">
                <h1
                    className="text-3xl lg:text-4xl font-black tracking-tight"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                >
                    Today
                </h1>
                {data ? (
                    <>
                        <p className="mt-1 font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            {data.tenant.name} — {data.summary.total_fields} fields, {data.summary.total_growers} growers, {data.summary.total_hectares} ha
                        </p>
                        <button
                            onClick={refresh}
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold rounded-full"
                            style={{ color: 'var(--ee-muted)' }}
                            title="Refresh"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
                            Updated {formatRelativeTime(data.generated_at)}
                        </button>
                    </>
                ) : (
                    <p className="mt-1 font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                        Fields requiring your attention this week
                    </p>
                )}
            </div>

            {isLoading && !data && <LoadingState />}
            {error && !data && <ErrorState onRetry={refresh} />}
            {data && state === 'empty' && <EmptyTenantState />}

            {data && state !== 'empty' && (
                <div className="space-y-5">
                    {/* Attention banner / awaiting sync card */}
                    {state === 'awaiting' ? (
                        <AwaitingSyncCard count={data.summary.fields_awaiting_data} />
                    ) : showCriticalBanner ? (
                        <AttentionBanner kind="critical" count={criticalCount} />
                    ) : (
                        <AttentionBanner kind="calm" count={0} />
                    )}

                    {/* Portfolio pulse */}
                    <PortfolioPulse summary={data.summary} />

                    {/* Priority list */}
                    <div>
                        <h2
                            className="text-xl font-black mb-3"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            Where to focus
                        </h2>
                        <PriorityList priorities={data.priorities} expandAwaiting={state === 'awaiting'} from={{ label: 'Today', href: '/portfolio/today' }} />
                    </div>

                    {/* Footer note */}
                    <p className="text-xs pt-1 pb-4 text-center" style={{ color: 'var(--ee-muted)' }}>
                        KurimaScore combines satellite, management, and environmental signals. Tap any field for full detail.
                    </p>
                </div>
            )}
        </PageContainer>
    )
}
