"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

export interface Activity {
    id: string;
    title: string;
    description?: string;
    type: 'irrigation' | 'spraying' | 'scouting' | 'harvest' | 'fertilize' | 'custom';
    priority: 'urgent' | 'high' | 'normal' | 'low';
    date: string;
    completed: boolean;
    completedAt?: string;
    fieldId?: string;
    fieldName?: string;
    aiSuggested?: boolean;
}

interface TaskHistorySummary {
    total: number;
    completed: number;
    pending: number;
    completion_rate: number;
    days_covered: number;
}

interface ActivityLogProps {
    fieldId?: string;
    refreshTrigger?: number;
    onActivityComplete?: (id: string) => void;
    onActivityCreate?: (activity: Omit<Activity, 'id'>) => void;
}

const typeIcons: Record<Activity['type'], string> = {
    irrigation: 'water_drop',
    spraying: 'sanitizer',
    scouting: 'search',
    harvest: 'agriculture',
    fertilize: 'science',
    custom: 'checklist'
};

const priorityConfig: Record<Activity['priority'], { bg: string; badgeColor: string }> = {
    urgent: { bg: 'rgba(220, 80, 80, 0.06)', badgeColor: '#c44' },
    high: { bg: 'rgba(232, 163, 101, 0.08)', badgeColor: 'var(--ee-sun)' },
    normal: { bg: 'rgba(15, 184, 133, 0.06)', badgeColor: 'var(--ee-primary)' },
    low: { bg: 'var(--ee-bg)', badgeColor: 'var(--ee-muted)' }
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const ActivityLog: React.FC<ActivityLogProps> = ({
    fieldId,
    refreshTrigger,
    onActivityComplete,
    onActivityCreate
}) => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
    const [history, setHistory] = useState<Activity[]>([]);
    const [historySummary, setHistorySummary] = useState<TaskHistorySummary | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [newActivity, setNewActivity] = useState({
        title: '',
        description: '',
        type: 'custom' as Activity['type'],
        priority: 'normal' as Activity['priority'],
    });

    const [insightsTriggered, setInsightsTriggered] = useState(false);

    const fetchActivities = useCallback(async () => {
        try {
            const data = await api.getTasks(selectedDate);
            const mappedActivities: Activity[] = data.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                type: t.activity_type as Activity['type'],
                priority: t.priority as Activity['priority'],
                date: t.task_date,
                completed: t.completed,
                completedAt: t.completed_at,
                fieldId: t.field_id,
                fieldName: t.field_name,
                aiSuggested: t.is_ai_generated
            }));
            setActivities(mappedActivities);

            if (mappedActivities.length === 0 && !insightsTriggered) {
                setInsightsTriggered(true);
                try {
                    await api.getAIInsights();
                    const refreshed = await api.getTasks(selectedDate);
                    const refreshedMapped: Activity[] = refreshed.map((t: any) => ({
                        id: t.id,
                        title: t.title,
                        description: t.description,
                        type: t.activity_type as Activity['type'],
                        priority: t.priority as Activity['priority'],
                        date: t.task_date,
                        completed: t.completed,
                        completedAt: t.completed_at,
                        fieldId: t.field_id,
                        fieldName: t.field_name,
                        aiSuggested: t.is_ai_generated
                    }));
                    setActivities(refreshedMapped);
                } catch {}
            }
        } catch (err) {
            console.error("Failed to fetch activities", err);
        }
    }, [selectedDate, insightsTriggered]);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities, refreshTrigger]);

    useEffect(() => {
        if (activeTab === 'history') {
            setHistoryLoading(true);
            api.getTaskHistory(30).then(data => {
                const mapped: Activity[] = data.tasks.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    type: t.activity_type as Activity['type'],
                    priority: t.priority as Activity['priority'],
                    date: t.task_date,
                    completed: t.completed,
                    completedAt: t.completed_at,
                    fieldId: t.field_id,
                    fieldName: t.field_name,
                    aiSuggested: t.is_ai_generated
                }));
                setHistory(mapped);
                setHistorySummary(data.summary);
                setHistoryLoading(false);
            });
        }
    }, [activeTab, fieldId, refreshTrigger]);

    const filteredActivities = activities.filter(a => a.date === selectedDate);
    const completedToday = filteredActivities.filter(a => a.completed);
    const pendingToday = filteredActivities.filter(a => !a.completed);

    const handleToggleComplete = async (id: string, currentlyCompleted: boolean) => {
        const newCompleted = !currentlyCompleted;
        setActivities(prev => prev.map(a =>
            a.id === id ? { ...a, completed: newCompleted, completedAt: newCompleted ? new Date().toISOString() : undefined } : a
        ));

        try {
            await api.updateTask(id, { completed: newCompleted });
            if (newCompleted) onActivityComplete?.(id);
        } catch (err) {
            console.error("Failed to update activity", err);
            setActivities(prev => prev.map(a =>
                a.id === id ? { ...a, completed: currentlyCompleted, completedAt: currentlyCompleted ? a.completedAt : undefined } : a
            ));
        }
    };

    const handleAddActivity = async () => {
        const taskData = {
            title: newActivity.title,
            description: newActivity.description,
            activity_type: newActivity.type,
            priority: newActivity.priority,
            task_date: selectedDate,
            field_id: fieldId
        };

        try {
            const newTask = await api.createTask(taskData);
            const activity: Activity = {
                id: newTask.id,
                title: newTask.title,
                description: newTask.description,
                type: newTask.activity_type as Activity['type'],
                priority: newTask.priority as Activity['priority'],
                date: newTask.task_date,
                completed: newTask.completed,
                completedAt: newTask.completed_at,
                fieldId: newTask.field_id,
                aiSuggested: newTask.is_ai_generated
            };

            setActivities(prev => [...prev, activity]);
            onActivityCreate?.(activity);
            setShowAddForm(false);
            setNewActivity({ title: '', description: '', type: 'custom', priority: 'normal' });
        } catch (err) {
            console.error("Failed to create activity", err);
        }
    };

    const navigateDate = (direction: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + direction);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const historyByDate = history.reduce<Record<string, Activity[]>>((acc, task) => {
        const d = task.date || 'Unknown';
        if (!acc[d]) acc[d] = [];
        acc[d].push(task);
        return acc;
    }, {});

    return (
        <div className="neu-surface p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-[16px] flex items-center justify-center" style={{ backgroundColor: 'rgba(15, 184, 133, 0.15)' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-primary)', fontSize: '24px' }}>calendar_month</span>
                    </div>
                    <div>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)', fontSize: '1.25rem' }}>Activity Log</h3>
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            Track daily farm activities
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-all"
                    style={{ backgroundColor: 'var(--ee-primary)', color: '#fff', boxShadow: 'var(--shadow-neu)', fontFamily: 'var(--font-body)' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> Add Activity
                </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-6">
                {(['today', 'history'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className="px-4 py-2 rounded-full text-sm font-bold transition-all"
                        style={{
                            backgroundColor: activeTab === tab ? 'var(--ee-text)' : 'var(--ee-bg)',
                            color: activeTab === tab ? '#fff' : 'var(--ee-muted)',
                            boxShadow: activeTab === tab ? 'var(--shadow-ambient)' : 'var(--shadow-neu)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        {tab === 'today' ? 'Daily View' : 'History (30 days)'}
                    </button>
                ))}
            </div>

            {/* ===== DAILY VIEW TAB ===== */}
            {activeTab === 'today' && (
                <>
                    {/* Date Navigation */}
                    <div className="flex items-center justify-between rounded-[16px] p-3 mb-6" style={{ backgroundColor: 'var(--ee-bg)' }}>
                        <button
                            onClick={() => navigateDate(-1)}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                            style={{ backgroundColor: 'var(--ee-surface)', boxShadow: '2px 2px 6px #D5D2CE, -2px -2px 6px #FFFFFF' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--ee-text)' }}>chevron_left</span>
                        </button>
                        <div className="text-center">
                            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)', fontSize: '1.125rem' }}>{formatDate(selectedDate)}</p>
                            <p className="text-xs" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{new Date(selectedDate + 'T00:00:00').toLocaleDateString()}</p>
                        </div>
                        <button
                            onClick={() => navigateDate(1)}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                            style={{ backgroundColor: 'var(--ee-surface)', boxShadow: '2px 2px 6px #D5D2CE, -2px -2px 6px #FFFFFF' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--ee-text)' }}>chevron_right</span>
                        </button>
                    </div>

                    {/* Pending Activities */}
                    {pendingToday.length > 0 && (
                        <div className="mb-6">
                            <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>pending_actions</span> Pending ({pendingToday.length})
                            </p>
                            <div className="space-y-3">
                                {pendingToday.map(activity => {
                                    const config = priorityConfig[activity.priority];
                                    return (
                                        <div
                                            key={activity.id}
                                            className="p-4 rounded-[16px] group transition-all"
                                            style={{ backgroundColor: config.bg }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <button
                                                    onClick={() => handleToggleComplete(activity.id, false)}
                                                    className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 transition-all"
                                                    style={{ border: '2px solid var(--ee-bg-border)' }}
                                                >
                                                    <span className="material-symbols-outlined text-transparent group-hover:text-[var(--ee-primary)] transition-colors" style={{ fontSize: '14px' }}>check</span>
                                                </button>
                                                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--ee-text)' }}>{typeIcons[activity.type] || 'checklist'}</span>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>{activity.title}</h4>
                                                        {activity.aiSuggested && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(15,184,133,0.1)', color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}>
                                                                AI
                                                            </span>
                                                        )}
                                                    </div>
                                                    {activity.description && (
                                                        <p className="text-sm mt-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{activity.description}</p>
                                                    )}
                                                    {activity.fieldName && (
                                                        <p className="text-[10px] font-bold mt-1 uppercase tracking-wider" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{activity.fieldName}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Completed Activities */}
                    {completedToday.length > 0 && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                Completed ({completedToday.length})
                            </p>
                            <div className="space-y-2">
                                {completedToday.map(activity => (
                                    <div
                                        key={activity.id}
                                        className="p-3 rounded-[12px] flex items-center gap-3 group"
                                        style={{ backgroundColor: 'rgba(15, 184, 133, 0.06)' }}
                                    >
                                        <button
                                            onClick={() => handleToggleComplete(activity.id, true)}
                                            className="flex-shrink-0 w-5 h-5 rounded-lg flex items-center justify-center text-xs"
                                            style={{ backgroundColor: 'var(--ee-primary)', color: '#fff' }}
                                            title="Undo completion"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                                        </button>
                                        <span className="text-sm line-through flex-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{activity.title}</span>
                                        <span className="ml-auto text-xs" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                            {activity.completedAt && new Date(activity.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredActivities.length === 0 && (
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined mb-4" style={{ fontSize: '48px', color: 'var(--ee-muted)' }}>event_busy</span>
                            <p className="font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>No activities for this day</p>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="mt-4 text-sm font-bold"
                                style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                            >
                                + Add one now
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ===== HISTORY TAB ===== */}
            {activeTab === 'history' && (
                <>
                    {historySummary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            {[
                                { label: 'Total Tasks', value: historySummary.total, color: 'var(--ee-text)' },
                                { label: 'Completed', value: historySummary.completed, color: 'var(--ee-primary)' },
                                { label: 'Pending', value: historySummary.pending, color: 'var(--ee-sun)' },
                                { label: 'Completion Rate', value: `${historySummary.completion_rate}%`, color: 'var(--ee-primary)' },
                            ].map(stat => (
                                <div key={stat.label} className="rounded-[16px] p-4 text-center" style={{ backgroundColor: 'var(--ee-bg)' }}>
                                    <p className="text-2xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: stat.color }}>{stat.value}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {historyLoading ? (
                        <div className="text-center py-8">
                            <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-3" style={{ border: '4px solid var(--ee-bg-pressed)', borderTopColor: 'var(--ee-primary)' }}></div>
                            <p className="text-sm font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Loading history...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined mb-4" style={{ fontSize: '48px', color: 'var(--ee-muted)' }}>analytics</span>
                            <p className="font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>No task history yet</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--ee-bg-border)', fontFamily: 'var(--font-body)' }}>Completed tasks will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                            {Object.entries(historyByDate).map(([dateStr, tasks]) => (
                                <div key={dateStr}>
                                    <p className="text-xs font-bold uppercase tracking-widest mb-2 sticky top-0 py-1" style={{ color: 'var(--ee-muted)', backgroundColor: 'var(--ee-surface)', fontFamily: 'var(--font-body)' }}>
                                        {formatDate(dateStr)} — {tasks.filter(t => t.completed).length}/{tasks.length} done
                                    </p>
                                    <div className="space-y-2">
                                        {tasks.map(task => (
                                            <div
                                                key={task.id}
                                                className="p-3 rounded-[12px] flex items-center gap-3"
                                                style={{ backgroundColor: task.completed ? 'rgba(15,184,133,0.06)' : 'rgba(220,80,80,0.04)' }}
                                            >
                                                <span
                                                    className="w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold"
                                                    style={{
                                                        backgroundColor: task.completed ? 'var(--ee-primary)' : 'rgba(220,80,80,0.2)',
                                                        color: task.completed ? '#fff' : '#c44',
                                                    }}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{task.completed ? 'check' : 'close'}</span>
                                                </span>
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--ee-text)' }}>{typeIcons[task.type] || 'checklist'}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold truncate ${task.completed ? 'line-through' : ''}`} style={{ color: task.completed ? 'var(--ee-muted)' : '#c44', fontFamily: 'var(--font-body)' }}>
                                                        {task.title}
                                                    </p>
                                                    {task.fieldName && (
                                                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{task.fieldName}</p>
                                                    )}
                                                </div>
                                                {task.completedAt && (
                                                    <span className="text-[10px] font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                                        {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                                {task.aiSuggested && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--ee-bg)', color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}>AI</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Add Activity Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(45,58,48,0.4)', backdropFilter: 'blur(8px)' }}>
                    <div className="rounded-[24px] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--ee-surface)', boxShadow: 'var(--shadow-ambient)' }}>
                        <h3 className="mb-4" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)', fontSize: '1.25rem' }}>Add New Activity</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase block mb-2" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Title *</label>
                                <input
                                    type="text"
                                    value={newActivity.title}
                                    onChange={e => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. Apply herbicide"
                                    className="w-full p-3 rounded-[16px] outline-none"
                                    style={{ backgroundColor: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase block mb-2" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Description</label>
                                <textarea
                                    value={newActivity.description}
                                    onChange={e => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Optional details..."
                                    className="w-full p-3 rounded-[16px] outline-none h-20 resize-none"
                                    style={{ backgroundColor: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase block mb-2" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Type</label>
                                    <select
                                        value={newActivity.type}
                                        onChange={e => setNewActivity(prev => ({ ...prev, type: e.target.value as Activity['type'] }))}
                                        className="w-full p-3 rounded-[16px] outline-none"
                                        style={{ backgroundColor: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                    >
                                        <option value="irrigation">Irrigation</option>
                                        <option value="spraying">Spraying</option>
                                        <option value="scouting">Scouting</option>
                                        <option value="harvest">Harvest</option>
                                        <option value="fertilize">Fertilize</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase block mb-2" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Priority</label>
                                    <select
                                        value={newActivity.priority}
                                        onChange={e => setNewActivity(prev => ({ ...prev, priority: e.target.value as Activity['priority'] }))}
                                        className="w-full p-3 rounded-[16px] outline-none"
                                        style={{ backgroundColor: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                    >
                                        <option value="urgent">Urgent</option>
                                        <option value="high">High</option>
                                        <option value="normal">Normal</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="flex-1 py-3 rounded-full font-bold transition-all"
                                style={{ backgroundColor: 'var(--ee-bg)', color: 'var(--ee-muted)', boxShadow: 'var(--shadow-neu)', fontFamily: 'var(--font-body)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddActivity}
                                disabled={!newActivity.title}
                                className="flex-1 py-3 rounded-full font-bold disabled:opacity-50 transition-all"
                                style={{ backgroundColor: 'var(--ee-primary)', color: '#fff', boxShadow: 'var(--shadow-neu)', fontFamily: 'var(--font-body)' }}
                            >
                                Add Activity
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLog;
