'use client'

import { AlertTriangle, CheckCircle2, Eye } from 'lucide-react'

import { PortfolioPageHeader } from '@/components/portfolio/PortfolioPageHeader'
import { EmptyStateCard } from '@/components/portfolio/EmptyStateCard'
import { PageContainer } from '@/components/layout/PageContainer'
import { usePortfolioAggregate } from '@/hooks/usePortfolioAggregate'
import { useReconciliation } from '@/hooks/useReconciliation'
import { usePortfolioVerification } from '@/hooks/usePortfolioVerification'
import {
    flagStyle,
    formatTonnes,
    partitionByFlag,
    type GrowerReconciliation,
} from '@/lib/reconciliation-utils'
import {
    fieldSummaryHeadline,
    partitionFieldsByFlag,
    type FieldVerificationSummary,
} from '@/lib/verification-utils'

export default function PortfolioReportsPage() {
    const { data: aggregate } = usePortfolioAggregate()
    const tenantId = aggregate?.tenant?.id
    const { data, isLoading, error } = useReconciliation(tenantId)
    const verification = usePortfolioVerification(tenantId)

    return (
        <PageContainer variant="reading">
            <PortfolioPageHeader title="Reports" subtitle="Portfolio-level reporting and exports" />
            <div className="grid gap-6">
                <ContractPerformance data={data} isLoading={isLoading || !tenantId} error={error} />
                <InputVerification
                    data={verification.data}
                    isLoading={verification.isLoading || !tenantId}
                    error={verification.error}
                />
                <EmptyStateCard
                    title="Yield Forecast Reports"
                    description="Season yield projections aggregated across your contracted growers."
                    icon="analytics"
                />
                <EmptyStateCard
                    title="Sustainability Reports"
                    description="Input use, water balance and stewardship metrics for reporting."
                    icon="eco"
                />
            </div>
        </PageContainer>
    )
}

function InputVerification({
    data,
    isLoading,
    error,
}: {
    data: ReturnType<typeof usePortfolioVerification>['data']
    isLoading: boolean
    error: Error | undefined
}) {
    return (
        <section className="rounded-[24px] p-6 lg:p-8 shadow-[var(--shadow-neu)]" style={{ background: 'var(--ee-surface)' }}>
            <div className="mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: 'var(--ee-primary)' }}>verified</span>
                <h2 className="text-lg font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    Input verification
                </h2>
            </div>
            <p className="mb-5 text-sm" style={{ color: 'var(--ee-muted)' }}>
                Logged inputs cross-checked against the satellite canopy response — flagging inputs that show none.
            </p>

            {isLoading && <p className="text-sm" style={{ color: 'var(--ee-muted)' }}>Loading…</p>}
            {error && <p className="text-sm" style={{ color: '#c44' }}>Couldn’t load verification. Try again.</p>}

            {data && !isLoading && (
                <>
                    <div className="mb-6 grid grid-cols-3 gap-3">
                        <Stat label="Fields to check" value={String(data.fields_with_flagged)} tone="#c44" />
                        <Stat label="Flagged inputs" value={String(data.total_flagged_inputs)} tone="#b8860b" />
                        <Stat label="Inputs tracked" value={String(data.total_inputs)} tone="var(--ee-text)" />
                    </div>
                    <VerificationList fields={data.fields} />
                </>
            )}
        </section>
    )
}

function VerificationList({ fields }: { fields: FieldVerificationSummary[] }) {
    const { flagged } = partitionFieldsByFlag(fields)

    if (fields.length === 0) {
        return (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ee-muted)' }}>
                <Eye className="size-4" /> No inputs logged across the book yet — nothing to verify.
            </div>
        )
    }

    if (flagged.length === 0) {
        return (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ee-primary)' }}>
                <CheckCircle2 className="size-4" /> Every logged input shows a satellite response — nothing flagged.
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {flagged.map((f) => <VerificationRow key={f.field_id} f={f} />)}
        </div>
    )
}

