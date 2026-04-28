"use client";

import React from 'react';

interface AIInsight {
    id: string;
    type: 'weather' | 'pest' | 'market' | 'growth' | 'health' | 'action';
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    fieldName?: string;
    timestamp: string;
    actionLabel?: string;
    onAction?: () => void;
    onDismiss?: () => void;
}

interface AIInsightCardProps {
    insight: AIInsight;
}

const severityConfig = {
    low: { bg: 'var(--ee-bg)', icon: 'lightbulb', iconBg: 'var(--ee-bg-dim)' },
    medium: { bg: 'rgba(15, 184, 133, 0.08)', icon: 'analytics', iconBg: 'rgba(15, 184, 133, 0.15)' },
    high: { bg: 'rgba(232, 163, 101, 0.1)', icon: 'warning', iconBg: 'rgba(232, 163, 101, 0.2)' },
    critical: { bg: 'rgba(220, 80, 80, 0.08)', icon: 'error', iconBg: 'rgba(220, 80, 80, 0.15)' }
};

const typeIcons: Record<AIInsight['type'], string> = {
    weather: 'cloud',
    pest: 'bug_report',
    market: 'trending_up',
    growth: 'eco',
    health: 'health_and_safety',
    action: 'task_alt'
};

const AIInsightCardImpl: React.FC<AIInsightCardProps> = ({ insight }) => {
    const config = severityConfig[insight.severity];
    const typeIcon = typeIcons[insight.type];

    return (
        <div
            className="p-3.5 sm:p-5 rounded-[16px] sm:rounded-[24px] transition-all duration-200"
            style={{ backgroundColor: config.bg, boxShadow: 'var(--shadow-neu)' }}
        >
            <div className="flex items-start gap-2.5 sm:gap-4">
                <div
                    className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[16px] flex items-center justify-center"
                    style={{ backgroundColor: config.iconBg }}
                >
                    <span className="material-symbols-outlined" style={{ color: 'var(--ee-text)', fontSize: '20px' }}>{typeIcon}</span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        <h4 className="text-xs sm:text-sm truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>{insight.title}</h4>
                        <span
                            className="text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0"
                            style={{
                                backgroundColor: config.iconBg,
                                color: 'var(--ee-text)',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            {insight.severity}
                        </span>
                    </div>

                    {insight.fieldName && (
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            <span className="material-symbols-outlined align-middle" style={{ fontSize: '12px' }}>grass</span> {insight.fieldName}
                        </p>
                    )}

                    <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                        {insight.message}
                    </p>

                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            {insight.timestamp}
                        </span>

                        <div className="flex gap-2">
                            {insight.onDismiss && (
                                <button
                                    onClick={insight.onDismiss}
                                    className="text-[10px] font-bold uppercase tracking-widest transition-colors"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    Dismiss
                                </button>
                            )}
                            {insight.actionLabel && insight.onAction && (
                                <button
                                    onClick={insight.onAction}
                                    className="text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest transition-transform hover:scale-105"
                                    style={{
                                        backgroundColor: 'var(--ee-primary)',
                                        color: '#fff',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    {insight.actionLabel}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AIInsightCard = React.memo(AIInsightCardImpl);

// Container for multiple insights
interface AIInsightsPanelProps {
    insights: AIInsight[];
    title?: string;
    maxVisible?: number;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
    insights,
    title = "AI Insights",
    maxVisible = 5
}) => {
    const criticalCount = insights.filter(i => i.severity === 'critical').length;
    const highCount = insights.filter(i => i.severity === 'high').length;

    const displayedInsights = insights.slice(0, maxVisible);
    const remainingCount = insights.length - maxVisible;

    return (
        <div className="neu-surface p-4 sm:p-6 lg:p-8 overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(15, 184, 133, 0.15)' }}
                    >
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-primary)', fontSize: '20px' }}>auto_awesome</span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>{title}</h3>
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            {insights.length} active
                        </p>
                    </div>
                </div>

                {(criticalCount > 0 || highCount > 0) && (
                    <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                        {criticalCount > 0 && (
                            <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full" style={{ backgroundColor: 'rgba(220,80,80,0.1)', color: '#c44', fontFamily: 'var(--font-body)' }}>
                                {criticalCount} Critical
                            </span>
                        )}
                        {highCount > 0 && (
                            <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full" style={{ backgroundColor: 'rgba(232,163,101,0.15)', color: 'var(--ee-sun)', fontFamily: 'var(--font-body)' }}>
                                {highCount} High
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {displayedInsights.map((insight) => (
                    <AIInsightCard key={insight.id} insight={insight} />
                ))}
            </div>

            {remainingCount > 0 && (
                <button className="w-full mt-4 py-3 text-sm font-bold transition-colors" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                    View {remainingCount} more insights
                </button>
            )}

            {insights.length === 0 && (
                <div className="text-center py-8">
                    <span className="material-symbols-outlined mb-3" style={{ fontSize: '40px', color: 'var(--ee-primary)' }}>check_circle</span>
                    <p className="text-sm font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>All clear! No alerts right now.</p>
                </div>
            )}
        </div>
    );
};

export type { AIInsight };
export default AIInsightCard;
