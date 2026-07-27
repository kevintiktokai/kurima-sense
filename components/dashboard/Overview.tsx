"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { useMultiFieldState } from '@/hooks/useMultiFieldState';
import { scoreToLabel } from '@/lib/field-state-types';
import { routeForField, withFrom } from '@/lib/nav-links';
import { RiskRadar, RiskItem, AIInsightCard, ActionQueue, ActionItem, AIInsight, YieldConfidenceChart, GrowthStageTracker } from '@/components/ai';
import { DashboardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';

// Staleness thresholds
const STALE_THRESHOLD_AI = 15 * 60 * 1000;         // 15 min — AI insights, proactive tips
const STALE_THRESHOLD_YIELD = 10 * 60 * 1000;      // 10 min — yield projections

const generateProjectionData = (bands: { low: number, mid: number, high: number } | undefined | null) => {
    if (!bands || typeof bands !== 'object') return [];

    const low = typeof bands.low === 'number' ? bands.low : 10;
    const mid = typeof bands.mid === 'number' ? bands.mid : 12.5;
    const high = typeof bands.high === 'number' ? bands.high : 15;

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

// Lightweight placeholder for AI cards while they load
const AICardPlaceholder: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
    <div className="neu-surface p-6 lg:p-8 h-full min-h-[260px] flex flex-col items-center justify-center">
        <span className="material-symbols-outlined mb-2 animate-pulse" style={{ fontSize: '36px', color: 'var(--ee-muted)' }}>{icon}</span>
        <p className="text-sm" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{label}</p>
    </div>
);

const Overview: React.FC = () => {
    const router = useRouter();
    const { profile } = useUserProfile();
    const { fields, dashboardStats: stats, loading: dataLoading, backendError, refreshAll } = useDashboardData();

    // Portfolio-level KurimaScore from the aggregator (one canonical state per
    // field), replacing the old client-side mean(field.ndvi). No batch endpoint
    // yet — useMultiFieldState fans out capped-concurrency calls.
    const portfolioFieldIds = (fields || []).map((f: any) => f.id).filter(Boolean);
    const { list: fieldStates } = useMultiFieldState(portfolioFieldIds);

    // AI-specific state (loaded progressively, not blocking dashboard shell)
    const [insight, setInsight] = useState<string>("");
    const [risks, setRisks] = useState<RiskItem[]>([]);
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [yieldAnalysis, setYieldAnalysis] = useState<any>(null);
    const [aiLoaded, setAiLoaded] = useState(false);
    const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);

    const lastAIFetch = useRef<number>(0);
    const lastYieldFetch = useRef<number>(0);
    const aiInitializedRef = useRef(false);

    // Load AI data in background — deferred so the dashboard shell renders first
    const loadAIData = useCallback(async (fieldsData: any[]) => {
        if (aiInitializedRef.current) return;
        aiInitializedRef.current = true;

        try {
            // Get coordinates for proactive insight
            const firstField = fieldsData?.[0];
            const fc: any = firstField?.coordinates?.[0];
            const lat = (fc && (fc.lat ?? fc[1])) || -17.82;
            const lon = (fc && (fc.lng ?? fc.lon ?? fc[0])) || 31.05;

            // Fire all AI calls in parallel — none block the shell
            const [proactiveResult, aiInsightsResult] = await Promise.allSettled([
                api.getProactiveInsight({ location: { lat, lon } }),
                api.getAIInsights(),
            ]);

            if (proactiveResult.status === 'fulfilled') {
                setInsight(proactiveResult.value);
            }

            if (aiInsightsResult.status === 'fulfilled') {
                const data = aiInsightsResult.value;
                if (data?.risks) setRisks(data.risks.map((r: any) => ({ ...r, type: r.type, trend: r.trend })));
                if (data?.actions) setActions(data.actions.map((a: any) => ({ ...a, type: a.type, priority: a.priority })));
                if (data?.insights) setInsights(data.insights.map((i: any) => ({ ...i, type: i.type, severity: i.severity })));
            }

            lastAIFetch.current = Date.now();

            // Yield projection for primary field
            if (fieldsData.length > 0) {
                api.generateYieldProjection(fieldsData[0].id)
                    .then(data => { setYieldAnalysis(data); lastYieldFetch.current = Date.now(); })
                    .catch(err => console.error("Yield projection failed", err));
            }
        } catch (e) {
            console.error('[Overview] AI load error:', e);
        } finally {
            setAiLoaded(true);
        }
    }, []);

    // When fields are available from shared provider, trigger deferred AI load
    useEffect(() => {
        if (fields.length > 0 && !aiInitializedRef.current) {
            // Use requestIdleCallback to defer AI calls until after paint
            if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(() => loadAIData(fields));
            } else {
                setTimeout(() => loadAIData(fields), 100);
            }
        }
    }, [fields, loadAIData]);

    // Visibility-aware AI refresh
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return;
            if (!aiInitializedRef.current) return;

            const aiAge = Date.now() - lastAIFetch.current;
            if (aiAge > STALE_THRESHOLD_AI) {
                aiInitializedRef.current = false;
                loadAIData(fields);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [loadAIData, fields]);

    const handleFieldChange = useCallback((index: number) => {
        setSelectedFieldIndex(index);
        const field = fields[index];
        if (field) {
            setYieldAnalysis(null);
            api.generateYieldProjection(field.id)
                .then(data => setYieldAnalysis(data))
                .catch(err => console.error('Yield projection failed', err));
        }
    }, [fields]);

    const handleActionComplete = useCallback(async (actionId: string) => {
        setActions(prev => prev.map(a =>
            a.id === actionId ? { ...a, completed: true } : a
        ));

        // AI-suggested actions carry synthetic ids (e.g. "weather-spray-…",
        // "action-stage-…", "health-…"), not persisted farm_tasks. Checking those
        // off is a local dismissal — persisting them would PATCH /ai/tasks/{id}
        // with a non-UUID id and fail, which previously rolled the checkbox back
        // and made the toggle look broken. Only persist real task UUIDs.
        const isRealTask = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actionId);
        if (!isRealTask) return;

        try {
            await api.updateTask(actionId, { completed: true });
        } catch (err) {
            console.error("Failed to persist task completion", err);
            setActions(prev => prev.map(a =>
                a.id === actionId ? { ...a, completed: false } : a
            ));
        }
    }, []);

    // Show skeleton only during initial data load (not AI)
    if (dataLoading) return <DashboardSkeleton />;

    const activeFieldsCount = fields.length;
    const totalHectares = fields.reduce((sum: number, f: any) => sum + (f.area || 0), 0);
    const primaryField = fields[selectedFieldIndex] || fields[0];

    // AVG KurimaScore (0-100) from the aggregator — the single source of truth.
    const avgKurimaScore = fieldStates.length
        ? Math.round(fieldStates.reduce((sum, s) => sum + (s.kurima_score?.score || 0), 0) / fieldStates.length)
        : null;
    const avgScoreMeta = avgKurimaScore != null ? scoreToLabel(avgKurimaScore) : null;
    // Worst-performing field drives the recommended action + portfolio risk surface.
    const worstField = fieldStates.length
        ? [...fieldStates].sort((a, b) => (a.kurima_score?.score || 0) - (b.kurima_score?.score || 0))[0]
        : null;
    const portfolioHighAlerts = fieldStates.flatMap((s) => s.alerts || []).filter((a) => a.severity === 'high');
    const avgMoisture = fieldStates.length
        ? Math.round(fieldStates.reduce((sum, s) => sum + (s.water_balance?.soil_moisture_pct || 0), 0) / fieldStates.length)
        : 0;

    return (
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-8 pb-12 relative">

            {/* Backend-unreachable banner: a failed fetch must read as an outage,
                never as an empty farm ("all my fields are wiped" incident). */}
            {backendError && (
                <div className="col-span-12 neu-surface p-4 sm:p-5 rounded-[16px] flex flex-wrap items-center gap-3" style={{ border: '1px solid rgba(232, 163, 101, 0.5)', backgroundColor: 'rgba(232, 163, 101, 0.08)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--ee-sun)' }}>cloud_off</span>
                    <p className="flex-1 min-w-[220px] text-sm font-semibold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>
                        We can&apos;t reach the server right now. Your fields and data are safe — this is a connection issue, not data loss.
                    </p>
                    <button
                        onClick={() => refreshAll()}
                        className="px-4 py-2 rounded-[12px] text-sm font-bold text-white"
                        style={{ backgroundColor: 'var(--ee-primary)', fontFamily: 'var(--font-heading)' }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Welcome Widget (Left 8 on desktop; full-width on tablet so the
                priorities panel isn't squashed into a narrow column on iPad) */}
            <div id="dashboard-welcome" className="col-span-12 xl:col-span-8 neu-surface p-5 sm:p-8 lg:p-16 flex flex-col justify-center relative overflow-hidden h-full min-h-[220px] sm:min-h-[280px] lg:min-h-[350px]">
                <div className="relative z-10 flex-1 flex flex-col justify-center">
                    <h3
                        className="text-2xl sm:text-3xl lg:text-5xl mb-3 lg:mb-4 tracking-tight leading-tight"
                        style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}
                    >
                        {new Date().getHours() < 12 ? 'Good Morning' : 'Good Afternoon'}, {profile?.full_name?.split(' ')[0] || 'Farmer'}.
                    </h3>
                    <div className="p-2.5 sm:p-3 lg:p-4 rounded-[12px] lg:rounded-[16px] mb-4 lg:mb-6 inline-block" style={{ backgroundColor: 'rgba(15, 184, 133, 0.08)' }}>
                        <p className="text-xs sm:text-sm lg:text-base leading-snug" style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--ee-text)' }}>
                            <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: '16px', color: 'var(--ee-primary)' }}>lightbulb</span>
                            {insight || (
                                backendError
                                    ? "AI analysis is paused — we can't reach the server. Retry above when you're back online."
                                    : activeFieldsCount === 0
                                        ? "Add your first field to unlock AI analysis of your farm."
                                        : "Analyzing your fields..."
                            )}
                        </p>
                    </div>
                    <p className="text-sm sm:text-base lg:text-xl max-w-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--ee-muted)' }}>
                        {activeFieldsCount > 0
                            ? `${activeFieldsCount} active field${activeFieldsCount > 1 ? 's' : ''} monitored across ${totalHectares.toFixed(1)} ha.`
                            : 'Add your first field to get started with precision farming.'}
                    </p>

                    {/* Activation CTA: with zero fields the dashboard has nothing to
                        show, and the prose alone left new users with no next step
                        (the "I can't see my fields" report — the account genuinely
                        had none). This is also the activation event worth tracking
                        when ads start. */}
                    {activeFieldsCount === 0 && !dataLoading && !backendError && (
                        <Link
                            href="/dashboard/fields"
                            className="inline-flex items-center gap-2 mt-5 px-6 py-3.5 rounded-[16px] font-bold text-sm uppercase tracking-wider hover:scale-105 transition-transform w-fit"
                            style={{ background: 'var(--ee-primary)', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            <span className="material-symbols-outlined text-base">add_location_alt</span>
                            Add your first field
                        </Link>
                    )}
                    {/* Stat tiles double as quick links into the Fields screen — clicking the
                        "active fields / total area" summary drills into the fields it counts. */}
                    <div className="flex flex-wrap gap-3 sm:gap-5 lg:gap-6 mt-5 sm:mt-8 lg:mt-10">
                        <Link
                            href="/dashboard/fields"
                            aria-label="View all fields"
                            className="group px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 rounded-[12px] lg:rounded-[16px] flex-1 min-w-[110px] sm:min-w-[140px] transition-all duration-200 hover:shadow-[var(--shadow-neu)] active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--ee-bg)' }}
                        >
                            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                Active Fields
                                <span className="material-symbols-outlined opacity-0 group-hover:opacity-60 transition-opacity" style={{ fontSize: '12px' }}>arrow_forward</span>
                            </p>
                            <p className="text-xl sm:text-2xl lg:text-3xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--ee-text)' }}>{activeFieldsCount}</p>
                        </Link>
                        <Link
                            href="/dashboard/fields"
                            aria-label="View all fields"
                            className="group px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 rounded-[12px] lg:rounded-[16px] flex-1 min-w-[110px] sm:min-w-[140px] transition-all duration-200 hover:shadow-[var(--shadow-neu)] active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--ee-bg)' }}
                        >
                            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                Total Area
                                <span className="material-symbols-outlined opacity-0 group-hover:opacity-60 transition-opacity" style={{ fontSize: '12px' }}>arrow_forward</span>
                            </p>
                            <p className="text-xl sm:text-2xl lg:text-3xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--ee-text)' }}>{totalHectares.toFixed(1)} ha</p>
                        </Link>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 rounded-full -mr-16 sm:-mr-24 lg:-mr-32 -mt-16 sm:-mt-24 lg:-mt-32" style={{
                    background: 'radial-gradient(circle, rgba(15, 184, 133, 0.08) 0%, transparent 70%)',
                }}></div>
            </div>

            {/* Action Queue — right column only at xl+; below the welcome card at
                tablet widths so priority text gets full width instead of wrapping */}
            <div id="action-queue" className="col-span-12 xl:col-span-4 flex flex-col h-full">
                {!aiLoaded ? (
                    <AICardPlaceholder icon="task_alt" label="Loading priorities..." />
                ) : actions.filter(a => !a.completed).length > 0 ? (
                    <ActionQueue
                        actions={actions.filter(a => !a.completed)}
                        title="Today's Priorities"
                        onActionComplete={handleActionComplete}
                    />
                ) : (
                    <div className="neu-surface p-6 sm:p-8 lg:p-10 flex flex-col items-center justify-center h-full min-h-[200px] lg:min-h-[350px]">
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
                    <div className="col-span-12 flex gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
                        {fields.map((field: any, idx: number) => (
                            <button
                                key={field.id}
                                onClick={() => handleFieldChange(idx)}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap"
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
                    ) : yieldAnalysis === null && aiLoaded ? (
                        <div className="neu-surface p-8 flex flex-col items-center justify-center min-h-[300px]">
                            <span className="material-symbols-outlined mb-3" style={{ fontSize: '40px', color: 'var(--ee-muted)' }}>analytics</span>
                            <p className="font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ee-text)' }}>Yield projection unavailable</p>
                            <p className="text-sm mt-1 text-center max-w-sm" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Set a planting date and crop variety on your field to generate an agronomic yield projection.</p>
                        </div>
                    ) : (
                        <ChartSkeleton />
                    )}
                </div>

                {/* Weather + Growth Stage Stack (Right 4) — each card links into its full screen:
                    weather → Climatology, growth stage → My Plan. */}
                <div id="weather-widget" className="col-span-12 lg:col-span-4 flex flex-col gap-5 lg:gap-6">
                    <Link
                        href="/dashboard/weather"
                        aria-label="Open Climatology"
                        className="block transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <WeatherWidget
                            lat={(primaryField?.coordinates?.[0] as any)?.[1] ?? (primaryField?.coordinates?.[0] as any)?.lat ?? -17.8292}
                            lon={(primaryField?.coordinates?.[0] as any)?.[0] ?? (primaryField?.coordinates?.[0] as any)?.lon ?? 31.0522}
                        />
                    </Link>
                    <Link
                        href="/dashboard/plan"
                        aria-label="Open My Plan"
                        className="block transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <GrowthStageTracker
                            currentStage={
                                typeof yieldAnalysis?.current_stage === 'string'
                                    ? yieldAnalysis.current_stage.split(' ')[0]
                                    : undefined
                            }
                            daysToHarvest={yieldAnalysis?.days_to_harvest}
                            plantingDate={primaryField?.plantingDate || primaryField?.planting_date}
                            cropType={primaryField?.crop || (primaryField as any)?.crop_type || 'Maize'}
                        />
                    </Link>
                </div>
            </div>

            {/* Bottom Row: Crop Health + Risk Radar + AI Insight */}
            <div className="col-span-12 grid grid-cols-12 gap-5 lg:gap-8">

                {/* Crop Health Card — always visible (uses shared field data, no AI needed).
                    The whole card drills into the Fields screen; inner links to a specific
                    field stop propagation so they keep their own, more specific destination. */}
                <div className="col-span-12 md:col-span-4">
                    <div
                        role="link"
                        tabIndex={0}
                        aria-label="View all fields"
                        onClick={() => router.push('/dashboard/fields')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                router.push('/dashboard/fields');
                            }
                        }}
                        className="p-5 sm:p-6 lg:p-8 rounded-[20px] lg:rounded-[24px] text-white relative overflow-hidden h-full min-h-[220px] lg:min-h-[260px] cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0" style={{
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
                                        <span className="text-xs font-bold opacity-80 uppercase tracking-tighter" style={{ fontFamily: 'var(--font-body)' }}>Avg KurimaScore</span>
                                        <span className="text-xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: avgScoreMeta?.color || 'var(--ee-primary)' }}>{avgKurimaScore != null ? avgKurimaScore : '—'}</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        <div className="h-full transition-all duration-1000 rounded-full" style={{ width: `${avgKurimaScore || 0}%`, backgroundColor: avgScoreMeta?.color || 'var(--ee-primary)' }}></div>
                                    </div>
                                    {(avgKurimaScore != null && avgKurimaScore < 55 && worstField?.kurima_score?.recommended_action && worstField.field?.id) ? (
                                        <Link
                                            href={withFrom(routeForField(worstField.field.id, 'consumer'), 'Overview', '/dashboard')}
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-[10px] mt-1 opacity-70 hover:opacity-100 transition-opacity inline-flex items-start gap-1"
                                            style={{ fontFamily: 'var(--font-body)' }}
                                        >
                                            {worstField.kurima_score.recommended_action}
                                            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 12, marginTop: 1 }}>arrow_forward</span>
                                        </Link>
                                    ) : (
                                        <p className="text-[10px] mt-1 opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                                            {avgKurimaScore == null
                                                ? 'No data'
                                                : `${avgScoreMeta?.label} across ${fieldStates.length} field${fieldStates.length === 1 ? '' : 's'}`}
                                        </p>
                                    )}
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
                            <Link
                                href="/dashboard/fields"
                                onClick={(e) => e.stopPropagation()}
                                className="mt-5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
                                style={{ fontFamily: 'var(--font-body)' }}
                            >
                                View all fields
                                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>arrow_forward</span>
                            </Link>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[50px] pointer-events-none -mr-8 -mt-8" style={{ backgroundColor: 'var(--ee-primary)', opacity: 0.1 }}></div>
                    </div>
                </div>

                {/* Risk Radar — progressive load */}
                <div className="col-span-12 md:col-span-4">
                    {!aiLoaded ? (
                        <AICardPlaceholder icon="shield" label="Scanning risks..." />
                    ) : risks.length > 0 ? (
                        <RiskRadar
                            risks={risks}
                            title="Risk Radar"
                            onRiskClick={(risk) => console.log('Risk clicked:', risk)}
                        />
                    ) : portfolioHighAlerts.length > 0 ? (
                        // Aggregator-sourced portfolio risks (fs.alerts across all fields).
                        <div className="neu-surface p-6 lg:p-8 h-full min-h-[260px] flex flex-col justify-center">
                            <span className="material-symbols-outlined mb-2" style={{ fontSize: '36px', color: '#dc2626' }}>warning</span>
                            <p className="font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ee-text)' }}>
                                {portfolioHighAlerts.length} high-severity alert{portfolioHighAlerts.length === 1 ? '' : 's'}
                            </p>
                            <p className="text-sm mt-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{portfolioHighAlerts[0].headline}</p>
                        </div>
                    ) : (
                        <div className="neu-surface p-6 lg:p-8 h-full min-h-[260px] flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined mb-2" style={{ fontSize: '36px', color: 'var(--ee-primary)' }}>verified_user</span>
                            <p className="font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ee-text)' }}>No active risks</p>
                            <p className="text-sm mt-1 text-center" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>All clear for your fields.</p>
                        </div>
                    )}
                </div>

                {/* AI Advisor / Insight Card — progressive load */}
                <div className="col-span-12 md:col-span-4">
                    {!aiLoaded ? (
                        <AICardPlaceholder icon="psychology" label="Generating insights..." />
                    ) : insights.length > 0 ? (
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
