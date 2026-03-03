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

const severityStyles = {
    low: {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        badge: 'bg-slate-100 text-slate-600',
        icon: '💡'
    },
    medium: {
        bg: 'bg-brand-lime/10',
        border: 'border-brand-lime/30',
        badge: 'bg-brand-lime/20 text-brand-dark',
        icon: '📊'
    },
    high: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-700',
        icon: '⚠️'
    },
    critical: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-700',
        icon: '🚨'
    }
};

const typeIcons: Record<AIInsight['type'], string> = {
    weather: '🌤️',
    pest: '🪲',
    market: '💰',
    growth: '🌱',
    health: '🩺',
    action: '✅'
};

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ insight }) => {
    const style = severityStyles[insight.severity];
    const typeIcon = typeIcons[insight.type];

    return (
        <div className={`${style.bg} ${style.border} border p-5 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:translate-x-1 group`}>
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-100">
                    {typeIcon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-brand-dark text-sm truncate">{insight.title}</h4>
                        <span className={`${style.badge} text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                            {insight.severity}
                        </span>
                    </div>

                    {insight.fieldName && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                            🌾 {insight.fieldName}
                        </p>
                    )}

                    <p className="text-sm text-slate-600 leading-relaxed mb-3">
                        {insight.message}
                    </p>

                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400">
                            {insight.timestamp}
                        </span>

                        <div className="flex gap-2">
                            {insight.onDismiss && (
                                <button
                                    onClick={insight.onDismiss}
                                    className="text-[10px] font-bold text-slate-400 hover:text-brand-dark uppercase tracking-widest transition-colors"
                                >
                                    Dismiss
                                </button>
                            )}
                            {insight.actionLabel && insight.onAction && (
                                <button
                                    onClick={insight.onAction}
                                    className="text-[10px] font-bold text-brand-dark bg-brand-lime px-3 py-1.5 rounded-full uppercase tracking-widest hover:scale-105 transition-transform"
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
        <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-lime rounded-full flex items-center justify-center text-xl">
                        ✨
                    </div>
                    <div>
                        <h3 className="font-black text-brand-dark text-lg">{title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {insights.length} active • Updated now
                        </p>
                    </div>
                </div>

                {(criticalCount > 0 || highCount > 0) && (
                    <div className="flex gap-2">
                        {criticalCount > 0 && (
                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                                {criticalCount} Critical
                            </span>
                        )}
                        {highCount > 0 && (
                            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
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
                <button className="w-full mt-4 py-3 text-sm font-bold text-slate-400 hover:text-brand-dark transition-colors">
                    View {remainingCount} more insights →
                </button>
            )}

            {insights.length === 0 && (
                <div className="text-center py-8">
                    <div className="text-4xl mb-3">🌟</div>
                    <p className="text-sm font-bold text-slate-400">All clear! No alerts right now.</p>
                </div>
            )}
        </div>
    );
};

export type { AIInsight };
export default AIInsightCard;
