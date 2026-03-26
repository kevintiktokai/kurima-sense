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
    refreshTrigger?: number; // Increment to force re-fetch (e.g. when plan actions are added)
    onActivityComplete?: (id: string) => void;
    onActivityCreate?: (activity: Omit<Activity, 'id'>) => void;
}

const typeIcons: Record<Activity['type'], string> = {
    irrigation: '💧',
    spraying: '💊',
    scouting: '🔍',
    harvest: '🌾',
    fertilize: '🧪',
    custom: '📋'
};

const priorityColors: Record<Activity['priority'], string> = {
    urgent: 'bg-red-100 border-red-200 text-red-700',
    high: 'bg-amber-100 border-amber-200 text-amber-700',
    normal: 'bg-brand-lime/20 border-brand-lime/40 text-brand-dark',
    low: 'bg-slate-100 border-slate-200 text-slate-600'
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

    // Fetch activities for selected date
    const fetchActivities = useCallback(async () => {
        try {
            const data = await api.getTasks(selectedDate, fieldId);
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
        } catch (err) {
            console.error("Failed to fetch activities", err);
        }
    }, [selectedDate, fieldId]);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities, refreshTrigger]);

    // Fetch history when tab switches
    useEffect(() => {
        if (activeTab === 'history') {
            setHistoryLoading(true);
            api.getTaskHistory(30, fieldId).then(data => {
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
        // Optimistic update
        setActivities(prev => prev.map(a =>
            a.id === id ? { ...a, completed: newCompleted, completedAt: newCompleted ? new Date().toISOString() : undefined } : a
        ));

        try {
            await api.updateTask(id, { completed: newCompleted });
            if (newCompleted) onActivityComplete?.(id);
        } catch (err) {
            console.error("Failed to update activity", err);
            // Revert on failure
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

    // Group history by date for display
    const historyByDate = history.reduce<Record<string, Activity[]>>((acc, task) => {
        const d = task.date || 'Unknown';
        if (!acc[d]) acc[d] = [];
        acc[d].push(task);
        return acc;
    }, {});

    return (
        <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-lime rounded-xl flex items-center justify-center text-2xl">
                        📅
                    </div>
                    <div>
                        <h3 className="font-black text-brand-dark text-xl">Activity Log</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Track daily farm activities
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-brand-dark/90 transition-colors flex items-center gap-2"
                >
                    <span className="text-lg">+</span> Add Activity
                </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('today')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'today'
                            ? 'bg-brand-dark text-white shadow-lg'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                    Daily View
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'history'
                            ? 'bg-brand-dark text-white shadow-lg'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                    History (30 days)
                </button>
            </div>

            {/* ===== DAILY VIEW TAB ===== */}
            {activeTab === 'today' && (
                <>
                    {/* Date Navigation */}
                    <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 mb-6">
                        <button
                            onClick={() => navigateDate(-1)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-brand-lime transition-colors"
                        >
                            ←
                        </button>
                        <div className="text-center">
                            <p className="font-black text-brand-dark text-lg">{formatDate(selectedDate)}</p>
                            <p className="text-xs text-slate-400">{new Date(selectedDate + 'T00:00:00').toLocaleDateString()}</p>
                        </div>
                        <button
                            onClick={() => navigateDate(1)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-brand-lime transition-colors"
                        >
                            →
                        </button>
                    </div>

                    {/* Pending Activities */}
                    {pendingToday.length > 0 && (
                        <div className="mb-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                                📋 Pending ({pendingToday.length})
                            </p>
                            <div className="space-y-3">
                                {pendingToday.map(activity => (
                                    <div
                                        key={activity.id}
                                        className={`${priorityColors[activity.priority]} border p-4 rounded-2xl group hover:shadow-sm transition-all`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <button
                                                onClick={() => handleToggleComplete(activity.id, false)}
                                                className="flex-shrink-0 w-6 h-6 border-2 border-current rounded-lg opacity-50 hover:opacity-100 hover:bg-white/50 transition-all flex items-center justify-center"
                                            >
                                                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                            <span className="text-xl">{typeIcons[activity.type] || '📋'}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold">{activity.title}</h4>
                                                    {activity.aiSuggested && (
                                                        <span className="text-[10px] font-bold bg-white/50 px-2 py-0.5 rounded-lg">
                                                            🤖 AI
                                                        </span>
                                                    )}
                                                </div>
                                                {activity.description && (
                                                    <p className="text-sm opacity-70 mt-1">{activity.description}</p>
                                                )}
                                                {activity.fieldName && (
                                                    <p className="text-[10px] font-bold opacity-50 mt-1 uppercase tracking-wider">{activity.fieldName}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Activities */}
                    {completedToday.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                                Completed ({completedToday.length})
                            </p>
                            <div className="space-y-2">
                                {completedToday.map(activity => (
                                    <div
                                        key={activity.id}
                                        className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-3 group"
                                    >
                                        <button
                                            onClick={() => handleToggleComplete(activity.id, true)}
                                            className="flex-shrink-0 w-5 h-5 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-xs hover:bg-emerald-400 transition-colors"
                                            title="Undo completion"
                                        >
                                            ✓
                                        </button>
                                        <span className="text-sm line-through text-slate-500 flex-1">{activity.title}</span>
                                        <span className="ml-auto text-xs text-slate-400">
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
                            <div className="text-5xl mb-4">📭</div>
                            <p className="font-bold text-slate-400">No activities for this day</p>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="mt-4 text-sm text-brand-dark font-bold hover:underline"
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
                    {/* Summary Stats */}
                    {historySummary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <div className="bg-slate-50 rounded-2xl p-4 text-center">
                                <p className="text-2xl font-black text-brand-dark">{historySummary.total}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</p>
                            </div>
                            <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                                <p className="text-2xl font-black text-emerald-600">{historySummary.completed}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
                            </div>
                            <div className="bg-amber-50 rounded-2xl p-4 text-center">
                                <p className="text-2xl font-black text-amber-600">{historySummary.pending}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
                            </div>
                            <div className="bg-brand-lime/10 rounded-2xl p-4 text-center">
                                <p className="text-2xl font-black text-brand-dark">{historySummary.completion_rate}%</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completion Rate</p>
                            </div>
                        </div>
                    )}

                    {historyLoading ? (
                        <div className="text-center py-8">
                            <div className="w-8 h-8 border-4 border-brand-lime border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-slate-400 text-sm font-bold">Loading history...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-5xl mb-4">📊</div>
                            <p className="font-bold text-slate-400">No task history yet</p>
                            <p className="text-sm text-slate-300 mt-1">Completed tasks will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                            {Object.entries(historyByDate).map(([dateStr, tasks]) => (
                                <div key={dateStr}>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 sticky top-0 bg-white py-1">
                                        {formatDate(dateStr)} — {tasks.filter(t => t.completed).length}/{tasks.length} done
                                    </p>
                                    <div className="space-y-2">
                                        {tasks.map(task => (
                                            <div
                                                key={task.id}
                                                className={`p-3 rounded-xl flex items-center gap-3 ${
                                                    task.completed
                                                        ? 'bg-emerald-50 border border-emerald-100'
                                                        : 'bg-red-50 border border-red-100'
                                                }`}
                                            >
                                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                                                    task.completed
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-red-200 text-red-600'
                                                }`}>
                                                    {task.completed ? '✓' : '✗'}
                                                </span>
                                                <span className="text-xl">{typeIcons[task.type] || '📋'}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold truncate ${task.completed ? 'text-slate-500 line-through' : 'text-red-700'}`}>
                                                        {task.title}
                                                    </p>
                                                    {task.fieldName && (
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{task.fieldName}</p>
                                                    )}
                                                </div>
                                                {task.completedAt && (
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                                {task.aiSuggested && (
                                                    <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">🤖</span>
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="font-black text-xl text-brand-dark mb-4">Add New Activity</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Title *</label>
                                <input
                                    type="text"
                                    value={newActivity.title}
                                    onChange={e => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. Apply herbicide"
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-brand-lime outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Description</label>
                                <textarea
                                    value={newActivity.description}
                                    onChange={e => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Optional details..."
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-brand-lime outline-none h-20 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Type</label>
                                    <select
                                        value={newActivity.type}
                                        onChange={e => setNewActivity(prev => ({ ...prev, type: e.target.value as Activity['type'] }))}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:border-brand-lime outline-none"
                                    >
                                        <option value="irrigation">💧 Irrigation</option>
                                        <option value="spraying">💊 Spraying</option>
                                        <option value="scouting">🔍 Scouting</option>
                                        <option value="harvest">🌾 Harvest</option>
                                        <option value="fertilize">🧪 Fertilize</option>
                                        <option value="custom">📋 Custom</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Priority</label>
                                    <select
                                        value={newActivity.priority}
                                        onChange={e => setNewActivity(prev => ({ ...prev, priority: e.target.value as Activity['priority'] }))}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:border-brand-lime outline-none"
                                    >
                                        <option value="urgent">🔴 Urgent</option>
                                        <option value="high">🟠 High</option>
                                        <option value="normal">🟢 Normal</option>
                                        <option value="low">⚪ Low</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-500 hover:border-slate-400 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddActivity}
                                disabled={!newActivity.title}
                                className="flex-1 py-3 bg-brand-dark text-white rounded-xl font-bold disabled:opacity-50 hover:bg-brand-dark/90 transition-colors"
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
