"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { FieldData, ScoutingPin, ScoutingCategory, ScoutingSeverity } from '@/components/dashboard/types';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, ReferenceArea, Brush } from 'recharts';
import { fieldsToGeoJSON, fieldsToKML, downloadFile } from '@/lib/geo';
import { useFieldState } from '@/hooks/useFieldState';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Scouting pin config ──────────────────────────────────────────────────────
const SCOUTING_CATEGORIES: { value: ScoutingCategory; label: string; icon: string; color: string }[] = [
    { value: 'pest', label: 'Pest', icon: 'bug_report', color: '#EF4444' },
    { value: 'disease', label: 'Disease', icon: 'coronavirus', color: '#F97316' },
    { value: 'weed', label: 'Weed', icon: 'grass', color: '#A855F7' },
    { value: 'water', label: 'Water Issue', icon: 'water_drop', color: '#3B82F6' },
    { value: 'nutrient', label: 'Nutrient', icon: 'science', color: '#EAB308' },
    { value: 'general', label: 'General', icon: 'pin_drop', color: '#6B7280' },
];

const SEVERITY_LEVELS: { value: ScoutingSeverity; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: '#22C55E' },
    { value: 'medium', label: 'Medium', color: '#EAB308' },
    { value: 'high', label: 'High', color: '#F97316' },
    { value: 'critical', label: 'Critical', color: '#EF4444' },
];

