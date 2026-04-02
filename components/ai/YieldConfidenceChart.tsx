"use client";

import React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

export interface ConfidenceBands {
    low: number;
    mid: number;
    high: number;
}

export interface YieldDataPoint {
    name: string;
    low: number;
    mid: number;
    high: number;
    actual?: number;
}

interface YieldConfidenceChartProps {
    data: YieldDataPoint[];
    confidenceFactors?: string[];
    projectedYield?: number;
    yieldPotential?: number;
    unit?: string;
    title?: string;
    methodology?: string;
    disclaimer?: string;
    confidenceScore?: number;
}

export const generateProjectionData = (
    confidenceBands: ConfidenceBands,
    currentWeek: number = 4
): YieldDataPoint[] => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Harvest'];
    const growthCurve = [0.15, 0.3, 0.5, 0.7, 0.85, 0.95, 1.0];

    return weeks.slice(0, Math.min(currentWeek + 3, weeks.length)).map((name, idx) => ({
        name,
        low: confidenceBands.low * growthCurve[idx],
        mid: confidenceBands.mid * growthCurve[idx],
        high: confidenceBands.high * growthCurve[idx],
        actual: idx < currentWeek ? confidenceBands.mid * growthCurve[idx] * (0.95 + Math.random() * 0.1) : undefined
    }));
};

export const YieldConfidenceChart: React.FC<YieldConfidenceChartProps> = ({
    data,
    confidenceFactors = [],
    projectedYield,
    yieldPotential,
    unit = 'tonnes/ha',
    title = "Yield Projection",
    methodology,
    disclaimer,
    confidenceScore
}) => {
    const gapPercent = projectedYield && yieldPotential
        ? Math.round((1 - projectedYield / yieldPotential) * 100)
        : 0;

    return (
        <div className="neu-surface p-4 sm:p-6 lg:p-8 overflow-hidden">
            {/* Yield Estimate Disclaimer */}
            <div className="rounded-[10px] sm:rounded-[12px] p-2 mb-3 sm:mb-4 flex items-start sm:items-center gap-2" style={{ backgroundColor: 'rgba(232, 163, 101, 0.1)' }}>
                <span className="material-symbols-outlined flex-shrink-0 mt-0.5 sm:mt-0" style={{ fontSize: '14px', color: 'var(--ee-sun)' }}>info</span>
                <p className="text-[9px] sm:text-[10px] leading-snug" style={{ color: 'var(--ee-sun)', fontFamily: 'var(--font-body)' }}>
                    <span className="font-bold">ESTIMATE ONLY:</span> Results vary with weather, pests & management.
                </p>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(15, 184, 133, 0.15)' }}
                    >
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-primary)', fontSize: '20px' }}>analytics</span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>{title}</h3>
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest truncate" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            {methodology || 'Agronomic projection'} {confidenceScore ? `· ${Math.round(confidenceScore * 100)}%` : ''}
                        </p>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="flex gap-3 sm:gap-4 flex-shrink-0">
                    {projectedYield && (
                        <div className="sm:text-right">
                            <p className="text-xl sm:text-2xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--ee-text)' }}>{projectedYield.toFixed(1)}</p>
                            <p className="text-[9px] sm:text-[10px] font-bold uppercase" style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}>Projected {unit}</p>
                        </div>
                    )}
                    {yieldPotential && (
                        <div className="sm:text-right">
                            <p className="text-xl sm:text-2xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--ee-bg-border)' }}>{yieldPotential.toFixed(1)}</p>
                            <p className="text-[9px] sm:text-[10px] font-bold uppercase" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Potential {unit}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Yield Gap Indicator */}
            {gapPercent > 0 && (
                <div className="rounded-[10px] sm:rounded-[12px] p-2.5 sm:p-3 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3" style={{ backgroundColor: 'rgba(232, 163, 101, 0.1)' }}>
                    <span className="material-symbols-outlined flex-shrink-0" style={{ color: 'var(--ee-sun)', fontSize: '18px' }}>warning</span>
                    <p className="text-xs sm:text-sm" style={{ color: 'var(--ee-sun)', fontFamily: 'var(--font-body)' }}>
                        <span className="font-bold">{gapPercent}% yield gap</span> — room for improvement
                    </p>
                </div>
            )}

            {/* Chart */}
            <div className="h-[200px] sm:h-[250px] lg:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0fb885" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#0fb885" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="midGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2D3A30" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#2D3A30" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>

                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: '#8B9D8F', fontFamily: 'var(--font-body)' }}
                            axisLine={{ stroke: '#e0ddd8' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#8B9D8F', fontFamily: 'var(--font-body)' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => `${val}`}
                        />

                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#2D3A30',
                                borderRadius: '16px',
                                border: 'none',
                                color: '#fff',
                                padding: '12px 16px',
                                fontFamily: 'var(--font-body)',
                            }}
                            formatter={(value, name) => {
                                const numValue = typeof value === 'number' ? value : 0;
                                const label = name === 'high' ? 'Best Case' : name === 'low' ? 'Worst Case' : name === 'actual' ? 'Actual' : 'Expected';
                                return [`${numValue.toFixed(2)} ${unit}`, label];
                            }}
                            labelStyle={{ fontWeight: 'bold', marginBottom: 4, fontFamily: 'var(--font-heading)' }}
                        />

                        {/* Confidence Band */}
                        <Area
                            type="monotone"
                            dataKey="high"
                            stroke="#0fb885"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            fill="url(#confidenceGradient)"
                            fillOpacity={1}
                            name="high"
                        />
                        <Area
                            type="monotone"
                            dataKey="low"
                            stroke="#0fb885"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            fill="white"
                            fillOpacity={1}
                            name="low"
                        />

                        {/* Main Projection Line */}
                        <Area
                            type="monotone"
                            dataKey="mid"
                            stroke="#2D3A30"
                            strokeWidth={3}
                            fill="url(#midGradient)"
                            fillOpacity={0.6}
                            name="mid"
                        />

                        {/* Actual Data Points */}
                        <Area
                            type="monotone"
                            dataKey="actual"
                            stroke="#0fb885"
                            strokeWidth={2}
                            fill="none"
                            dot={{ fill: '#0fb885', strokeWidth: 2 }}
                            name="actual"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 justify-center text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--ee-text)' }} />
                    <span style={{ color: 'var(--ee-muted)' }}>Expected Yield</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-3 rounded" style={{ backgroundColor: 'rgba(15, 184, 133, 0.2)', border: '1px dashed var(--ee-primary)' }} />
                    <span style={{ color: 'var(--ee-muted)' }}>Confidence Range</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--ee-primary)' }} />
                    <span style={{ color: 'var(--ee-muted)' }}>Actual Performance</span>
                </div>
            </div>

            {/* Confidence Factors */}
            {confidenceFactors.length > 0 && (
                <div className="mt-6 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                        Factors Affecting Confidence
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {confidenceFactors.map((factor, idx) => (
                            <span
                                key={idx}
                                className="text-xs px-3 py-1.5 rounded-full"
                                style={{
                                    backgroundColor: 'var(--ee-bg)',
                                    color: 'var(--ee-muted)',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                {factor}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default YieldConfidenceChart;
