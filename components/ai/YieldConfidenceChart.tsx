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

// Generate sample projection data with confidence bands
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
    // Calculate gap percentage
    const gapPercent = projectedYield && yieldPotential
        ? Math.round((1 - projectedYield / yieldPotential) * 100)
        : 0;

    return (
        <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-100">
            {/* Yield Estimate Disclaimer Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 mb-4 flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <p className="text-[10px] text-amber-700">
                    <span className="font-bold">ESTIMATE ONLY:</span> Results vary with weather, pests & management. Not a guarantee.
                </p>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-lime rounded-full flex items-center justify-center text-xl">
                        📊
                    </div>
                    <div>
                        <h3 className="font-black text-brand-dark text-lg">{title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {methodology || 'Agronomic projection'} {confidenceScore ? `• ${Math.round(confidenceScore * 100)}% confidence` : ''}
                        </p>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="flex gap-4">
                    {projectedYield && (
                        <div className="text-right">
                            <p className="text-2xl font-black text-brand-dark">{projectedYield.toFixed(1)}</p>
                            <p className="text-[10px] font-bold text-brand-lime uppercase">Projected {unit}</p>
                        </div>
                    )}
                    {yieldPotential && (
                        <div className="text-right">
                            <p className="text-2xl font-black text-slate-300">{yieldPotential.toFixed(1)}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Potential {unit}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Yield Gap Indicator */}
            {gapPercent > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    <p className="text-sm text-amber-800">
                        <span className="font-bold">{gapPercent}% yield gap</span> — room for improvement with optimized inputs
                    </p>
                </div>
            )}


            {/* Chart */}
            <div className="h-[250px] lg:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#D7F26C" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#D7F26C" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="midGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2D3A26" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#2D3A26" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>

                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => `${val}`}
                        />

                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#2D3A26',
                                borderRadius: '1rem',
                                border: 'none',
                                color: '#fff',
                                padding: '12px 16px'
                            }}
                            formatter={(value, name) => {
                                const numValue = typeof value === 'number' ? value : 0;
                                const label = name === 'high' ? 'Best Case' : name === 'low' ? 'Worst Case' : name === 'actual' ? 'Actual' : 'Expected';
                                return [`${numValue.toFixed(2)} ${unit}`, label];
                            }}
                            labelStyle={{ fontWeight: 'bold', marginBottom: 4 }}
                        />

                        {/* Confidence Band (high-low range) */}
                        <Area
                            type="monotone"
                            dataKey="high"
                            stroke="#D7F26C"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            fill="url(#confidenceGradient)"
                            fillOpacity={1}
                            name="high"
                        />
                        <Area
                            type="monotone"
                            dataKey="low"
                            stroke="#D7F26C"
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
                            stroke="#2D3A26"
                            strokeWidth={3}
                            fill="url(#midGradient)"
                            fillOpacity={0.6}
                            name="mid"
                        />

                        {/* Actual Data Points (if available) */}
                        <Area
                            type="monotone"
                            dataKey="actual"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="none"
                            dot={{ fill: '#10b981', strokeWidth: 2 }}
                            name="actual"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 justify-center text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-brand-dark rounded-full" />
                    <span className="text-slate-500">Expected Yield</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-3 bg-brand-lime/30 rounded border border-dashed border-brand-lime" />
                    <span className="text-slate-500">Confidence Range</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <span className="text-slate-500">Actual Performance</span>
                </div>
            </div>

            {/* Confidence Factors */}
            {confidenceFactors.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Factors Affecting Confidence
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {confidenceFactors.map((factor, idx) => (
                            <span
                                key={idx}
                                className="bg-slate-100 text-slate-600 text-xs px-3 py-1.5 rounded-full"
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