export default function FieldInsightsPage() {
    const params = useParams();
    const router = useRouter();
    const fieldId = params.id as string;

    // Canonical field state from the aggregator — the single source of truth for
    // health label, NDVI interpretation, insight and the KurimaScore trend. All
    // local threshold logic below falls back to this when available so two screens
    // can never disagree about this field.
    const { fieldState: fs } = useFieldState(fieldId);

    const [field, setField] = useState<FieldData | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [insightLoading, setInsightLoading] = useState(true);
    const [yieldData, setYieldData] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Timeline slider state
    const [timelineRange, setTimelineRange] = useState<{ start: number; end: number } | null>(null);

    // Scouting pins state
    const [scoutingPins, setScoutingPins] = useState<ScoutingPin[]>([]);
    const [showScoutingModal, setShowScoutingModal] = useState(false);
    const [newPin, setNewPin] = useState<Partial<ScoutingPin>>({
        category: 'general',
        severity: 'medium',
        title: '',
        notes: '',
    });

    // Export menu
    const [showExportMenu, setShowExportMenu] = useState(false);

    useEffect(() => {
        if (!fieldId) return;
        loadAllData();
        loadScoutingPins();
    }, [fieldId]);

    const loadAllData = async () => {
        setLoading(true);
        setInsightLoading(true);

        try {
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
            setTimeout(() => loadAllData(), 3000);
        } catch (e) {
            console.error("Analysis trigger error:", e);
        } finally {
            setTimeout(() => setAnalyzing(false), 4000);
        }
    };

    // ─── Scouting pins (stored in localStorage for now — no backend endpoint yet) ─
    const loadScoutingPins = () => {
        try {
            const stored = localStorage.getItem(`scouting_pins_${fieldId}`);
            if (stored) setScoutingPins(JSON.parse(stored));
        } catch {}
    };

    const saveScoutingPin = () => {
        if (!newPin.title) return;
        const pin: ScoutingPin = {
            id: `scout_${Date.now()}`,
            fieldId,
            lat: field?.location?.lat || 0,
            lon: field?.location?.lon || 0,
            category: newPin.category as ScoutingCategory,
            severity: newPin.severity as ScoutingSeverity,
            title: newPin.title || '',
            notes: newPin.notes,
            createdAt: new Date().toISOString(),
        };
        const updated = [...scoutingPins, pin];
        setScoutingPins(updated);
        localStorage.setItem(`scouting_pins_${fieldId}`, JSON.stringify(updated));
        setShowScoutingModal(false);
        setNewPin({ category: 'general', severity: 'medium', title: '', notes: '' });
    };

    const deleteScoutingPin = (pinId: string) => {
        const updated = scoutingPins.filter(p => p.id !== pinId);
        setScoutingPins(updated);
        localStorage.setItem(`scouting_pins_${fieldId}`, JSON.stringify(updated));
    };

    // ─── Export handlers ──────────────────────────────────────────────────────────
    const handleExportGeoJSON = () => {
        if (!field) return;
        const geojson = fieldsToGeoJSON([field]);
        downloadFile(JSON.stringify(geojson, null, 2), `${field.name.replace(/\s+/g, '_')}.geojson`, 'application/geo+json');
        setShowExportMenu(false);
    };

    const handleExportKML = () => {
        if (!field) return;
        const kml = fieldsToKML([field]);
        downloadFile(kml, `${field.name.replace(/\s+/g, '_')}.kml`, 'application/vnd.google-earth.kml+xml');
        setShowExportMenu(false);
    };

    const handleExportCSV = () => {
        if (!history.length) return;
        const headers = 'Date,NDVI,Soil Moisture (%),Source\n';
        const rows = history.map(h =>
            `${h.date},${h.ndvi},${h.soilMoisture},${h.source || 'unknown'}`
        ).join('\n');
        downloadFile(headers + rows, `${field?.name.replace(/\s+/g, '_') || 'field'}_history.csv`, 'text/csv');
        setShowExportMenu(false);
    };

    // ─── Timeline filtered data ───────────────────────────────────────────────────
    const filteredHistory = useMemo(() => {
        if (!timelineRange || !history.length) return history;
        return history.slice(timelineRange.start, timelineRange.end + 1);
    }, [history, timelineRange]);

    // Crop Health Trends chart data — prefer the aggregator's KurimaScore trend
    // (0-100, a single clearly-labelled unit) over the old dual-axis NDVI(0-1) +
    // moisture(0-100) plot whose visible axis read as an unlabelled ~0-32 range.
    const kurimaTrend = useMemo(
        () => (fs?.indices?.trend_30d || [])
            .filter((p) => p.kurima_score !== null && p.kurima_score !== undefined)
            .map((p) => ({ date: p.date, kurima_score: p.kurima_score, ndvi: p.ndvi })),
        [fs]
    );
    const usingKurima = kurimaTrend.length > 0;
    const chartData = usingKurima ? kurimaTrend : filteredHistory;

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

    const yieldEfficiency = yieldData?.projected_yield && yieldData?.yield_potential
        ? Math.min(98, Math.round((yieldData.projected_yield / yieldData.yield_potential) * 100))
        : null;

    // Crop-specific threshold definitions
    const cropThresholds: Record<string, { ndvi: { excellent: number; good: number; moderate: number }; moisture: { adequate: number; low: number; critical: number } }> = {
        'Maize': { ndvi: { excellent: 0.7, good: 0.5, moderate: 0.35 }, moisture: { adequate: 50, low: 30, critical: 20 } },
        'Wheat': { ndvi: { excellent: 0.65, good: 0.45, moderate: 0.3 }, moisture: { adequate: 45, low: 25, critical: 15 } },
        'Sorghum': { ndvi: { excellent: 0.65, good: 0.45, moderate: 0.3 }, moisture: { adequate: 35, low: 20, critical: 10 } },
        'Finger Millet': { ndvi: { excellent: 0.55, good: 0.4, moderate: 0.25 }, moisture: { adequate: 30, low: 18, critical: 10 } },
        'Pearl Millet': { ndvi: { excellent: 0.55, good: 0.4, moderate: 0.25 }, moisture: { adequate: 30, low: 18, critical: 10 } },
        'Tobacco': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 45, low: 30, critical: 20 } },
        'Cotton': { ndvi: { excellent: 0.65, good: 0.45, moderate: 0.3 }, moisture: { adequate: 40, low: 25, critical: 15 } },
        'Sunflower': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 35, low: 20, critical: 12 } },
        'Paprika': { ndvi: { excellent: 0.55, good: 0.35, moderate: 0.2 }, moisture: { adequate: 45, low: 30, critical: 18 } },
        'Sesame': { ndvi: { excellent: 0.55, good: 0.35, moderate: 0.2 }, moisture: { adequate: 30, low: 18, critical: 10 } },
        'Tea': { ndvi: { excellent: 0.7, good: 0.55, moderate: 0.4 }, moisture: { adequate: 55, low: 40, critical: 30 } },
        'Soybeans': { ndvi: { excellent: 0.65, good: 0.45, moderate: 0.3 }, moisture: { adequate: 40, low: 25, critical: 15 } },
        'Soybean': { ndvi: { excellent: 0.65, good: 0.45, moderate: 0.3 }, moisture: { adequate: 40, low: 25, critical: 15 } },
        'Groundnuts': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 35, low: 20, critical: 12 } },
        'Sugar Beans': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 40, low: 25, critical: 15 } },
        'Cowpeas': { ndvi: { excellent: 0.55, good: 0.35, moderate: 0.2 }, moisture: { adequate: 30, low: 18, critical: 10 } },
        'Bambara Nuts': { ndvi: { excellent: 0.5, good: 0.35, moderate: 0.2 }, moisture: { adequate: 25, low: 15, critical: 8 } },
        'Peas': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 45, low: 28, critical: 15 } },
        'Green Beans': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 45, low: 30, critical: 18 } },
        'Potato': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 55, low: 35, critical: 22 } },
        'Sweet Potato': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 40, low: 25, critical: 15 } },
        'Cassava': { ndvi: { excellent: 0.55, good: 0.35, moderate: 0.2 }, moisture: { adequate: 30, low: 18, critical: 10 } },
        'Tomato': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 55, low: 35, critical: 22 } },
        'Onion': { ndvi: { excellent: 0.45, good: 0.3, moderate: 0.2 }, moisture: { adequate: 50, low: 30, critical: 18 } },
        'Cabbage': { ndvi: { excellent: 0.55, good: 0.4, moderate: 0.25 }, moisture: { adequate: 55, low: 35, critical: 22 } },
        'Butternut': { ndvi: { excellent: 0.6, good: 0.4, moderate: 0.25 }, moisture: { adequate: 40, low: 25, critical: 15 } },
        'Green Pepper': { ndvi: { excellent: 0.55, good: 0.4, moderate: 0.25 }, moisture: { adequate: 50, low: 32, critical: 20 } },
        'Garlic': { ndvi: { excellent: 0.45, good: 0.3, moderate: 0.2 }, moisture: { adequate: 45, low: 28, critical: 15 } },
        'Strawberries': { ndvi: { excellent: 0.55, good: 0.35, moderate: 0.2 }, moisture: { adequate: 55, low: 35, critical: 22 } },
        'Blueberries': { ndvi: { excellent: 0.55, good: 0.35, moderate: 0.2 }, moisture: { adequate: 50, low: 32, critical: 20 } },
        'Snow Peas': { ndvi: { excellent: 0.55, good: 0.4, moderate: 0.25 }, moisture: { adequate: 45, low: 28, critical: 15 } },
    };
    // NOTE: these crop thresholds are retained ONLY as an offline fallback. When the
    // aggregator (`fs`) is available, NDVI interpretation comes from the server
    // (`fs.indices.current.ndvi_label/color`) so it can never diverge from the
    // KurimaScore. This is the fix for "EXCELLENT HEALTH over Critical NDVI".
    const ct = cropThresholds[field.crop] || { ndvi: { excellent: 0.6, good: 0.45, moderate: 0.3 }, moisture: { adequate: 40, low: 25, critical: 15 } };
    const getNdviLabel = (v: number) => fs?.indices?.current?.ndvi_label
        || (v >= ct.ndvi.excellent ? 'Excellent' : v >= ct.ndvi.good ? 'Good' : v >= ct.ndvi.moderate ? 'Moderate' : 'Critical');
    const getNdviColor = (v: number) => fs?.indices?.current?.ndvi_color
        || (v >= ct.ndvi.good ? 'var(--ee-primary)' : v >= ct.ndvi.moderate ? 'var(--ee-sun)' : '#dc2626');
    const getMoistureLabel = (v: number) => (fs?.water_balance?.soil_moisture_label
        ? fs.water_balance.soil_moisture_label.charAt(0).toUpperCase() + fs.water_balance.soil_moisture_label.slice(1)
        : (v >= ct.moisture.adequate ? 'Adequate' : v >= ct.moisture.low ? 'Moderate' : v >= ct.moisture.critical ? 'Low' : 'Critical'));
    const getMoistureColor = (v: number) => v >= ct.moisture.low ? 'var(--ee-primary)' : v >= ct.moisture.critical ? 'var(--ee-sun)' : '#dc2626';

    // Agronomist insight now comes from the aggregator's KurimaScore block (which
    // runs in the field's own scope), so it never shows "Field not found" for a
    // field that exists. Falls back to the legacy insight only if the aggregator
    // hasn't loaded yet.
    const aggregatorInsight = fs?.kurima_score
        ? [fs.kurima_score.primary_driver, fs.kurima_score.likely_cause, fs.kurima_score.recommended_action].filter(Boolean).join(' ')
        : null;
    const displayInsight = aggregatorInsight || aiInsight || field.latestInsight || null;

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
                <div className="flex items-center gap-3">
                    {/* Export button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="px-4 py-3 rounded-[16px] font-bold text-sm uppercase tracking-wider hover:scale-105 transition-transform"
                            style={{ background: 'var(--ee-surface)', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            <span className="material-symbols-outlined text-sm mr-1 align-middle">download</span>
                            Export
                        </button>
                        {showExportMenu && (
                            <>
                                <div className="fixed inset-0 z-[100]" onClick={() => setShowExportMenu(false)} />
                                <div className="absolute right-0 top-full mt-2 z-[101] neu-surface rounded-[16px] overflow-hidden shadow-lg min-w-[200px]"
                                    style={{ background: 'var(--ee-surface)' }}>
                                    <button
                                        onClick={handleExportGeoJSON}
                                        className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-2 hover:bg-black/5 transition-colors"
                                        style={{ color: 'var(--ee-text)' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--ee-primary)' }}>map</span>
                                        GeoJSON (.geojson)
                                    </button>
                                    <button
                                        onClick={handleExportKML}
                                        className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-2 hover:bg-black/5 transition-colors"
                                        style={{ color: 'var(--ee-text)' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#3B82F6' }}>public</span>
                                        Google Earth (.kml)
                                    </button>
                                    {history.length > 0 && (
                                        <button
                                            onClick={handleExportCSV}
                                            className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-2 hover:bg-black/5 transition-colors"
                                            style={{ color: 'var(--ee-text)' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#EAB308' }}>table_chart</span>
                                            History Data (.csv)
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
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
                        {/* Single health badge from the aggregator's KurimaScore.
                            Replaces the old `field.healthStatus` badge that could read
                            "EXCELLENT" while the NDVI below it read "Critical". */}
                        <div
                            className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider"
                            style={{
                                background: fs?.kurima_score ? `${fs.kurima_score.color}1A` : 'rgba(139,157,143,0.12)',
                                color: fs?.kurima_score?.color || 'var(--ee-muted)',
                            }}
                            title={fs?.kurima_score ? `KurimaScore ${fs.kurima_score.score}/100` : undefined}
                        >
                            <span className="material-symbols-outlined text-xs mr-1 align-middle">
                                {(fs?.kurima_score?.score ?? 0) >= 70 ? 'eco' : (fs?.kurima_score?.score ?? 0) >= 55 ? 'spa' : 'warning'}
                            </span>
                            {fs?.kurima_score ? `${fs.kurima_score.label} • ${fs.kurima_score.score}/100` : (field.healthStatus ? `${field.healthStatus} Health` : 'Analyzing…')}
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
                            <div className="text-[10px] font-bold mt-1" style={{ color: getNdviColor(field.ndvi ?? 0) }}>
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
                            <div className="text-[10px] font-bold mt-1" style={{ color: getMoistureColor(field.soilMoisture ?? 0) }}>
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
                        {(!displayInsight && insightLoading) ? (
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

                {/* Row 3: Historical Trends Chart with Timeline Slider (full width) */}
                <div className="lg:col-span-12 neu-surface p-8 lg:p-10" style={{ background: 'var(--ee-surface)', borderRadius: '24px' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--ee-water)' }}>show_chart</span>
                            Crop Health Trends
                        </h2>
                        <div className="flex items-center gap-3">
                            {timelineRange && (
                                <button
                                    onClick={() => setTimelineRange(null)}
                                    className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-black/5 transition-colors"
                                    style={{ color: 'var(--ee-muted)' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                    Reset zoom
                                </button>
                            )}
                            <p className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{
                                color: 'var(--ee-muted)',
                                background: 'var(--ee-bg)',
                            }}>
                                {usingKurima
                                    ? 'KurimaScore (0–100)'
                                    : (history.some(h => h.source === 'satellite') ? 'Satellite + Climate Model' : 'Climate Model Estimate')}
                            </p>
                        </div>
                    </div>
                    {chartData.length > 0 ? (
                        <div className="w-full">
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorKurima" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0fb885" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#0fb885" stopOpacity={0} />
                                            </linearGradient>
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
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#8B9D8F', fontSize: 10, fontWeight: 700 }}
                                            domain={usingKurima ? [0, 100] : undefined as any}
                                            label={usingKurima ? { value: 'KurimaScore (0–100)', angle: -90, position: 'insideLeft', style: { fill: '#8B9D8F', fontSize: 10, fontWeight: 700 } } : undefined}
                                        />
                                        {usingKurima ? (
                                            <>
                                                {/* Score bands as background regions: Strong/Adequate/Stressed */}
                                                <ReferenceArea y1={70} y2={100} fill="#0fb885" fillOpacity={0.06} />
                                                <ReferenceArea y1={55} y2={70} fill="#EAB308" fillOpacity={0.06} />
                                                <ReferenceArea y1={0} y2={55} fill="#dc2626" fillOpacity={0.05} />
                                                <ReferenceLine y={70} stroke="#0fb885" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'Strong', position: 'right', fontSize: 9, fill: '#0fb885' }} />
                                                <ReferenceLine y={55} stroke="#EAB308" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'Adequate', position: 'right', fontSize: 9, fill: '#EAB308' }} />
                                                <ReferenceLine y={40} stroke="#dc2626" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'Stressed', position: 'right', fontSize: 9, fill: '#dc2626' }} />
                                            </>
                                        ) : (
                                            <>
                                                <ReferenceLine y={ct.ndvi.good} stroke="#0fb885" strokeDasharray="4 4" strokeOpacity={0.4} />
                                                <ReferenceLine y={ct.ndvi.moderate} stroke="#EAB308" strokeDasharray="4 4" strokeOpacity={0.3} />
                                            </>
                                        )}
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
                                        {usingKurima ? (
                                            <Area type="monotone" dataKey="kurima_score" stroke="#0fb885" strokeWidth={3} fillOpacity={1} fill="url(#colorKurima)" name="KurimaScore" connectNulls />
                                        ) : (
                                            <>
                                                <Area type="monotone" dataKey="ndvi" stroke="#0fb885" strokeWidth={3} fillOpacity={1} fill="url(#colorNdvi)" name="NDVI" />
                                                <Area type="monotone" dataKey="soilMoisture" stroke="#5C9EAD" strokeWidth={3} fillOpacity={1} fill="url(#colorMoisture)" name="Moisture (%)" />
                                            </>
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Timeline Brush / Slider (NDVI fallback view only) */}
                            {!usingKurima && history.length > 5 && (
                                <div className="h-12 mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={history} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="brushGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0fb885" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#0fb885" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="ndvi" stroke="#0fb885" strokeWidth={1} fill="url(#brushGrad)" />
                                            <Brush
                                                dataKey="date"
                                                height={28}
                                                stroke="var(--ee-primary)"
                                                fill="var(--ee-bg)"
                                                tickFormatter={(val) => {
                                                    const d = new Date(val);
                                                    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                                                }}
                                                onChange={(range: any) => {
                                                    if (range && range.startIndex !== undefined) {
                                                        setTimelineRange({ start: range.startIndex, end: range.endIndex });
                                                    }
                                                }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Timeline hint */}
                            {!usingKurima && history.length > 5 && !timelineRange && (
                                <p className="text-[10px] text-center mt-1 font-bold" style={{ color: 'var(--ee-muted)' }}>
                                    Drag the handles above to zoom into a specific time period
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64">
                            <span className="material-symbols-outlined mb-3" style={{ fontSize: '48px', color: 'var(--ee-muted)' }}>show_chart</span>
                            <p className="font-bold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>No trend data yet</p>
                            <p className="text-sm mt-1 text-center max-w-md" style={{ color: 'var(--ee-muted)' }}>
                                Click &ldquo;Refresh Analysis&rdquo; to trigger a satellite scan. Historical trends will build up over time.
                            </p>
                        </div>
                    )}
                </div>

                {/* Row 4: Scouting Observations (full width) */}
                <div className="lg:col-span-12 neu-surface p-8 lg:p-10" style={{ background: 'var(--ee-surface)', borderRadius: '24px' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#F97316' }}>pin_drop</span>
                            Field Scouting
                        </h2>
                        <button
                            onClick={() => setShowScoutingModal(true)}
                            className="px-4 py-2.5 rounded-[16px] font-bold text-sm flex items-center gap-1.5 hover:scale-105 transition-transform"
                            style={{ background: 'var(--ee-text)', color: '#FFFFFF', fontFamily: 'var(--font-body)' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                            Add Observation
                        </button>
                    </div>

                    {scoutingPins.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {scoutingPins.map(pin => {
                                const catConfig = SCOUTING_CATEGORIES.find(c => c.value === pin.category);
                                const sevConfig = SEVERITY_LEVELS.find(s => s.value === pin.severity);
                                return (
                                    <div
                                        key={pin.id}
                                        className="p-4 rounded-[16px] group relative"
                                        style={{ background: 'var(--ee-bg)' }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ background: `${catConfig?.color}15` }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: catConfig?.color }}>
                                                    {catConfig?.icon}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-bold text-sm truncate" style={{ color: 'var(--ee-text)' }}>
                                                        {pin.title}
                                                    </p>
                                                    <span
                                                        className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                                                        style={{ background: `${sevConfig?.color}15`, color: sevConfig?.color }}
                                                    >
                                                        {pin.severity}
                                                    </span>
                                                </div>
                                                {pin.notes && (
                                                    <p className="text-xs" style={{ color: 'var(--ee-muted)' }}>{pin.notes}</p>
                                                )}
                                                <p className="text-[10px] font-bold mt-1.5" style={{ color: 'var(--ee-muted)' }}>
                                                    {new Date(pin.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => deleteScoutingPin(pin.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-50"
                                                title="Delete observation"
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#EF4444' }}>close</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                                style={{ background: 'color-mix(in srgb, #F97316 10%, transparent)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#F97316' }}>pin_drop</span>
                            </div>
                            <p className="font-bold text-sm" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>No observations yet</p>
                            <p className="text-xs mt-1 text-center max-w-sm" style={{ color: 'var(--ee-muted)' }}>
                                Record pest sightings, disease symptoms, weed pressure, and other field observations to build a scouting history.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Scouting Observation Modal ─────────────────────────────────── */}
            {showScoutingModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
                    style={{ background: 'rgba(45,58,48,0.4)', backdropFilter: 'blur(8px)' }}>
                    <div className="neu-surface w-full max-w-md animate-in zoom-in-95 p-8 rounded-[24px]"
                        style={{ background: 'var(--ee-surface)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                New Observation
                            </h3>
                            <button onClick={() => setShowScoutingModal(false)} className="p-1">
                                <span className="material-symbols-outlined" style={{ color: 'var(--ee-muted)' }}>close</span>
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Category selector */}
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--ee-muted)' }}>
                                    Category
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {SCOUTING_CATEGORIES.map(cat => (
                                        <button
                                            key={cat.value}
                                            onClick={() => setNewPin(p => ({ ...p, category: cat.value }))}
                                            className="p-3 rounded-[12px] text-center transition-all"
                                            style={{
                                                background: newPin.category === cat.value ? `${cat.color}15` : 'var(--ee-bg)',
                                                border: `2px solid ${newPin.category === cat.value ? cat.color : 'transparent'}`,
                                            }}
                                        >
                                            <span className="material-symbols-outlined block mx-auto mb-1"
                                                style={{ fontSize: '20px', color: cat.color }}>{cat.icon}</span>
                                            <span className="text-[10px] font-bold" style={{ color: 'var(--ee-text)' }}>{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Severity */}
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--ee-muted)' }}>
                                    Severity
                                </label>
                                <div className="flex gap-2">
                                    {SEVERITY_LEVELS.map(sev => (
                                        <button
                                            key={sev.value}
                                            onClick={() => setNewPin(p => ({ ...p, severity: sev.value }))}
                                            className="flex-1 py-2.5 rounded-[12px] text-xs font-bold transition-all"
                                            style={{
                                                background: newPin.severity === sev.value ? `${sev.color}15` : 'var(--ee-bg)',
                                                color: newPin.severity === sev.value ? sev.color : 'var(--ee-muted)',
                                                border: `2px solid ${newPin.severity === sev.value ? sev.color : 'transparent'}`,
                                            }}
                                        >
                                            {sev.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                                    What did you observe?
                                </label>
                                <input
                                    type="text"
                                    className="w-full rounded-[16px] p-3 font-bold focus:outline-none"
                                    style={{
                                        background: 'var(--ee-bg)',
                                        color: 'var(--ee-text)',
                                        fontFamily: 'var(--font-body)',
                                        boxShadow: 'var(--shadow-neu-inset)',
                                        border: 'none',
                                    }}
                                    placeholder="e.g. Fall armyworm on 3 rows, yellowing leaves..."
                                    value={newPin.title || ''}
                                    onChange={e => setNewPin(p => ({ ...p, title: e.target.value }))}
                                    autoFocus
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                                    Notes <span style={{ fontWeight: 400, textTransform: 'lowercase' }}>(optional)</span>
                                </label>
                                <textarea
                                    className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                                    style={{
                                        background: 'var(--ee-bg)',
                                        color: 'var(--ee-text)',
                                        fontFamily: 'var(--font-body)',
                                        boxShadow: 'var(--shadow-neu-inset)',
                                        border: 'none',
                                    }}
                                    placeholder="Additional details, estimated affected area..."
                                    rows={2}
                                    value={newPin.notes || ''}
                                    onChange={e => setNewPin(p => ({ ...p, notes: e.target.value }))}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowScoutingModal(false)}
                                    className="flex-1 py-3.5 rounded-[16px] font-bold transition-colors"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveScoutingPin}
                                    disabled={!newPin.title}
                                    className="flex-1 py-3.5 rounded-[16px] font-black transition-all disabled:opacity-50"
                                    style={{
                                        background: 'var(--ee-primary)',
                                        color: '#FFFFFF',
                                        fontFamily: 'var(--font-heading)',
                                    }}
                                >
                                    Save Observation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
