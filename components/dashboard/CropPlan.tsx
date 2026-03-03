import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { FieldData } from './types';

interface CropPlanProps {
    selectedField: FieldData | null;
}

interface PlanData {
    current_stage: string | { stage: string; description?: string };
    projected_yield: number;
    yield_potential: number;
    yield_gap_analysis: string;
    next_actions: string[];
    full_plan: { phase: string, date: string, activity: string, status: 'completed' | 'pending' | 'future' }[];
}

const CropPlan: React.FC<CropPlanProps> = ({ selectedField }) => {
    const [plan, setPlan] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedField) {
            setLoading(true);
            api.generateYieldProjection(selectedField.id).then(data => {
                setPlan(data);
                setLoading(false);
            });
        }
    }, [selectedField]);

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
            {/* Header / Yield Card */}
            <div id="crop-plan-header" className="bg-gradient-to-br from-brand-dark to-slate-900 p-8 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-brand-lime/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-black mb-1">{selectedField.name}</h2>
                        <p className="text-brand-lime font-bold uppercase tracking-widest text-sm">{selectedField.crop} • {typeof plan?.current_stage === 'string' ? plan.current_stage : plan?.current_stage?.stage || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Yield Projection</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-brand-lime">{plan?.projected_yield}t</span>
                            <span className="text-slate-500 font-bold">/ {plan?.yield_potential}t pot.</span>
                        </div>
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Immediate Actions */}
                <div id="next-actions-card" className="bg-white p-8 rounded-[3.5rem] shadow-xl border border-slate-50">
                    <h3 className="text-xl font-black text-brand-dark mb-6 flex items-center gap-2">
                        <span className="bg-rose-100 text-rose-600 p-2 rounded-xl">⚡</span>
                        Next 2 Weeks
                    </h3>
                    <div className="space-y-4">
                        {plan?.next_actions?.map((action, i) => (
                            <div key={i} className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-brand-lime/50 transition-colors">
                                <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex-shrink-0"></div>
                                <p className="font-bold text-slate-700 text-sm">
                                    {typeof action === 'string' ? action : (action as any).action || (action as any).title || JSON.stringify(action)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeline / Cycle */}
                <div id="growth-cycle-timeline" className="lg:col-span-2 bg-white p-8 rounded-[3.5rem] shadow-xl border border-slate-50">
                    <h3 className="text-xl font-black text-brand-dark mb-6 flex items-center gap-2">
                        <span className="bg-brand-lime/20 text-brand-dark p-2 rounded-xl">📅</span>
                        Growth Cycle (AI Plan)
                    </h3>

                    <div className="relative pl-4 space-y-8 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                        {plan?.full_plan?.map((phase, i) => {
                            // Format date for display
                            let displayDate = phase.date;
                            try {
                                if (phase.date && phase.date.includes('-')) {
                                    const d = new Date(phase.date);
                                    if (!isNaN(d.getTime())) {
                                        displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    }
                                }
                            } catch (e) {
                                console.error("Error formatting date", e);
                            }

                            return (
                                <div key={i} className="relative flex gap-6 items-start group">
                                    <div className={`w-4 h-4 rounded-full mt-1.5 z-10 border-4 border-white shadow-sm
                                        ${phase.status === 'completed' ? 'bg-brand-lime' : phase.status === 'pending' ? 'bg-amber-400' : 'bg-slate-300'}
                                    `}></div>
                                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl group-hover:bg-brand-beige/30 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold uppercase text-slate-400">{displayDate}</span>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg
                                                ${phase.status === 'completed' ? 'bg-brand-lime/20 text-brand-dark' : 'bg-slate-200 text-slate-500'}
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
                                <p className="text-slate-400 font-bold italic">No seasonal milestones generated. Try refreshing or updating field data.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CropPlan;
