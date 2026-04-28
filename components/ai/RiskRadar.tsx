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

const typeConfig: Record<RiskItem['type'], { icon: string; label: string }> = {
    pest: { icon: 'bug_report', label: 'Pest' },
    disease: { icon: 'coronavirus', label: 'Disease' },
    weather: { icon: 'thunderstorm', label: 'Weather' },
    market: { icon: 'trending_down', label: 'Market' },
    soil: { icon: 'landscape', label: 'Soil' }
};

const getRiskLevel = (risk: number) => {
    if (risk >= 75) return { label: 'Critical', color: '#c44' };
    if (risk >= 50) return { label: 'High', color: 'var(--ee-sun)' };
    if (risk >= 25) return { label: 'Medium', color: '#c4a030' };
    return { label: 'Low', color: 'var(--ee-primary)' };
};

const TrendIndicator: React.FC<{ trend: RiskItem['trend'] }> = ({ trend }) => {
    const icon = trend === 'rising' ? 'trending_up' : trend === 'falling' ? 'trending_down' : 'trending_flat';
    const color = trend === 'rising' ? '#c44' : trend === 'falling' ? 'var(--ee-primary)' : 'var(--ee-muted)';
    return <span className="material-symbols-outlined" style={{ fontSize: '16px', color }}>{icon}</span>;
};

const RiskRadarImpl: React.FC<RiskRadarProps> = ({
    risks,
    title = "Risk Radar",
    onRiskClick
}) => {
    const sortedRisks = [...risks].sort((a, b) => b.risk - a.risk);

    const overallRisk = risks.length > 0
        ? Math.round(risks.reduce((sum, r) => sum + r.risk, 0) / risks.length)
        : 0;
    const overallLevel = getRiskLevel(overallRisk);

    return (
        <div className="neu-surface p-4 sm:p-6 lg:p-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--ee-bg-dim)' }}
                    >
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-text)', fontSize: '20px' }}>target</span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>{title}</h3>
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            {risks.length} active risks
                        </p>
                    </div>
                </div>

                {/* Overall Risk Indicator */}
                <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-[12px] sm:rounded-[16px] flex items-center gap-1.5 sm:gap-2 flex-shrink-0" style={{ backgroundColor: 'var(--ee-bg)' }}>
                    <span className="text-base sm:text-lg" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: overallLevel.color }}>{overallRisk}</span>
                    <div className="text-right">
                        <p className="text-[10px] sm:text-xs font-bold" style={{ color: overallLevel.color, fontFamily: 'var(--font-body)' }}>{overallLevel.label}</p>
                        <p className="text-[8px] sm:text-[9px] uppercase tracking-wider" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Overall</p>
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
                            className="flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-[12px] sm:rounded-[16px] transition-all duration-200 cursor-pointer"
                            style={{ backgroundColor: 'var(--ee-bg)' }}
                        >
                            <div
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[12px] flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: 'var(--ee-surface)', boxShadow: '2px 2px 6px #D5D2CE, -2px -2px 6px #FFFFFF' }}
                            >
                                <span className="material-symbols-outlined" style={{ color: 'var(--ee-text)', fontSize: '18px' }}>{config.icon}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-xs sm:text-sm truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>{risk.name}</p>
                                    <TrendIndicator trend={risk.trend} />
                                </div>
                                <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-widest truncate" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                    {config.label} {risk.fieldName ? `· ${risk.fieldName}` : ''}
                                </p>
                            </div>

                            {/* Risk Bar */}
                            <div className="w-16 sm:w-24 flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                <div className="flex-1 h-1.5 sm:h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ee-bg-pressed)' }}>
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${risk.risk}%`, backgroundColor: level.color }}
                                    />
                                </div>
                                <span className="text-[10px] sm:text-xs font-bold w-7 sm:w-8 text-right" style={{ color: level.color, fontFamily: 'var(--font-heading)' }}>
                                    {risk.risk}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {risks.length === 0 && (
                <div className="text-center py-8">
                    <span className="material-symbols-outlined mb-3" style={{ fontSize: '40px', color: 'var(--ee-primary)' }}>verified</span>
                    <p className="text-sm font-bold" style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}>All Clear!</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>No significant risks detected</p>
                </div>
            )}

            {/* Legend */}
            <div className="mt-6 pt-4">
                <div className="flex flex-wrap gap-4 justify-center">
                    {Object.entries(typeConfig).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{value.icon}</span>
                            <span className="font-medium">{value.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const RiskRadar = React.memo(RiskRadarImpl);

export type { RiskItem };
export default RiskRadar;
