"use client";

import React from 'react';

interface RiskItem {
    id: string;
    type: 'pest' | 'disease' | 'weather' | 'market' | 'soil';
    name: string;
    risk: number; // 0-100
    trend: 'rising' | 'falling' | 'stable';
    fieldName?: string;
}

interface RiskRadarProps {
    risks: RiskItem[];
    title?: string;
    onRiskClick?: (risk: RiskItem) => void;
}

const typeConfig: Record<RiskItem['type'], { icon: string; color: string; label: string }> = {
    pest: { icon: '🪲', color: 'text-amber-600', label: 'Pest' },
    disease: { icon: '🦠', color: 'text-red-600', label: 'Disease' },
    weather: { icon: '⛈️', color: 'text-blue-600', label: 'Weather' },
    market: { icon: '📉', color: 'text-purple-600', label: 'Market' },
    soil: { icon: '🌍', color: 'text-orange-600', label: 'Soil' }
};

const getRiskLevel = (risk: number): { label: string; color: string; bgColor: string } => {
    if (risk >= 75) return { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (risk >= 50) return { label: 'High', color: 'text-amber-600', bgColor: 'bg-amber-100' };
    if (risk >= 25) return { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { label: 'Low', color: 'text-emerald-600', bgColor: 'bg-emerald-100' };
};

const TrendIndicator: React.FC<{ trend: RiskItem['trend'] }> = ({ trend }) => {
    if (trend === 'rising') {
        return <span className="text-red-500 text-xs">↑</span>;
    }
    if (trend === 'falling') {
        return <span className="text-emerald-500 text-xs">↓</span>;
    }
    return <span className="text-slate-400 text-xs">→</span>;
};

export const RiskRadar: React.FC<RiskRadarProps> = ({
    risks,
    title = "Risk Radar",
    onRiskClick
}) => {
    // Sort by risk level descending
    const sortedRisks = [...risks].sort((a, b) => b.risk - a.risk);

    // Calculate overall risk score
    const overallRisk = risks.length > 0
        ? Math.round(risks.reduce((sum, r) => sum + r.risk, 0) / risks.length)
        : 0;
    const overallLevel = getRiskLevel(overallRisk);

    return (
        <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-dark rounded-full flex items-center justify-center text-xl">
                        🎯
                    </div>
                    <div>
                        <h3 className="font-black text-brand-dark text-lg">{title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {risks.length} active risks
                        </p>
                    </div>
                </div>

                {/* Overall Risk Indicator */}
                <div className={`${overallLevel.bgColor} px-4 py-2 rounded-2xl flex items-center gap-2`}>
                    <div className={`w-8 h-8 rounded-full ${overallLevel.bgColor} flex items-center justify-center`}>
                        <span className={`text-lg font-black ${overallLevel.color}`}>{overallRisk}</span>
                    </div>
                    <div className="text-right">
                        <p className={`text-xs font-bold ${overallLevel.color}`}>{overallLevel.label}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">Overall</p>
                    </div>
                </div>
            </div>

            {/* Risk List */}
            <div className="space-y-3">
                {sortedRisks.map((risk) => {
                    const config = typeConfig[risk.type];
                    const level = getRiskLevel(risk.risk);

                    return (
                        <div
                            key={risk.id}
                            onClick={() => onRiskClick?.(risk)}
                            className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-brand-lime/10 transition-colors cursor-pointer group"
                        >
                            {/* Type Icon */}
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                                {config.icon}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-brand-dark truncate">{risk.name}</p>
                                    <TrendIndicator trend={risk.trend} />
                                </div>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                    {config.label} {risk.fieldName ? `• ${risk.fieldName}` : ''}
                                </p>
                            </div>

                            {/* Risk Bar */}
                            <div className="w-24 flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${risk.risk >= 75 ? 'bg-red-500' :
                                            risk.risk >= 50 ? 'bg-amber-500' :
                                                risk.risk >= 25 ? 'bg-yellow-500' :
                                                    'bg-emerald-500'
                                            }`}
                                        style={{ width: `${risk.risk}%` }}
                                    />
                                </div>
                                <span className={`text-xs font-bold ${level.color} w-8 text-right`}>
                                    {risk.risk}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {risks.length === 0 && (
                <div className="text-center py-8">
                    <div className="text-4xl mb-3">✅</div>
                    <p className="text-sm font-bold text-emerald-600">All Clear!</p>
                    <p className="text-xs text-slate-400 mt-1">No significant risks detected</p>
                </div>
            )}

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-4 justify-center">
                    {Object.entries(typeConfig).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span>{value.icon}</span>
                            <span className="font-medium">{value.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export type { RiskItem };
export default RiskRadar;
