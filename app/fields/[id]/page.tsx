"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { FieldData } from '@/components/dashboard/types';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function FieldInsightsPage() {
    const params = useParams();
    const router = useRouter();
    const fieldId = params.id as string;

    const [field, setField] = useState<FieldData | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [insightLoading, setInsightLoading] = useState(true);
    const [yieldData, setYieldData] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        if (!fieldId) return;
        loadAllData();
    }, [fieldId]);

    const loadAllData = async () => {
        setLoading(true);
        setInsightLoading(true);

        try {
            // Phase 1: field + history (fast — renders the page)
            const [fieldsData, historyData] = await Promise.all([
                api.getFields(),
                api.getFieldHistory(fieldId),
            ]);

            const found = fieldsData.find((f: any) => f.id === fieldId);
            if (found) setField(found);
            setHistory(historyData || []);
        } catch (e) {
            console.error("Phase 1 load error:", e);
        } finally {
            setLoading(false);
        }

        // Phase 2: AI insight, yield (non-blocking)
        Promise.all([
            fetchAIInsight(),
            api.generateYieldProjection(fieldId),
        ]).then(([_, yieldResult]) => {
            if (yieldResult) setYieldData(yieldResult);
        }).catch(() => {});
    };

    const fetchAIInsight = async () => {
        try {
            const { supabase, authReadyPromise } = await import('@/lib/supabase');
            await authReadyPromise;
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

            const res = await fetch(`${API_BASE_URL}/fields/${fieldId}/insight`, { headers });
            if (res.ok) {
                const data = await res.json();
                setAiInsight(data.insight || null);
            }
        } catch (e) {
            console.error("AI insight error:", e);
        } finally {
            setInsightLoading(false);
        }
    };

    const triggerAnalysis = async () => {
        setAnalyzing(true);
        try {
            await api.analyzeField(fieldId);
            // Wait a bit for background task, then reload
            setTimeout(() => loadAllData(), 3000);
        } catch (e) {
            console.error("Analysis trigger error:", e);
        } finally {
            setTimeout(() => setAnalyzing(false), 4000);
        }
    };

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center font-bold"
                style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                <span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span>
                Loading Insights...
            </div>
        );
    }

    if (!field) {
        return (
            <div
                className="min-h-screen flex items-center justify-center font-bold"
                style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                <span className="material-symbols-outlined mr-2">error_outline</span>
                Field not found
            </div>
        );
    }

    // Compute yield efficiency from yield projection data
    const yieldEfficiency = yieldData?.projected_yield && yieldData?.yield_potential
        ? Math.min(98, Math.round((yieldData.projected_yield / yieldData.yield_potential) * 100))
        : null;

    // Crop-specific threshold definitions
    const cropThresholds: Record<string, { ndvi: { excellent: number; good: number; moderate: number }; moisture: { adequate: number; low: number; critical: number } }> = {
        'Maize': { ndvi: { excellent: 0.7, good: 0.5, moderate: 0.35 }, moisture: { adequate: 50, low: 30, critical: 20 } },
        'Soybean': { ndvi: { excellent: 0.65, good: 0.45, moderate: 0.3 }, moisture: { adequate: 40, low: 25, critical: 15 } },
        'Tobacco': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 45, low: 30, critical: 20 } },
        'Groundnuts': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 35, low: 20, critical: 12 } },
    };
    const ct = cropThresholds[field.crop] || { ndvi: { excellent: 0.6, good: 0.45, moderate: 0.3 }, moisture: { adequate: 40, low: 25, critical: 15 } };
    const getNdviLabel = (v: number) => v >= ct.ndvi.excellent ? 'Excellent' : v >= ct.ndvi.good ? 'Good' : v >= ct.ndvi.moderate ? 'Moderate' : 'Critical';
    const getNdviColor = (v: number) => v >= ct.ndvi.good ? 'var(--ee-primary)' : v >= ct.ndvi.moderate ? 'var(--ee-sun)' : '#dc2626';
    const getMoistureLabel = (v: number) => v >= ct.moisture.adequate ? 'Adequate' : v >= ct.moisture.low ? 'Moderate' : v >= ct.moisture.critical ? 'Low' : 'Critical';
    const getMoistureColor = (v: number) => v >= ct.moisture.low ? 'var(--ee-primary)' : v >= ct.moisture.critical ? 'var(--ee-sun)' : '#dc2626';

    // Display insight — prefer AI-fetched, fallback to field.latestInsight, then deterministic
    const displayInsight = aiInsight || field.latestInsight || null;

    return (
        <div className="min-h-screen p-6 lg:p-8" style={{ background: 'var(--ee-bg)', fontFamily: 'var(--font-body)' }}>
            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-12 h-12 neu-surface rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                        style={{ background: 'var(--ee-surface)', color: 'var(--ee-muted)' }}
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h1
                            className="text-3xl lg:text-4xl font-black tracking-tight"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            {field.name}
                        </h1>
                        <p className="font-bold uppercase text-sm mt-1" style={{ color: 'var(--ee-muted)' }}>
                            {field.crop} &bull; {field.area} ha
                            {field.variety ? ` \u2022 ${field.variety}` : ''}
                        </p>
                    </div>
                </div>
                <button
                    onClick={triggerAnalysis}
                    disabled={analyzing}
                    className="px-5 py-3 rounded-[16px] font-bold text-sm uppercase tracking-wider hover:scale-105 transition-transform disabled:opacity-50"
                    style={{ background: 'var(--ee-primary)', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                >
                    <span className="material-symbols-outlined text-sm mr-1 align-middle">
                        {analyzing ? 'progress_activity' : 'satellite_alt'}
                    </span>
                    {analyzing ? 'Scanning...' : 'Refresh Analysis'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                {/* Row 1: Status Card (full width) */}
                <div className="lg:col-span-12 neu-surface p-8 lg:p-10" style={{ background: 'var(--ee-surface)', borderRadius: '24px' }}>
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-2xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                Current Status
                            </h2>
                            <p className="text-sm font-bold mt-1" style={{ color: 'var(--ee-muted)' }}>
                                <span className="material-symbols-outlined text-sm mr-1 align-middle" style={{ color: 'var(--ee-water)' }}>satellite_alt</span>
                                Last satellite pass: {field.lastSatellitePass}
                            </p>
                        </div>
                        <div
                            className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider"
                            style={{
                                background: field.healthStatus === 'Excellent' ? 'rgba(15, 184, 133, 0.1)' : field.healthStatus === 'Good' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(220, 38, 38, 0.08)',
                                color: field.healthStatus === 'Excellent' ? 'var(--ee-primary)' : field.healthStatus === 'Good' ? 'var(--ee-sun)' : '#dc2626'
                            }}
                        >
                            <span className="material-symbols-outlined text-xs mr-1 align-middle">
                                {field.healthStatus === 'Excellent' ? 'eco' : field.healthStatus === 'Good' ? 'spa' : 'warning'}
                            </span>
                            {field.healthStatus} Health
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                        {/* NDVI */}
                        <div className="p-5 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--ee-muted)', letterSpacing: '0.08em' }}>
                                <span className="material-symbols-outlined text-xs mr-1 align-middle" style={{ color: 'var(--ee-primary)' }}>grass</span>
                                NDVI
                            </p>
                            <div className="text-3xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                {field.ndvi?.toFixed(2) ?? '—'}
                            </div>
                            <div className="text-[10px] font-bold mt-1" style={{
                                color: getNdviColor(field.ndvi ?? 0)
                            }}>
                                {getNdviLabel(field.ndvi ?? 0)}
                            </div>
                        </div>

                        {/* Soil Moisture */}
                        <div className="p-5 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--ee-muted)', letterSpacing: '0.08em' }}>
                                <span className="material-symbols-outlined text-xs mr-1 align-middle" style={{ color: 'var(--ee-water)' }}>water_drop</span>
                                Moisture
                            </p>
                            <div className="text-3xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                {field.soilMoisture ?? 0}%
                            </div>
                            <div className="text-[10px] font-bold mt-1" style={{
                                color: getMoistureColor(field.soilMoisture ?? 0)
                            }}>
                                {getMoistureLabel(field.soilMoisture ?? 0)}
                            </div>
                        </div>

                        {/* Yield Efficiency */}
                        <div className="p-5 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--ee-muted)', letterSpacing: '0.08em' }}>
                                <span className="material-symbols-outlined text-xs mr-1 align-middle" style={{ color: 'var(--ee-sun)' }}>trending_up</span>
                                Yield
                            </p>
                            <div className="text-3xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                {yieldEfficiency != null ? `${yieldEfficiency}%` : (
                                    <span className="text-lg" style={{ color: 'var(--ee-muted)' }}>Pending</span>
                                )}
                            </div>
                            {yieldData?.projected_yield && (
                                <div className="text-[10px] font-bold mt-1" style={{ color: 'var(--ee-muted)' }}>
                                    {yieldData.projected_yield.toFixed(1)}t / {yieldData.yield_potential?.toFixed(1)}t potential
                                </div>
                            )}
                        </div>

                        {/* Days Since Planting */}
                        <div className="p-5 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--ee-muted)', letterSpacing: '0.08em' }}>
                                <span className="material-symbols-outlined text-xs mr-1 align-middle" style={{ color: 'var(--ee-primary)' }}>calendar_month</span>
                                Planted
                            </p>
                            <div className="text-3xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                {(() => {
                                    const pd = field.plantingDate || (field as any).planting_date;
                                    if (!pd) return <span className="text-lg" style={{ color: 'var(--ee-muted)' }}>Not set</span>;
                                    const days = Math.floor((Date.now() - new Date(pd).getTime()) / 86400000);
                                    return `${days}d`;
                                })()}
                            </div>
                            <div className="text-[10px] font-bold mt-1" style={{ color: 'var(--ee-muted)' }}>
                                {field.plantingDate || (field as any).planting_date
                                    ? new Date(field.plantingDate || (field as any).planting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                    : 'Set planting date'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2: AI Agronomist Insight (full width) */}
                <div className="lg:col-span-12 neu-surface p-8 lg:p-10 flex flex-col md:flex-row gap-6 relative overflow-hidden"
                    style={{ background: 'var(--ee-text)', borderRadius: '24px', color: 'var(--ee-bg)' }}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'var(--ee-primary)', opacity: 0.08, filter: 'blur(80px)' }}></div>
                    <div className="flex-1 relative z-10">
                        <h2 className="text-xl font-black mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--ee-primary)' }}>psychology</span>
                            Agronomist Insight
                        </h2>
                        {insightLoading ? (
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px', color: 'var(--ee-primary)' }}>progress_activity</span>
                                <p className="font-medium" style={{ opacity: 0.6 }}>Generating analysis...</p>
                            </div>
                        ) : (
                            <p className="font-medium leading-relaxed text-base" style={{ opacity: 0.85, fontFamily: 'var(--font-body)' }}>
                                {displayInsight || "Run a satellite analysis to receive AI-powered agronomist recommendations for this field."}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col gap-3 justify-center relative z-10">
                        <button
                            onClick={() => {
                                const insight = displayInsight || "the current field status";
                                const message = `I just reviewed the analysis for ${field.name} (${field.crop}, ${field.area}ha). It says: "${insight}". What specific actions should I take next?`;
                                router.push(`/dashboard/chat?initialMessage=${encodeURIComponent(message)}&fieldId=${field.id}`);
                            }}
                            className="px-5 py-3 rounded-[16px] font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform whitespace-nowrap"
                            style={{ background: 'var(--ee-primary)', color: 'var(--ee-surface)', fontFamily: 'var(--font-body)' }}
                        >
                            <span className="material-symbols-outlined text-sm mr-1 align-middle">chat</span>
                            Ask Follow-up
                        </button>
                        <button
                            onClick={fetchAIInsight}
                            className="px-5 py-3 rounded-[16px] font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform whitespace-nowrap"
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)' }}
                        >
                            <span className="material-symbols-outlined text-sm mr-1 align-middle">refresh</span>
                            Refresh Insight
                        </button>
                    </div>
                </div>

                {/* Row 3: Historical Trends Chart (full width) */}
                <div className="lg:col-span-12 neu-surface p-8 lg:p-10" style={{ background: 'var(--ee-surface)', borderRadius: '24px' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--ee-water)' }}>show_chart</span>
                            Crop Health Trends
                        </h2>
                        {history.length > 0 && history[0]?.source && (
                            <p className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{
                                color: 'var(--ee-muted)',
                                background: 'var(--ee-bg)',
                            }}>
                                {history.some(h => h.source === 'satellite') ? 'Satellite + Climate Model' : 'Climate Model Estimate'}
                            </p>
                        )}
                    </div>
                    {history.length > 0 ? (
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorNdvi" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0fb885" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#0fb885" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#5C9EAD" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#5C9EAD" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DF" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#8B9D8F', fontSize: 10, fontWeight: 700 }}
                                        tickMargin={10}
                                        tickFormatter={(val) => {
                                            const d = new Date(val);
                                            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                                        }}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8B9D8F', fontSize: 10, fontWeight: 700 }} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 8px 32px rgba(45, 58, 48, 0.08)',
                                            background: '#FFFFFF',
                                            color: '#2D3A30',
                                            fontFamily: 'var(--font-body)'
                                        }}
                                        cursor={{ stroke: '#8B9D8F', strokeWidth: 1 }}
                                        labelFormatter={(val) => new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    />
                                    <Area type="monotone" dataKey="ndvi" stroke="#0fb885" strokeWidth={3} fillOpacity={1} fill="url(#colorNdvi)" name="NDVI" />
                                    <Area type="monotone" dataKey="soilMoisture" stroke="#5C9EAD" strokeWidth={3} fillOpacity={1} fill="url(#colorMoisture)" name="Moisture (%)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64">
                            <span className="material-symbols-outlined mb-3" style={{ fontSize: '48px', color: 'var(--ee-muted)' }}>show_chart</span>
                            <p className="font-bold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>No trend data yet</p>
                            <p className="text-sm mt-1 text-center max-w-md" style={{ color: 'var(--ee-muted)' }}>
                                Click "Refresh Analysis" to trigger a satellite scan. Historical trends will build up over time.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