function VerificationRow({ f }: { f: FieldVerificationSummary }) {
    return (
        <div className="rounded-[16px] px-4 py-3 shadow-[var(--shadow-neu-inset)]" style={{ background: 'var(--ee-bg)' }}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <AlertTriangle className="size-4" style={{ color: '#c44' }} />
                    <span className="truncate font-semibold" style={{ color: 'var(--ee-text)' }}>
                        {f.field_name || 'Unnamed field'}
                    </span>
                    {f.grower_name && (
                        <span className="truncate text-xs" style={{ color: 'var(--ee-muted)' }}>· {f.grower_name}</span>
                    )}
                </div>
                <span className="shrink-0 text-xs font-bold uppercase tracking-wide" style={{ color: '#c44' }}>
                    No response
                </span>
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--ee-muted)' }}>
                {fieldSummaryHeadline(f)}
            </div>
        </div>
    )
}

function ContractPerformance({
    data,
    isLoading,
    error,
}: {
    data: ReturnType<typeof useReconciliation>['data']
    isLoading: boolean
    error: Error | undefined
}) {
    return (
        <section className="rounded-[24px] p-6 lg:p-8 shadow-[var(--shadow-neu)]" style={{ background: 'var(--ee-surface)' }}>
            <div className="mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: 'var(--ee-primary)' }}>assessment</span>
                <h2 className="text-lg font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    Contract performance
                </h2>
            </div>
            <p className="mb-5 text-sm" style={{ color: 'var(--ee-muted)' }}>
                Delivered volume vs. satellite-implied production — surfacing possible side-marketing.
            </p>

            {isLoading && <p className="text-sm" style={{ color: 'var(--ee-muted)' }}>Loading…</p>}
            {error && <p className="text-sm" style={{ color: '#c44' }}>Couldn’t load reconciliation. Try again.</p>}

            {data && !isLoading && (
                <>
                    <div className="mb-6 grid grid-cols-3 gap-3">
                        <Stat label="Side-marketing risk" value={String(data.flagged_count)} tone="#c44" />
                        <Stat label="On watch" value={String(data.watch_count)} tone="#b8860b" />
                        <Stat label="Volume at risk" value={formatTonnes(data.total_side_marketing_tonnes)} tone="var(--ee-text)" />
                    </div>
                    <ReconList data={data} />
                </>
            )}
        </section>
    )
}

function ReconList({ data }: { data: NonNullable<ReturnType<typeof useReconciliation>['data']> }) {
    const { flagged, watch } = partitionByFlag(data.growers)

    if (flagged.length === 0 && watch.length === 0) {
        return (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ee-primary)' }}>
                <CheckCircle2 className="size-4" /> All growers delivering in line with production — nothing flagged.
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {flagged.map((g) => <Row key={g.grower_id} g={g} icon={<AlertTriangle className="size-4" style={{ color: '#c44' }} />} />)}
            {watch.map((g) => <Row key={g.grower_id} g={g} icon={<Eye className="size-4" style={{ color: '#b8860b' }} />} />)}
        </div>
    )
}

function Row({ g, icon }: { g: GrowerReconciliation; icon: React.ReactNode }) {
    const style = flagStyle(g.flag)
    return (
        <div className="rounded-[16px] px-4 py-3 shadow-[var(--shadow-neu-inset)]" style={{ background: 'var(--ee-bg)' }}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    {icon}
                    <span className="truncate font-semibold" style={{ color: 'var(--ee-text)' }}>
                        {g.grower_name || 'Unnamed grower'}
                    </span>
                </div>
                <span className="shrink-0 text-xs font-bold uppercase tracking-wide" style={{ color: style.color }}>
                    {style.label}
                </span>
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--ee-muted)' }}>
                Delivered {formatTonnes(g.delivered_volume_tonnes)} of {formatTonnes(g.expected_volume_tonnes)} expected
                {g.side_marketing_volume_tonnes > 0 && ` · ${formatTonnes(g.side_marketing_volume_tonnes)} unaccounted`}
            </div>
            {g.reasons[0] && (
                <div className="mt-1 text-xs" style={{ color: 'var(--ee-muted)' }}>{g.reasons[0]}</div>
            )}
        </div>
    )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
    return (
        <div className="rounded-[16px] px-3 py-3 text-center shadow-[var(--shadow-neu-inset)]" style={{ background: 'var(--ee-bg)' }}>
            <div className="text-xl font-black" style={{ color: tone, fontFamily: 'var(--font-heading)' }}>{value}</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--ee-muted)' }}>{label}</div>
        </div>
    )
}
