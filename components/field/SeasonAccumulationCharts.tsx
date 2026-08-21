'use client'

/**
 * SeasonAccumulationCharts — two cumulative-curve cards for a field-detail page:
 * Accumulated Precipitation and Growing Degree-Days since planting (Depth Sprint
 * PR D frontend). Reuses the recharts/token/card treatment of the existing
 * KurimaScore trend chart. Owns its own data hook, so mounting it is purely
 * additive on the host page.
 *
 * Per-surface behaviour (see docs/season_charts_audit.md):
 *  - consumer: render NOTHING on error / missing-planting (silent absence beats
 *    a broken card on the primary user surface).
 *  - portfolio: a quiet retry card on error; a calm one-line note when the field
 *    has no planting date.
 */

import { useSWRConfig } from 'swr'
import {
    Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useSeasonAccumulations } from '@/hooks/useSeasonAccumulations'
import {
    monthTicks, formatTickDate, formatFullDate, formatMm, formatGdd, gddCaption,
    selectChartState, type SeasonAccumulations,
} from '@/lib/season-chart-utils'

import { API_BASE_URL } from '@/lib/api-base';

export interface SeasonAccumulationChartsProps {
    fieldId: string
    surface: 'consumer' | 'portfolio'
}

// ─── Card shell (matches the existing trend-chart card) ──────────────────────

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="p-6 lg:p-8" style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
            {children}
        </div>
    )
}

function ChartHeader({ title, stat, caption, icon, color }: {
    title: string; stat: string; caption?: string; icon: string; color: string
}) {
    return (
        <div className="flex items-start justify-between gap-4 mb-4">
            <div>
                <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color }}>{icon}</span>
                    {title}
                </h2>
                {caption && <p className="text-[11px] font-bold mt-0.5" style={{ color: 'var(--ee-muted)' }}>{caption}</p>}
            </div>
            <p className="text-xl font-black whitespace-nowrap" style={{ color, fontFamily: 'var(--font-heading)' }}>{stat}</p>
        </div>
    )
}

// ─── Tooltip (date + daily + cumulative), app tokens ─────────────────────────

// One component taking props, rather than a factory called during render.
//
// `const Tip = makeTooltip(...)` produced a NEW component type on every render,
// so Recharts saw a different `content` each time and remounted the tooltip
// instead of updating it — losing any state it held and re-running its effects
// on a surface the farmer is actively hovering.
interface SeasonTooltipProps {
    active?: boolean
    payload?: Array<{ payload: Record<string, number> }>
    label?: string
    dailyKey: 'precip_mm' | 'gdd'
    cumKey: 'precip_cumulative' | 'gdd_cumulative'
    unit: string
    fmt: (n: number) => string
}

function SeasonTooltip({ active, payload, label, dailyKey, cumKey, unit, fmt }: SeasonTooltipProps) {
    if (!active || !payload || !payload.length) return null
    const d = payload[0].payload
    return (
        <div style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 8px 32px rgba(45,58,48,0.08)', padding: '10px 12px', fontFamily: 'var(--font-body)' }}>
            <p style={{ fontWeight: 800, fontSize: 12, color: 'var(--ee-text)', margin: 0 }}>{formatFullDate(label || '')}</p>
            <p style={{ fontSize: 11, color: 'var(--ee-muted)', margin: '4px 0 0' }}>Day: {fmt(d[dailyKey])}{unit}</p>
            <p style={{ fontSize: 11, color: 'var(--ee-muted)', margin: '2px 0 0' }}>Cumulative: {fmt(d[cumKey])}{unit}</p>
        </div>
    )
}

const roundTenth = (n: number) => `${Math.round(n * 10) / 10}`
const roundWhole = (n: number) => `${Math.round(n)}`

// ─── The two charts ──────────────────────────────────────────────────────────

