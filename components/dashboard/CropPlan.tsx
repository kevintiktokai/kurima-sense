"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { FieldData } from './types';

interface CropPlanProps {
    selectedField: FieldData | null;
    onActionsAdded?: () => void; // Callback to refresh activity log when actions are converted to tasks
}

interface PlanData {
    current_stage: string | { stage: string; description?: string };
    days_since_planting?: number;
    days_to_harvest?: number;
    progress_percent?: number;
    projected_yield: number | null;
    yield_potential: number | null;
    yield_gap_analysis: string;
    next_actions: string[];
    pest_alert?: string;
    full_plan: { phase: string; date: string; activity: string; status: 'completed' | 'pending' | 'future' }[];
    variety_info?: { name: string; breeder?: string; days_to_maturity?: number } | null;
    confidence_score?: number;
    methodology?: string;
    disclaimer?: string;
    error?: string;
}

const CropPlan: React.FC<CropPlanProps> = ({ selectedField, onActionsAdded }) => {
    const [plan, setPlan] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(false);
    const [addingActions, setAddingActions] = useState(false);
    const [actionsAdded, setActionsAdded] = useState(false);

    useEffect(() => {
        if (selectedField) {
            setLoading(true);
            setActionsAdded(false);
            api.generateYieldProjection(selectedField.id).then(data => {
                setPlan(data);
                setLoading(false);
            }).catch(() => {
                setPlan(null);
                setLoading(false);
            });
        }
    }, [selectedField]);

    const handleAddActionsToTasks = async () => {
        if (!plan?.next_actions?.length || !selectedField) return;
        setAddingActions(true);
        try {
            await api.createTasksFromPlan(plan.next_actions, selectedField.id);
            setActionsAdded(true);
            onActionsAdded?.();
        } catch (err) {
            console.error("Failed to add actions to tasks", err);
        } finally {
            setAddingActions(false);
        }
    };

    // Calculate days since planting from field data
    const plantingDate = selectedField?.plantingDate || selectedField?.planting_date;
    const daysSincePlanting = plantingDate
        ? Math.floor((Date.now() - new Date(plantingDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const currentStageText = plan
        ? typeof plan.current_stage === 'string'
            ? plan.current_stage
            : plan.current_stage?.stage || 'Unknown'
        : '';

    if (!selectedField) {
        return (
            <div className="h-full flex items-center justify-center p-10 bg-slate-50/50 rounded-[3.5rem] border-2 border-dashed border-slate-200">
                <div className="text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🌱</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-400">Select a field to view its plan</h3>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-10 space-y-4">
                <div className="w-12 h-12 border-4 border-brand-lime border-t-transparent rounded-full animate-spin"></div>
                <p className="text-brand-dark font-bold animate-pulse">Consulting AI Agronomist...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header / Context Card */}
            <div id="crop-plan-header" className="bg-gradient-to-br from-brand-dark to-slate-900 p-5 sm:p-8 rounded-[24px] sm:rounded-[2.5rem] lg:rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-brand-lime/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                    {/* Top Row: Field Name + Yield */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div className="min-w-0">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black mb-1 truncate">{selectedField.name}</h2>
                            <p className="text-brand-lime font-bold uppercase tracking-widest text-[10px] sm:text-sm truncate">
                                {selectedField.crop}
                                {selectedField.variety ? ` • ${selectedField.variety}` : ''}
                                {currentStageText ? ` • ${currentStageText.split(' - ')[0]}` : ''}
                            </p>
                        </div>
                        {plan?.projected_yield != null && (
                            <div className="sm:text-right flex-shrink-0">
                                <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase mb-1">Yield Projection</p>
                                <div className="flex items-baseline gap-1.5 sm:gap-2">
                                    <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-lime">{plan.projected_yield}t</span>
                                    {plan.yield_potential != null && (
                                        <span className="text-slate-500 font-bold text-xs sm:text-base">/ {plan.yield_potential}t pot.</span>
                                    )}
                                </div>
                                {plan.confidence_score != null && (
                                    <p className="text-slate-500 text-[10px] sm:text-xs mt-1">Confidence: {plan.confidence_score}%</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Field Context Chips */}
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        {plantingDate && (
                            <div className="bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Planted</p>
                                <p className="text-xs sm:text-sm font-black text-white">
                                    {new Date(plantingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        )}
                        {daysSincePlanting != null && daysSincePlanting > 0 && (
                            <div className="bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age</p>
                                <p className="text-xs sm:text-sm font-black text-white">{daysSincePlanting} days</p>
                            </div>
                        )}
                        {plan?.days_to_harvest != null && plan.days_to_harvest > 0 && (
                            <div className="bg-brand-lime/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl">
                                <p className="text-[9px] sm:text-[10px] font-bold text-brand-lime/70 uppercase tracking-wider">Harvest In</p>
                                <p className="text-xs sm:text-sm font-black text-brand-lime">{plan.days_to_harvest} days</p>
                            </div>
                        )}
                        {plan?.variety_info?.days_to_maturity && (
                            <div className="bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Maturity</p>
                                <p className="text-xs sm:text-sm font-black text-white">{plan.variety_info.days_to_maturity} days</p>
                            </div>
                        )}
                        <div className="bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Area</p>
                            <p className="text-xs sm:text-sm font-black text-white">{selectedField.area?.toFixed(1)} ha</p>
                        </div>
                        {plan?.variety_info?.breeder && (
                            <div className="bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Breeder</p>
                                <p className="text-xs sm:text-sm font-black text-white">{plan.variety_info.breeder}</p>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {plan?.progress_percent != null && (
                        <div className="mt-5">
                            <div className="flex justify-between text-xs text-slate-400 font-bold mb-1">
                                <span>Season Progress</span>
                                <span>{Math.round(plan.progress_percent)}%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-brand-lime to-amber-400 transition-all duration-1000"
                                    style={{ width: `${plan.progress_percent}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* No data state */}
                {!plan?.projected_yield && !loading && (
                    <div className="relative z-10 mt-4 bg-white/10 rounded-2xl p-4">
                        <p className="text-amber-300 text-sm font-bold">
                            {plan?.error || (!plantingDate
                                ? 'Set a planting date and crop variety on this field to generate a yield projection.'
                                : 'Yield projection unavailable. Check field configuration.')}
                        </p>
                    </div>
                )}
            </div>

            {/* Pest Alert Banner */}
            {plan?.pest_alert && plan.pest_alert !== 'No specific alerts for this stage' && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                    <span className="text-xl">🐛</span>
                    <div>
                        <p className="text-sm font-bold text-amber-900">Current Pest/Disease Alert</p>
                        <p className="text-sm text-amber-700 mt-0.5">{plan.pest_alert}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Immediate Actions */}
                <div id="next-actions-card" className="bg-white p-5 sm:p-8 rounded-[20px] sm:rounded-[2.5rem] lg:rounded-[3.5rem] shadow-xl border border-slate-50">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-brand-dark flex items-center gap-2">
                            <span className="bg-rose-100 text-rose-600 p-2 rounded-xl">⚡</span>
                            Next 2 Weeks
                        </h3>
                        {plan?.next_actions && plan.next_actions.length > 0 && (
                            <button
                                onClick={handleAddActionsToTasks}
                                disabled={addingActions || actionsAdded}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                                    actionsAdded
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-brand-lime/20 text-brand-dark hover:bg-brand-lime/40'
                                } disabled:opacity-50`}
                            >
                                {actionsAdded ? 'Added!' : addingActions ? 'Adding...' : 'Add to Tasks'}
                            </button>
                        )}
                    </div>
                    <div className="space-y-4">
                        {plan?.next_actions?.map((action, i) => {
                            const text = typeof action === 'string' ? action : (action as any).action || (action as any).title || JSON.stringify(action);
                            return (
                                <div key={i} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-brand-lime/50 transition-colors">
                                    <div className="w-6 h-6 rounded-full border-2 border-brand-lime/40 flex-shrink-0 mt-0.5 flex items-center justify-center text-brand-lime text-xs font-black">
                                        {i + 1}
                                    </div>
                                    <p className="font-bold text-slate-700 text-sm">{text}</p>
                                </div>
                            );
                        })}
                        {(!plan?.next_actions || plan.next_actions.length === 0) && (
                            <p className="text-sm text-slate-400 italic text-center py-4">
                                {!plantingDate
                                    ? 'Set a planting date to get tailored actions.'
                                    : 'No specific actions for this period.'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Timeline / Cycle */}
                <div id="growth-cycle-timeline" className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-[20px] sm:rounded-[2.5rem] lg:rounded-[3.5rem] shadow-xl border border-slate-50">
                    <h3 className="text-xl font-black text-brand-dark mb-6 flex items-center gap-2">
                        <span className="bg-brand-lime/20 text-brand-dark p-2 rounded-xl">📅</span>
                        Growth Cycle
                    </h3>

                    <div className="relative pl-4 space-y-8 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                        {plan?.full_plan?.map((phase, i) => {
                            let displayDate = phase.date;
                            try {
                                if (phase.date && phase.date.includes('-')) {
                                    const d = new Date(phase.date);
                                    if (!isNaN(d.getTime())) {
                                        displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    }
                                }
                            } catch { /* ignore */ }

                            return (
                                <div key={i} className="relative flex gap-6 items-start group">
                                    <div className={`w-4 h-4 rounded-full mt-1.5 z-10 border-4 border-white shadow-sm
                                        ${phase.status === 'completed' ? 'bg-brand-lime' : phase.status === 'pending' ? 'bg-amber-400 ring-4 ring-amber-100' : 'bg-slate-300'}
                                    `}></div>
                                    <div className={`flex-1 p-4 rounded-2xl transition-colors ${
                                        phase.status === 'pending' ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 group-hover:bg-brand-beige/30'
                                    }`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold uppercase text-slate-400">{displayDate}</span>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg
                                                ${phase.status === 'completed' ? 'bg-brand-lime/20 text-brand-dark' :
                                                  phase.status === 'pending' ? 'bg-amber-200 text-amber-800' :
                                                  'bg-slate-200 text-slate-500'}
                                            `}>{phase.status}</span>
                                        </div>
                                        <h4 className="font-black text-brand-dark">
                                            {typeof phase.phase === 'string' ? phase.phase : (phase as any).title || (phase as any).name || 'Milestone'}
                                        </h4>
                                        <p className="text-sm text-slate-600 font-medium mt-1">
                                            {typeof phase.activity === 'string' ? phase.activity : (phase as any).action || (phase as any).description || JSON.stringify(phase.activity)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        {(!plan?.full_plan || plan.full_plan.length === 0) && !loading && (
                            <div className="text-center py-10">
                                <p className="text-slate-400 font-bold italic">
                                    {!plantingDate
                                        ? 'Set a planting date and variety to generate a seasonal plan.'
                                        : 'No seasonal milestones generated. Try refreshing or updating field data.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Methodology & Disclaimer */}
            {plan?.disclaimer && (
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">{plan.disclaimer}</p>
                </div>
            )}
        </div>
    );
};

export default CropPlan;
