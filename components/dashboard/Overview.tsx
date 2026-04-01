"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/services/api';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import { RiskRadar, RiskItem, AIInsightCard, ActionQueue, ActionItem, AIInsight, YieldConfidenceChart, GrowthStageTracker } from '@/components/ai';
import { DashboardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';

// Staleness thresholds (industry-standard for dashboard data)
const STALE_THRESHOLD_DASHBOARD = 5 * 60 * 1000;  // 5 min — fields, stats
const STALE_THRESHOLD_AI = 15 * 60 * 1000;         // 15 min — AI insights, proactive tips
const STALE_THRESHOLD_YIELD = 10 * 60 * 1000;      // 10 min — yield projections

const generateProjectionData = (bands: { low: number, mid: number, high: number } | undefined | null) => {
    // Defensive check - ensure bands is a valid object with numeric values
    if (!bands || typeof bands !== 'object') return [];

    const low = typeof bands.low === 'number' ? bands.low : 10;
    const mid = typeof bands.mid === 'number' ? bands.mid : 12.5;
    const high = typeof bands.high === 'number' ? bands.high : 15;

    // Show projected accumulation curve (model-based, not observed)
    const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Harvest'];
    return months.map((month, index) => {
        const progress = (index + 1) / months.length;
        return {
            name: month,
            low: +(low * progress).toFixed(1),
            mid: +(mid * progress).toFixed(1),
            high: +(high * progress).toFixed(1),
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

    // Track when data was last fetched to enable stale-while-revalidate
    const lastDashboardFetch = useRef<number>(0);
    const lastAIFetch = useRef<number>(0);
    const lastYieldFetch = useRef<number>(0);
    const initializedRef = useRef(false);

    const loadData = useCallback(async (opts?: { skipAI?: boolean; background?: boolean }) => {
        const now = Date.now();

        // Only show skeleton on first-ever load (not on background refreshes)
        if (!initializedRef.current) {
            setLoading(true);
        }

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
            lastDashboardFetch.current = now;
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            initializedRef.current = true;
        }

        // Phase 2: load AI extras without blocking UI
        // Skip AI calls on background refresh if data is still fresh (saves tokens)
        if (opts?.skipAI) return;

        try {
            // Use actual field coordinates if available, otherwise default to Harare
            const firstField = currentFieldsData?.[0];
            const fc: any = firstField?.coordinates?.[0];
            const lat = (fc && (fc.lat ?? fc[1])) || -17.82;
            const lon = (fc && (fc.lng ?? fc.lon ?? fc[0])) || 31.05;
            api.getProactiveInsight({ location: { lat, lon } })
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

            lastAIFetch.current = now;

            // Trigger detailed yield analysis for primary field if available
            if (currentFieldsData && currentFieldsData.length > 0) {
                api.generateYieldProjection(currentFieldsData[0].id)
                    .then(data => { setYieldAnalysis(data); lastYieldFetch.current = Date.now(); })
                    .catch(err => console.error("Yield projection background fetch failed", err));
            }
        } catch {}
    }, []);

    // Initial load
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Visibility-aware smart refresh: only refetch stale data when user returns to tab
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return;
            if (!initializedRef.current) return; // Haven't loaded yet

            const now = Date.now();
            const dashboardAge = now - lastDashboardFetch.current;
            const aiAge = now - lastAIFetch.current;

            if (dashboardAge > STALE_THRESHOLD_DASHBOARD) {
                // Dashboard data is stale — refresh in background (no skeleton)
                const skipAI = aiAge <= STALE_THRESHOLD_AI;
                loadData({ background: true, skipAI });
            }
            // If only AI is stale but dashboard is fresh, we still don't refetch AI
            // on simple tab focus — AI refreshes are expensive (tokens) and only happen
            // when dashboard data itself is stale, or on explicit user action.
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [loadData]);

    if (loading) return <DashboardSkeleton />;


    const chartData = stats?.chartData || [];
    const activeFieldsCount = fields.length;
    const totalHectares = fields.reduce((sum: number, f: any) => sum + (f.area || 0), 0);
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
        ? (fields.reduce((sum: number, f: any) => sum + (f.ndvi || 0), 0) / fields.length).toFixed(2)
        : "0.00";
    const avgMoisture = fields.length
        ? Math.round(fields.reduce((sum: number, f: any) => sum + (f.soilMoisture || 0), 0) / fields.length)
        : 0;

    return (
        <div className="grid grid-cols-12 gap-5 lg:gap-8 pb-12 relative">

            {/* Welcome Widget (Left 8) */}
            <div id="dashboard-welcome" className="col-span-12 lg:col-span-8 neu-surface p-8 lg:p-16 flex flex-col justify-center relative overflow-hidden h-full min-h-[350px]">
                <div className="relative z-10 flex-1 flex flex-col justify-center">
                    <h3
                        className="text-3xl lg:text-5xl mb-4 tracking-tight leading-tight"
                        style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}
                    >
                        {new Date().getHours() < 12 ? 'Good Morning' : 'Good Afternoon'}, {profile?.full_name?.split(' ')[0] || 'Farmer'}.
                    </h3>
                    <div className="p-3 lg:p-4 rounded-[16px] mb-6 inline-block" style={{ backgroundColor: 'rgba(15, 184, 133, 0.08)' }}>
                        <p className="text-sm lg:text-base" style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--ee-text)' }}>
                            <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: '18px', color: 'var(--ee-primary)' }}>lightbulb</span>
                            {insight}
                        </p>
                    </div>
                    <p className="text-base lg:text-xl max-w-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--ee-muted)' }}>
                        {activeFieldsCount > 0
                            ? `${activeFieldsCount} active field${activeFieldsCount > 1 ? 's' : ''} monitored across ${totalHectares.toFixed(1)} ha.`
                            : 'Add your first field to get started with precision farming.'}
                    </p>
                    <div className="flex flex-wrap gap-5 lg:gap-6 mt-8 lg:mt-10">
                        <div className="px-6 lg:px-8 py-3 lg:py-4 rounded-[16px] flex-1 min-w-[140px]" style={{ backgroundColor: 'var(--ee-bg)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Active Fields</p>
                            <p className="text-2xl lg:text-3xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--ee-text)' }}>{activeFieldsCount}</p>
                        </div>
                        <div className="px-6 lg:px-8 py-3 lg:py-4 rounded-[16px] flex-1 min-w-[140px]" style={{ backgroundColor: 'var(--ee-bg)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Total Area</p>
                            <p className="text-2xl lg:text-3xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--ee-text)' }}>{totalHectares.toFixed(1)} ha</p>
                        </div>
                    </div>
                </div>
                {/* Decorative circle */}
                <div className="absolute top-0 right-0 w-48 lg:w-64 h-48 lg:h-64 rounded-full -mr-24 lg:-mr-32 -mt-24 lg:-mt-32" style={{
                    background: 'radial-gradient(circle, rgba(15, 184, 133, 0.08) 0%, transparent 70%)',
                }}></div>
            </div>

            {/* Action Queue (Right Column - Top Priority) */}
            <div id="action-queue" className="col-span-12 lg:col-span-4 flex flex-col h-full">
                {actions.filter(a => !a.completed).length > 0 ? (
                    <ActionQueue
                        actions={actions.filter(a => !a.completed)}
                        title="Today's Priorities"
                        onActionComplete={handleActionComplete}
                    />
                ) : (
                    <div className="neu-surface p-8 lg:p-10 flex flex-col items-center justify-center h-full min-h-[350px]">
                        <span className="material-symbols-outlined mb-3" style={{ fontSize: '40px', color: 'var(--ee-primary)' }}>check_circle</span>
                        <p className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ee-text)' }}>All caught up</p>
                        <p className="text-sm mt-1 text-center" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>No tasks for today. Check back tomorrow.</p>
                    </div>
                )}
            </div>

            {/* Middle Row: Field Selector, Yield Prediction & Weather */}
            <div className="col-span-12 grid grid-cols-12 gap-5 lg:gap-8">
                {/* Field Selector Tabs */}
                {fields.length > 1 && (
                    <div className="col-span-12 flex gap-2 overflow-x-auto pb-2 -mb-2">
                        {fields.map((field: any, idx: number) => (
                            <button
                                key={field.id}
                                onClick={() => handleFieldChange(idx)}
                                className="px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap"
                                style={{
                                    backgroundColor: selectedFieldIndex === idx ? 'var(--ee-text)' : 'var(--ee-bg)',
                                    color: selectedFieldIndex === idx ? '#fff' : 'var(--ee-muted)',
                                    boxShadow: selectedFieldIndex === idx ? 'var(--shadow-ambient)' : 'var(--shadow-neu)',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                {field.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Yield Confidence Chart (Left 8) */}
                <div className="col-span-12 lg:col-span-8">
                    {yieldAnalysis && yieldAnalysis.confidence_bands ? (
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
                    ) : yieldAnalysis === null && !loading ? (
                        <div className="neu-surface p-8 flex flex-col items-center justify-center min-h-[300px]">
                            <span className="material-symbols-outlined mb-3" style={{ fontSize: '40px', color: 'var(--ee-muted)' }}>analytics</span>
                            <p className="font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ee-text)' }}>Yield projection unavailable</p>
                            <p className="text-sm mt-1 text-center max-w-sm" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Set a planting date and crop variety on your field to generate an agronomic yield projection.</p>
                        </div>
                    ) : (
                        <ChartSkeleton />
                    )}
                </div>

                {/* Weather + Growth Stage Stack (Right 4) */}
                <div id="weather-widget" className="col-span-12 lg:col-span-4 flex flex-col gap-5 lg:gap-6">
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
                                : undefined
                        }
                        daysToHarvest={yieldAnalysis?.days_to_harvest}
                        plantingDate={primaryField?.plantingDate || primaryField?.planting_date}
                        cropType={primaryField?.crop || primaryField?.crop_type || 'Maize'}
                    />
                </div>
            </div>


            {/* Bottom Row: Crop Health + Risk Radar + AI Insight */}
            <div className="col-span-12 grid grid-cols-12 gap-5 lg:gap-8">

                {/* Crop Health Card — always visible */}
                <div className="col-span-12 md:col-span-4">
                    <div className="p-6 lg:p-8 rounded-[24px] text-white relative overflow-hidden h-full min-h-[260px]" style={{
                        backgroundColor: 'var(--ee-text)',
                        boxShadow: 'var(--shadow-ambient)',
                    }}>
                        <div className="relative z-10 w-full">
                            <h4 className="text-base lg:text-lg mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--ee-primary)' }}>satellite_alt</span>
                                Crop Health
                            </h4>
                            <p className="text-[10px] font-medium mb-5 uppercase tracking-widest" style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)' }}>Satellite aggregation</p>
                            <div className="space-y-5">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold opacity-80 uppercase tracking-tighter" style={{ fontFamily: 'var(--font-body)' }}>Avg NDVI</span>
                                        <span className="text-xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--ee-primary)' }}>{avgNdvi}</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        <div className="h-full transition-all duration-1000 rounded-full" style={{ width: `${parseFloat(avgNdvi) * 100}%`, backgroundColor: 'var(--ee-primary)' }}></div>
                                    </div>
                                    <p className="text-[10px] mt-1 opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                                        {parseFloat(avgNdvi) >= 0.6 ? 'Healthy vegetation' : parseFloat(avgNdvi) >= 0.4 ? 'Moderate vigour' : parseFloat(avgNdvi) > 0 ? 'Low vigour — check field' : 'No data'}
                                    </p>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold opacity-80 uppercase tracking-tighter" style={{ fontFamily: 'var(--font-body)' }}>Soil Moisture</span>
                                        <span className="text-xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--ee-water)' }}>{avgMoisture}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        <div className="h-full transition-all duration-1000 rounded-full" style={{ width: `${avgMoisture}%`, backgroundColor: 'var(--ee-water)' }}></div>
                                    </div>
                                    <p className="text-[10px] mt-1 opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                                        {avgMoisture >= 55 ? 'Adequate moisture' : avgMoisture >= 35 ? 'Monitor closely' : avgMoisture > 0 ? 'Irrigation recommended' : 'No data'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[50px] pointer-events-none -mr-8 -mt-8" style={{ backgroundColor: 'var(--ee-primary)', opacity: 0.1 }}></div>
                    </div>
                </div>

                {/* Risk Radar */}
                <div className="col-span-12 md:col-span-4">
                    {risks.length > 0 ? (
                        <RiskRadar
                            risks={risks}
                            title="Risk Radar"
                            onRiskClick={(risk) => console.log('Risk clicked:', risk)}
                        />
                    ) : (
                        <div className="neu-surface p-6 lg:p-8 h-full min-h-[260px] flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined mb-2" style={{ fontSize: '36px', color: 'var(--ee-primary)' }}>verified_user</span>
                            <p className="font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ee-text)' }}>No active risks</p>
                            <p className="text-sm mt-1 text-center" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>All clear for your fields.</p>
                        </div>
                    )}
                </div>

                {/* AI Advisor / Insight Card */}
                <div className="col-span-12 md:col-span-4">
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
                        <div className="neu-surface p-6 lg:p-8 h-full min-h-[260px] flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined mb-2" style={{ fontSize: '36px', color: 'var(--ee-muted)' }}>psychology</span>
                            <p className="font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ee-text)' }}>No active insights</p>
                            <p className="text-sm mt-1 text-center" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>AI advisor will surface recommendations here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Overview;
