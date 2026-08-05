'use client'

// Season-over-season comparison for a field.
//
// Every season is plotted against **days after its own planting date**, not
// calendar dates. That axis is the whole point: two crops planted three weeks
// apart are at completely different growth stages on any given day, so a
// calendar chart compares a six-leaf crop with a tasselling one and calls the
// difference performance. Crop age is the only axis on which two seasons are
// the same thing.
//
// The card renders nothing until there are two observed seasons to compare —
// one season is a chart of itself, which the in-season KurimaScore trend
// already covers.

import React from 'react'
import {
    CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

import { useSeasonHistory } from '@/hooks/useSeasons'
import {
    buildChartRows, buildSeries, formatYield, hasComparableHistory,
    seriesKey, trendStyle,
} from '@/lib/season-history-utils'
import { formatPopulation } from '@/lib/planning-utils'

interface Props {
    fieldId: string
}

export function SeasonHistoryCard({ fieldId }: Props) {
    const { history, isLoading, error } = useSeasonHistory(fieldId)

    // Silent absence beats a broken or empty card on the farmer's main surface.
    if (isLoading || error) return null
    if (!hasComparableHistory(history)) return null

    const series = buildSeries(history)
    const rows = buildChartRows(history)
    const trend = trendStyle(history?.trend)
    const seasons = history?.seasons ?? []

    return (
        <div
            className="lg:col-span-12 p-6 lg:p-8"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}
        >
            <div className="flex items-start justify-between gap-4 mb-1">
                <h2
                    className="text-lg font-black flex items-center gap-2"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                >
                    <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 22, color: 'var(--ee-primary)' }}
                    >
                        stacked_line_chart
                    </span>
                    Season by season
                </h2>
                <span
                    className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1"
                    style={{ color: trend.color, background: `${trend.color}1a`, fontFamily: 'var(--font-body)' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        {trend.icon}
                    </span>
                    {trend.label}
                </span>
            </div>
            <p
                className="text-[11px] font-bold mb-5"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                Lined up by crop age, so seasons planted on different dates can be compared
            </p>

            <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                    <LineChart data={rows} margin={{ top: 5, right: 12, left: -18, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DF" />
                        <XAxis
                            dataKey="day"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            tick={{ fontSize: 10, fill: 'var(--ee-muted)' }}
                            tickLine={false}
                            axisLine={false}
                            label={{
                                value: 'Days after planting',
                                position: 'insideBottom',
                                offset: -2,
                                fontSize: 10,
                                fill: 'var(--ee-muted)',
                            }}
                        />
                        <YAxis
                            domain={[0, 1]}
                            tick={{ fontSize: 10, fill: 'var(--ee-muted)' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'var(--ee-surface)',
                                border: 'none',
                                borderRadius: 12,
                                boxShadow: 'var(--shadow-neu)',
                                fontSize: 12,
                            }}
                            labelFormatter={(d) => `Day ${d} after planting`}
                            formatter={(value, name) => [
                                typeof value === 'number' ? value.toFixed(2) : '—',
                                name,
                            ]}
                        />
                        {series.map((s) => (
                            <Line
                                key={s.seasonId}
                                type="monotone"
                                dataKey={seriesKey(s.seasonId)}
                                name={s.label}
                                stroke={s.color}
                                strokeWidth={s.confident ? 2.5 : 1.5}
                                // A season whose peak we can't trust is drawn
                                // dashed, so the chart doesn't imply more
                                // certainty than the observations support.
                                strokeDasharray={s.confident ? undefined : '4 3'}
                                dot={false}
                                connectNulls={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Legend + the facts worth comparing, per season. */}
            <div className="mt-5 space-y-2">
                {seasons.slice(0, series.length).map((s, i) => (
                    <div
                        key={s.season_id}
                        className="flex items-center justify-between gap-3 text-sm"
                        style={{ fontFamily: 'var(--font-body)' }}
                    >
                        <span className="flex items-center gap-2 min-w-0">
                            <span
                                className="w-3 h-0.5 shrink-0 rounded"
                                style={{ background: series[i].color }}
                            />
                            <span className="font-bold truncate" style={{ color: 'var(--ee-text)' }}>
                                {series[i].label}
                            </span>
                            <span className="text-xs truncate" style={{ color: 'var(--ee-muted)' }}>
                                {s.crop_type}
                                {s.variety ? ` · ${s.variety}` : ''}
                            </span>
                        </span>
                        <span
                            className="text-xs whitespace-nowrap"
                            style={{ color: 'var(--ee-muted)' }}
                        >
                            {s.yield_tonnes_per_ha !== null && (
                                <strong style={{ color: 'var(--ee-text)' }}>
                                    {formatYield(s.yield_tonnes_per_ha)}
                                </strong>
                            )}
                            {s.established_population_per_ha !== null && (
                                <> · {formatPopulation(s.established_population_per_ha)}/ha</>
                            )}
                            {s.peak_ndvi !== null && <> · peak {s.peak_ndvi}</>}
                        </span>
                    </div>
                ))}
            </div>

            {/* Plain-language deltas — the part a farmer can act on. */}
            {history && history.comparisons.length > 0 && (
                <div
                    className="mt-5 rounded-[16px] p-4"
                    style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
                >
                    <p
                        className="text-[10px] font-bold uppercase mb-2"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        Versus last season
                    </p>
                    <ul className="space-y-1.5">
                        {history.comparisons.map((c, i) => (
                            <li
                                key={i}
                                className="text-sm leading-relaxed flex gap-2"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                            >
                                <span style={{ color: 'var(--ee-muted)' }}>•</span>
                                <span>{c}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default SeasonHistoryCard
