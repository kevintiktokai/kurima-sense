"use client";

import React from 'react';

interface ActionItem {
    id: string;
    title: string;
    description: string;
    priority: 'urgent' | 'high' | 'normal' | 'low';
    type: 'spray' | 'irrigate' | 'scout' | 'harvest' | 'fertilize' | 'general';
    fieldName?: string;
    dueDate?: string;
    estimatedTime?: string;
    completed?: boolean;
    onComplete?: () => void;
    onSnooze?: () => void;
}

interface ActionQueueProps {
    actions: ActionItem[];
    title?: string;
    onActionComplete?: (actionId: string) => void;
}

const priorityStyles = {
    urgent: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-700',
        dot: 'bg-red-500'
    },
    high: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-700',
        dot: 'bg-amber-500'
    },
    normal: {
        bg: 'bg-brand-lime/10',
        border: 'border-brand-lime/30',
        badge: 'bg-brand-lime/30 text-brand-dark',
        dot: 'bg-brand-lime'
    },
    low: {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        badge: 'bg-slate-100 text-slate-600',
        dot: 'bg-slate-400'
    }
};

const typeIcons: Record<ActionItem['type'], string> = {
    spray: '💊',
    irrigate: '💧',
    scout: '🔍',
    harvest: '🌾',
    fertilize: '🧪',
    general: '📋'
};

export const ActionQueue: React.FC<ActionQueueProps> = ({
    actions,
    title = "Today's Actions",
    onActionComplete
}) => {
    const pendingActions = actions.filter(a => !a.completed);
    const completedActions = actions.filter(a => a.completed);
    const urgentCount = pendingActions.filter(a => a.priority === 'urgent').length;

    return (
        <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-lime rounded-full flex items-center justify-center text-xl">
                        📋
                    </div>
                    <div>
                        <h3 className="font-black text-brand-dark text-lg">{title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {pendingActions.length} pending • {completedActions.length} done
                        </p>
                    </div>
                </div>

                {urgentCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">
                        {urgentCount} Urgent
                    </span>
                )}
            </div>

            {/* Actions List */}
            <div className="space-y-3">
                {pendingActions.map((action) => {
                    const style = priorityStyles[action.priority];
                    const icon = typeIcons[action.type];

                    return (
                        <div
                            key={action.id}
                            className={`${style.bg} ${style.border} border p-4 rounded-2xl transition-all hover:shadow-sm group`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <button
                                    onClick={() => {
                                        action.onComplete?.();
                                        onActionComplete?.(action.id);
                                    }}
                                    className="flex-shrink-0 w-6 h-6 border-2 border-slate-300 rounded-lg hover:border-brand-lime hover:bg-brand-lime/20 transition-colors flex items-center justify-center mt-0.5"
                                >
                                    <svg className="w-4 h-4 text-transparent group-hover:text-brand-dark transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                </button>

                                {/* Icon */}
                                <div className="flex-shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm">
                                    {icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-brand-dark text-sm truncate">{action.title}</h4>
                                        <span className={`${style.badge} text-[9px] font-bold px-2 py-0.5 rounded-full uppercase`}>
                                            {action.priority}
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-500 mb-2">{action.description}</p>

                                    <div className="flex items-center gap-4 text-[10px] text-slate-400">
                                        {action.fieldName && (
                                            <span className="flex items-center gap-1">
                                                🌾 {action.fieldName}
                                            </span>
                                        )}
                                        {action.dueDate && (
                                            <span className="flex items-center gap-1">
                                                📅 {action.dueDate}
                                            </span>
                                        )}
                                        {action.estimatedTime && (
                                            <span className="flex items-center gap-1">
                                                ⏱️ {action.estimatedTime}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Snooze */}
                                {action.onSnooze && (
                                    <button
                                        onClick={action.onSnooze}
                                        className="flex-shrink-0 text-slate-400 hover:text-brand-dark transition-colors p-2"
                                        title="Snooze"
                                    >
                                        ⏰
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Completed Section */}
            {completedActions.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        ✅ Completed Today
                    </p>
                    <div className="space-y-2">
                        {completedActions.slice(0, 3).map((action) => (
                            <div
                                key={action.id}
                                className="flex items-center gap-3 text-slate-400 line-through"
                            >
                                <span className="text-sm">{typeIcons[action.type]}</span>
                                <span className="text-sm">{action.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {pendingActions.length === 0 && completedActions.length === 0 && (
                <div className="text-center py-8">
                    <div className="text-4xl mb-3">🎉</div>
                    <p className="text-sm font-bold text-emerald-600">All caught up!</p>
                    <p className="text-xs text-slate-400 mt-1">No pending actions for today</p>
                </div>
            )}

            {/* View All Link */}
            <a
                href="/dashboard/plan"
                className="mt-4 block text-center py-3 bg-slate-50 hover:bg-brand-lime/20 rounded-2xl text-sm font-bold text-slate-500 hover:text-brand-dark transition-colors"
            >
                View All in Plan →
            </a>
        </div>
    );
};

export type { ActionItem };
export default ActionQueue;