function PrecipChart({ data }: { data: SeasonAccumulations }) {
    const ticks = monthTicks(data.series)
    return (
        <Card>
            <ChartHeader title="Accumulated Rainfall" icon="water_drop" color="var(--ee-water)"
                stat={`${formatMm(data.total_precip_mm).replace(' mm', '')} mm`}
                caption={`Over ${data.days_elapsed} day${data.days_elapsed === 1 ? '' : 's'} since planting`} />
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                    <AreaChart data={data.series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="seasonPrecip" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#5C9EAD" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#5C9EAD" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DF" />
                        <XAxis dataKey="date" ticks={ticks} axisLine={false} tickLine={false}
                            tick={{ fill: '#8B9D8F', fontSize: 10, fontWeight: 700 }} tickFormatter={formatTickDate} tickMargin={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8B9D8F', fontSize: 10, fontWeight: 700 }} width={36} />
                        <Tooltip
                            content={<SeasonTooltip dailyKey="precip_mm" cumKey="precip_cumulative" unit=" mm" fmt={roundTenth} />}
                            cursor={{ stroke: '#8B9D8F', strokeWidth: 1 }} />
                        <Area type="monotone" dataKey="precip_cumulative" stroke="#5C9EAD" strokeWidth={3} fill="url(#seasonPrecip)" name="Cumulative rainfall" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}

function GddChart({ data }: { data: SeasonAccumulations }) {
    const ticks = monthTicks(data.series)
    return (
        <Card>
            <ChartHeader title="Growing Degree-Days" icon="device_thermostat" color="var(--ee-sun)"
                stat={formatGdd(data.total_gdd)} caption={gddCaption(data.gdd_base_c, data.gdd_cap_c)} />
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                    <AreaChart data={data.series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="seasonGdd" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#E8A365" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#E8A365" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DF" />
                        <XAxis dataKey="date" ticks={ticks} axisLine={false} tickLine={false}
                            tick={{ fill: '#8B9D8F', fontSize: 10, fontWeight: 700 }} tickFormatter={formatTickDate} tickMargin={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8B9D8F', fontSize: 10, fontWeight: 700 }} width={36} />
                        <Tooltip
                            content={<SeasonTooltip dailyKey="gdd" cumKey="gdd_cumulative" unit=" GDD" fmt={roundWhole} />}
                            cursor={{ stroke: '#8B9D8F', strokeWidth: 1 }} />
                        <Area type="monotone" dataKey="gdd_cumulative" stroke="#E8A365" strokeWidth={3} fill="url(#seasonGdd)" name="Cumulative GDD" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}

function ChartSkeleton() {
    return (
        <Card>
            <div className="animate-pulse space-y-4">
                <div className="flex justify-between">
                    <div className="h-4 w-40 rounded-full" style={{ background: 'var(--ee-bg)' }} />
                    <div className="h-4 w-16 rounded-full" style={{ background: 'var(--ee-bg)' }} />
                </div>
                <div className="h-48 rounded-[16px]" style={{ background: 'var(--ee-bg)' }} />
            </div>
        </Card>
    )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SeasonAccumulationCharts({ fieldId, surface }: SeasonAccumulationChartsProps) {
    const { data, isLoading, error } = useSeasonAccumulations(fieldId)
    const { mutate } = useSWRConfig()

    const state = selectChartState({
        isLoading,
        hasData: !!data,
        hasSeries: !!data?.series?.length,
        errorStatus: error?.status ?? null,
    })

    if (state === 'loading') {
        return <div className="space-y-5"><ChartSkeleton /><ChartSkeleton /></div>
    }

    if (state === 'missing-planting') {
        if (surface === 'consumer') return null
        return (
            <Card>
                <p className="text-sm font-bold" style={{ color: 'var(--ee-muted)' }}>
                    Add a planting date to see season weather accumulation.
                </p>
            </Card>
        )
    }

    if (state === 'error') {
        if (surface === 'consumer') return null
        return (
            <Card>
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold" style={{ color: 'var(--ee-muted)' }}>Couldn&apos;t load season weather.</p>
                    <button
                        onClick={() => mutate(`${API_BASE_URL}/field/${fieldId}/season-accumulations`)}
                        className="text-sm font-bold rounded-full px-4 py-1.5"
                        style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)' }}
                    >
                        Retry
                    </button>
                </div>
            </Card>
        )
    }

    // state === 'data'
    return (
        <div className="space-y-5">
            <PrecipChart data={data as SeasonAccumulations} />
            <GddChart data={data as SeasonAccumulations} />
        </div>
    )
}

export default SeasonAccumulationCharts
