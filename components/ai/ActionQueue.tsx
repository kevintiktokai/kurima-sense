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

const priorityConfig = {
    urgent: { bg: 'rgba(220, 80, 80, 0.06)', badgeBg: 'rgba(220, 80, 80, 0.12)', badgeColor: '#c44' },
    high: { bg: 'rgba(232, 163, 101, 0.08)', badgeBg: 'rgba(232, 163, 101, 0.15)', badgeColor: 'var(--ee-sun)' },
    normal: { bg: 'rgba(15, 184, 133, 0.06)', badgeBg: 'rgba(15, 184, 133, 0.12)', badgeColor: 'var(--ee-primary)' },
    low: { bg: 'var(--ee-bg)', badgeBg: 'var(--ee-bg-dim)', badgeColor: 'var(--ee-muted)' }
};

const typeIcons: Record<ActionItem['type'], string> = {
    spray: 'sanitizer',
    irrigate: 'water_drop',
    scout: 'search',
    harvest: 'agriculture',
    fertilize: 'science',
    general: 'checklist'
};

const ActionQueueImpl: React.FC<ActionQueueProps> = ({
    actions,
    title = "Today's Actions",
    onActionComplete
}) => {
    const pendingActions = actions.filter(a => !a.completed);
    const completedActions = actions.filter(a => a.completed);
    const urgentCount = pendingActions.filter(a => a.priority === 'urgent').length;

    return (
        <div className="neu-surface p-4 sm:p-6 lg:p-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(15, 184, 133, 0.15)' }}
                    >
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-primary)', fontSize: '20px' }}>checklist</span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg leading-tight" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>{title}</h3>
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            {pendingActions.length} pending
                        </p>
                    </div>
                </div>

                {urgentCount > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: 'rgba(220,80,80,0.1)', color: '#c44', fontFamily: 'var(--font-body)' }}>
                        {urgentCount} Urgent
                    </span>
                )}
            </div>

            {/* Actions List */}
            <div className="space-y-3">
                {pendingActions.map((action) => {
                    const config = priorityConfig[action.priority];
                    const icon = typeIcons[action.type];

                    return (
                        <div
                            key={action.id}
                            className="p-3 sm:p-4 rounded-[12px] sm:rounded-[16px] transition-all duration-200 group"
                            style={{ backgroundColor: config.bg }}
                        >
                            <div className="flex items-start gap-2 sm:gap-3">
                                {/* Checkbox */}
                                <button
                                    onClick={() => {
                                        action.onComplete?.();
                                        onActionComplete?.(action.id);
                                    }}
                                    className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 transition-colors"
                                    style={{ border: '2px solid var(--ee-bg-border)' }}
                                >
                                    <span className="material-symbols-outlined text-transparent group-hover:text-[var(--ee-primary)] transition-colors" style={{ fontSize: '16px' }}>check</span>
                                </button>

                                {/* Icon - hidden on very small screens to save space */}
                                <div
                                    className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[12px] hidden sm:flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--ee-surface)', boxShadow: '2px 2px 6px #D5D2CE, -2px -2px 6px #FFFFFF' }}
                                >
                                    <span className="material-symbols-outlined" style={{ color: 'var(--ee-text)', fontSize: '18px' }}>{icon}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                        {/* No truncation: in the narrow dashboard column (iPad landscape) the
                                            title must stay fully readable, wrapping rather than clipping to "Harv…". */}
                                        <h4 className="text-xs sm:text-sm leading-snug break-words min-w-0" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>{action.title}</h4>
                                        <span
                                            className="text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase flex-shrink-0"
                                            style={{ backgroundColor: config.badgeBg, color: config.badgeColor, fontFamily: 'var(--font-body)' }}
                                        >
                                            {action.priority}
                                        </span>
                                    </div>

                                    <p className="text-[11px] sm:text-xs mb-2 line-clamp-2" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{action.description}</p>

                                    <div className="flex items-center gap-2 sm:gap-4 text-[9px] sm:text-[10px] flex-wrap" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                        {action.fieldName && (
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>grass</span> {action.fieldName}
                                            </span>
                                        )}
                                        {action.dueDate && (
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>calendar_today</span> {action.dueDate}
                                            </span>
                                        )}
                                        {action.estimatedTime && (
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>schedule</span> {action.estimatedTime}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {action.onSnooze && (
                                    <button
                                        onClick={action.onSnooze}
                                        className="flex-shrink-0 p-2 transition-colors"
                                        title="Snooze"
                                    >
                                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-muted)', fontSize: '18px' }}>snooze</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Completed Section */}
            {completedActions.length > 0 && (
                <div className="mt-6 pt-4" style={{ borderTop: 'none' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                        <span className="material-symbols-outlined align-middle" style={{ fontSize: '14px', color: 'var(--ee-primary)' }}>check_circle</span> Completed Today
                    </p>
                    <div className="space-y-2">
                        {completedActions.slice(0, 3).map((action) => (
                            <div
                                key={action.id}
                                className="flex items-center gap-3 line-through"
                                style={{ color: 'var(--ee-muted)' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{typeIcons[action.type]}</span>
                                <span className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>{action.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {pendingActions.length === 0 && completedActions.length === 0 && (
                <div className="text-center py-8">
                    <span className="material-symbols-outlined mb-3" style={{ fontSize: '40px', color: 'var(--ee-primary)' }}>celebration</span>
                    <p className="text-sm font-bold" style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}>All caught up!</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>No pending actions for today</p>
                </div>
            )}

            {/* View All Link */}
            <a
                href="/dashboard/plan"
                className="mt-4 block text-center py-3 rounded-[16px] text-sm font-bold transition-colors"
                style={{
                    backgroundColor: 'var(--ee-bg)',
                    color: 'var(--ee-muted)',
                    fontFamily: 'var(--font-body)',
                }}
            >
                View All in Plan
            </a>
        </div>
    );
};

export const ActionQueue = React.memo(ActionQueueImpl);

export type { ActionItem };
export default ActionQueue;
