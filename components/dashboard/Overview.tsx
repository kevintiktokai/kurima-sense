"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from '@/services/api';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import { RiskRadar, RiskItem, AIInsightCard, ActionQueue, ActionItem, AIInsight, YieldConfidenceChart, GrowthStageTracker } from '@/components/ai';
import { DashboardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';

const generateProjectionData = (bands: { low: number, mid: number, high: number } | undefined | null) => {
    // Defensive check - ensure bands is a valid object with numeric values
    if (!bands || typeof bands !== 'object') return [];

    const low = typeof bands.low === 'number' ? bands.low : 10;
    const mid = typeof bands.mid === 'number' ? bands.mid : 12.5;
    const high = typeof bands.high === 'number' ? bands.high : 15;

    // Simulate a growth season curve
    const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Harvest'];
    return months.map((month, index) => {
        const progress = (index + 1) / months.length;
        // Simple linear growth simulation for accumulation

        return {
            name: month,
            low: +(low * progress).toFixed(1),
            mid: +(mid * progress).toFixed(1),
            high: +(high * progress).toFixed(1),
            // Simulate actual data for first 3 months
            actual: index < 3 ? +(mid * progress * (0.95 + Math.random() * 0.1)).toFixed(1) : undefined
        };
    });
};

const Overview: React.FC = () => {
    const { profile } = useUserProfile();
    const [stats, setStats] = useState<any>(null);
    const [fields, setFields] = useState<any[]>([]);
    const [insight, setInsight] = useState<string>("");
    const [risks, setRisks] = useState<RiskItem[]>([]);
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [yieldAnalysis, setYieldAnalysis] = useState<any>(null);
    const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);

    const loadData = async () => {
        setLoading(true);
        let currentFieldsData = null;
        try {
            // Phase 1: render the dashboard fast
            const [statsData, fieldsData] = await Promise.all([
                api.getDashboardStats(),
                api.getFields(),
            ]);
            setStats(statsData);
            setFields(fieldsData);
            currentFieldsData = fieldsData;
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }

        // Phase 2: load AI extras without blocking UI
        try {
            api.getProactiveInsight({ user_id: 'web-user-01', location: { lat: -17.82, lon: 31.05 } })
                .then(setInsight)
                .catch(() => {});

            api.getAIInsights()
                .then((aiInsightsData) => {
                    if (!aiInsightsData) return;
                    if (aiInsightsData.risks) setRisks(aiInsightsData.risks.map((r: any) => ({ ...r, type: r.type, trend: r.trend })));
                    if (aiInsightsData.actions) setActions(aiInsightsData.actions.map((a: any) => ({ ...a, type: a.type, priority: a.priority })));
                    if (aiInsightsData.insights) setInsights(aiInsightsData.insights.map((i: any) => ({ ...i, type: i.type, severity: i.severity })));
                })
                .catch(() => {});

            // Trigger detailed yield analysis for primary field if available
            if (currentFieldsData && currentFieldsData.length > 0) {
                api.generateYieldProjection(currentFieldsData[0].id)
                    .then(data => setYieldAnalysis(data))
                    .catch(err => console.error("Yield projection background fetch failed", err));
            }
        } catch {}
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading) return <DashboardSkeleton />;


    const chartData = stats?.chartData || [];
    const activeFieldsCount = fields.length;
    const totalHectares = fields.reduce((sum, f) => sum + (f.area || 0), 0);
    const primaryField = fields[selectedFieldIndex] || fields[0];

    // Handle field selection change
    const handleFieldChange = (index: number) => {
        setSelectedFieldIndex(index);
        const field = fields[index];
        if (field) {
            setYieldAnalysis(null); // Reset to show loading
            api.generateYieldProjection(field.id)
                .then(data => setYieldAnalysis(data))
                .catch(err => console.error('Yield projection failed', err));
        }
    };

    // Handle action completion
    const handleActionComplete = async (actionId: string) => {
        // Optimistic update
        setActions(prev => prev.map(a =>
            a.id === actionId ? { ...a, completed: true } : a
        ));

        try {
            await api.updateTask(actionId, { completed: true });
        } catch (err) {
            console.error("Failed to persist task completion", err);
            // Revert on failure
            setActions(prev => prev.map(a =>
                a.id === actionId ? { ...a, completed: false } : a
            ));
        }
    };


    // Calculate Breakdown Averages
    const avgNdvi = fields.length
        ? (fields.reduce((sum, f) => sum + (f.ndvi || 0), 0) / fields.length).toFixed(2)
        : "0.00";
    const avgMoisture = fields.length
        ? Math.round(fields.reduce((sum, f) => sum + (f.soilMoisture || 0), 0) / fields.length)
        : 0;

    return (
        <div className="grid grid-cols-12 gap-4 lg:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 relative">

            {/* Welcome Widget (Left 8) */}
            <div id="dashboard-welcome" className="col-span-12 lg:col-span-8 glass-card p-8 lg:p-16 rounded-[2.5rem] lg:rounded-[4rem] shadow-xl flex flex-col justify-center border border-white/40 relative overflow-hidden h-full min-h-[350px]">
                <div className="relative z-10 flex-1 flex flex-col justify-center">
                    <h3 className="text-3xl lg:text-5xl font-black text-brand-dark mb-4 tracking-tighter leading-tight">
                        {new Date().getHours() < 12 ? 'Good Morning' : 'Good Afternoon'}, {profile?.full_name?.split(' ')[0] || 'Farmer'}.
                    </h3>
                    <div className="bg-brand-lime/10 p-3 lg:p-4 rounded-xl lg:rounded-2xl mb-6 inline-block">
                        <p className="text-brand-dark font-bold text-sm lg:text-lg">💡 Tip: {insight}</p>
                    </div>
                    <p className="text-slate-500 font-medium text-base lg:text-xl max-w-lg leading-relaxed">
                        Your farm assets in Zimbabwe are thriving. {activeFieldsCount} active fields monitored.
                    </p>
                    <div className="flex flex-wrap gap-4 lg:gap-6 mt-8 lg:mt-10">
                        <div className="bg-brand-beige/50 backdrop-blur-sm px-6 lg:px-8 py-3 lg:py-4 rounded-2xl lg:rounded-[2rem] flex-1 min-w-[140px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Fields</p>
                            <p className="text-2xl lg:text-3xl font-black text-brand-dark">{activeFieldsCount}</p>
                        </div>
                        <div className="bg-brand-beige/50 backdrop-blur-sm px-6 lg:px-8 py-3 lg:py-4 rounded-2xl lg:rounded-[2rem] flex-1 min-w-[140px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Area</p>
                            <p className="text-2xl lg:text-3xl font-black text-brand-dark">{totalHectares.toFixed(1)} ha</p>
                        </div>
                    </div>
                </div>
                {/* Decorative circle */}
                <div className="absolute top-0 right-0 w-48 lg:w-64 h-48 lg:h-64 bg-brand-lime/5 rounded-full -mr-24 lg:-mr-32 -mt-24 lg:-mt-32"></div>
            </div>

            {/* Action Queue (Right Column - Top Priority) */}
            <div id="action-queue" className="col-span-12 lg:col-span-4 flex flex-col h-full">
                {actions.length > 0 ? (
                    <ActionQueue
                        actions={actions.filter(a => !a.completed)}
                        title="Today's Priorities"
                        onActionComplete={handleActionComplete}
                    />
                ) : (
                    /* Fallback to Field Breakdown if no actions */
                    <div className="bg-brand-dark p-8 lg:p-10 rounded-[2.5rem] lg:rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between h-full min-h-[350px]">
                        <div className="relative z-10 w-full">
                            <h4 className="text-lg lg:text-xl font-black mb-1">Field Breakdown</h4>
                            <p className="text-[10px] lg:text-xs text-white/60 font-medium mb-6 lg:mb-8 uppercase tracking-widest">Satellite aggregation</p>
                            <div className="space-y-6 lg:space-y-8">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs lg:text-sm font-bold opacity-80 uppercase tracking-tighter">Avg NDVI</span>
                                        <span className="text-xl lg:text-2xl font-black text-brand-lime">{avgNdvi}</span>
                                    </div>
                                    <div className="w-full h-1.5 lg:h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-lime transition-all duration-1000" style={{ width: `${parseFloat(avgNdvi) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs lg:text-sm font-bold opacity-80 uppercase tracking-tighter">Soil Moisture</span>
                                        <span className="text-xl lg:text-2xl font-black text-sky-400">{avgMoisture}%</span>
                                    </div>
                                    <div className="w-full h-1.5 lg:h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-sky-400 transition-all duration-1000" style={{ width: `${avgMoisture}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-48 lg:w-56 h-48 lg:h-56 bg-brand-lime opacity-10 rounded-full blur-[50px] lg:blur-[60px] pointer-events-none -mr-8 lg:-mr-10 -mt-8 lg:-mt-10"></div>
                    </div>
                )}
            </div>

            {/* Middle Row: Field Selector, Yield Prediction & Weather */}
            <div className="col-span-12 grid grid-cols-12 gap-4 lg:gap-8">
                {/* Field Selector Tabs */}
                {fields.length > 1 && (
                    <div className="col-span-12 flex gap-2 overflow-x-auto pb-2 -mb-2">
                        {fields.map((field, idx) => (
                            <button
                                key={field.id}
                                onClick={() => handleFieldChange(idx)}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
                                    ${selectedFieldIndex === idx
                                        ? 'bg-brand-dark text-white shadow-lg'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                {field.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Yield Confidence Chart (Left 8) */}
                <div className="col-span-12 lg:col-span-8">
                    {yieldAnalysis ? (
                        <YieldConfidenceChart
                            data={generateProjectionData(yieldAnalysis.confidence_bands)}
                            projectedYield={yieldAnalysis.projected_yield}
                            yieldPotential={yieldAnalysis.yield_potential}
                            confidenceFactors={yieldAnalysis.confidence_factors}
                            confidenceScore={yieldAnalysis.confidence_score}
                            methodology={yieldAnalysis.methodology}
                            disclaimer={yieldAnalysis.disclaimer}
                            title={`${primaryField?.name || 'Field'} Projection`}
                        />
                    ) : (
                        <ChartSkeleton />
                    )}
                </div>

                {/* Weather + Growth Stage Stack (Right 4) */}
                <div id="weather-widget" className="col-span-12 lg:col-span-4 flex flex-col gap-4 lg:gap-6">
                    {/* Weather Widget */}
                    <WeatherWidget
                        lat={primaryField?.coordinates?.[0]?.[1] || -17.8292}
                        lon={primaryField?.coordinates?.[0]?.[0] || 31.0522}
                    />

                    {/* Growth Stage Tracker */}
                    <GrowthStageTracker
                        currentStage={
                            typeof yieldAnalysis?.current_stage === 'string'
                                ? yieldAnalysis.current_stage.split(' ')[0]
                                : 'V3'
                        }
                        daysToHarvest={yieldAnalysis?.days_to_harvest}
                        plantingDate={primaryField?.planting_date}
                        cropType={primaryField?.crop_type || 'Maize'}
                    />
                </div>
            </div>


            <div className="col-span-12 flex flex-col md:flex-row gap-8">
                {/* Risk Radar if risks exist */}
                <div className="flex-1 w-full md:w-1/2">
                    {risks.length > 0 && (
                        <RiskRadar
                            risks={risks}
                            title="Risk Radar"
                            onRiskClick={(risk) => console.log('Risk clicked:', risk)}
                        />
                    )}
                </div>

                {/* AI Advisor / Insight Card */}
                <div className="flex-1 w-full md:w-1/2">
                    {insights.length > 0 ? (
                        <AIInsightCard
                            insight={{
                                ...insights[0],
                                onDismiss: () => {
                                    const newInsights = [...insights];
                                    newInsights.shift();
                                    setInsights(newInsights);
                                }
                            }}
                        />
                    ) : (
                        <div className="bg-brand-lime/10 p-8 rounded-[2.5rem] h-full flex items-center justify-center">
                            <p className="text-brand-dark opacity-50 font-bold">No active insights.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Overview;
