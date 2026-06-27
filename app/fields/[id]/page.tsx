"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { parseFrom, BACK_DEFAULTS } from '@/lib/nav-links';
import { FieldData, ScoutingPin, ScoutingCategory, ScoutingSeverity } from '@/components/dashboard/types';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, ReferenceArea } from 'recharts';
import { fieldsToGeoJSON, fieldsToKML, downloadFile } from '@/lib/geo';
import { useFieldState } from '@/hooks/useFieldState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SeasonAccumulationCharts } from '@/components/field/SeasonAccumulationCharts';

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
    const searchParams = useSearchParams();
    const fieldId = params.id as string;
    // Contextual, deep-link-safe back target (an explicit href, not history-back).
    const back = parseFrom(searchParams, BACK_DEFAULTS.consumerField);

    // Canonical field state from the aggregator — the SINGLE source of truth for
    // this page. Every display value, label and the trend chart read from `fs`.
    // There is no legacy fallback: aggregator OR loading OR explicit error.
    const { fieldState: fs, isLoading: fsLoading, error: fsError, refresh } = useFieldState(fieldId);

    const [analyzing, setAnalyzing] = useState(false);

    // A lightweight FieldData-shaped view-model derived from the aggregator's
    // `fs.field`, used by the header, export and scouting features (which need a
    // name + polygon). Not a second data source — just a projection of `fs`.
    const field = useMemo<FieldData | null>(() => {
        if (!fs?.field) return null;
        const f = fs.field;
        const coordinates = (f.polygon_coordinates || []).map((p) => ({ lat: p.lat, lon: p.lon }));
        const location = coordinates.length
            ? { lat: coordinates.reduce((s, c) => s + c.lat, 0) / coordinates.length,
                lon: coordinates.reduce((s, c) => s + c.lon, 0) / coordinates.length }
            : undefined;
        return {
            id: f.id,
            name: f.name,
            crop: (f.crop_type || '') as any,
            area: f.area_ha ?? 0,
            ndvi: fs.indices?.current?.ndvi ?? 0,
            soilMoisture: fs.water_balance?.soil_moisture_pct ?? 0,
            healthStatus: 'Good',
            lastSatellitePass: fs.meta?.as_of_satellite_pass ?? '',
            location,
            coordinates,
            variety: f.variety_code ?? undefined,
            plantingDate: fs.season?.planted_date ?? undefined,
        } as FieldData;
    }, [fs]);

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
        loadScoutingPins();
    }, [fieldId]);

    const triggerAnalysis = async () => {
        setAnalyzing(true);
        try {
            await api.analyzeField(fieldId);
            // Re-fetch the canonical field state once ingestion has had time to land.
            setTimeout(() => refresh(), 3000);
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
        const trend = fs?.indices?.trend_30d || [];
        if (!trend.length) return;
        const headers = 'Date,NDVI,KurimaScore\n';
        const rows = trend.map(p => `${p.date},${p.ndvi ?? ''},${p.kurima_score ?? ''}`).join('\n');
        downloadFile(headers + rows, `${field?.name.replace(/\s+/g, '_') || 'field'}_kurimascore.csv`, 'text/csv');
        setShowExportMenu(false);
    };

    // Crop Health Trends chart data — the aggregator's KurimaScore trend (0-100, a
    // single clearly-labelled unit). Replaces the old dual-axis NDVI(0-1) +
    // moisture(0-100) plot whose visible axis read as an unlabelled ~0-32 range.
    const chartData = (fs?.indices?.trend_30d || [])
        .filter((p) => p.kurima_score !== null && p.kurima_score !== undefined)
        .map((p) => ({ date: p.date, kurima_score: p.kurima_score, ndvi: p.ndvi }));

    // Explicit loading / error — never render with legacy fallback values.
    if (fsLoading || (!fs && !fsError)) {
        return (
            <div
                className="min-h-screen flex items-center justify-center font-bold"
                style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                <span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span>
                Loading field state…
            </div>
        );
    }

    if (fsError || !fs || !field) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center font-bold gap-2"
                style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#dc2626' }}>error_outline</span>
                {fsError?.message || 'Field state could not be loaded'}
            </div>
        );
    }

    const projected = fs.yield_projection?.projected_tonnes_per_ha;
    const potential = fs.yield_projection?.potential_tonnes_per_ha;
    const yieldEfficiency = (projected != null && potential)
        ? Math.min(98, Math.round((projected / potential) * 100))
        : null;

    // All NDVI/moisture interpretation comes from the aggregator (classifiers.py
    // on the backend). No crop-threshold table lives in the frontend any more.
    const MOISTURE_COLORS: Record<string, string> = {
        adequate: 'var(--ee-primary)', moderate: 'var(--ee-sun)', low: '#dc2626', dry: '#dc2626',
    };
    const getNdviLabel = () => fs.indices?.current?.ndvi_label ?? null;
    const getNdviColor = () => fs.indices?.current?.ndvi_color ?? 'var(--ee-muted)';
    const getMoistureLabel = () => {
        const label = fs.water_balance?.soil_moisture_label;
        return label ? label.charAt(0).toUpperCase() + label.slice(1) : null;
    };
    const getMoistureColor = () => MOISTURE_COLORS[fs.water_balance?.soil_moisture_label || ''] || 'var(--ee-muted)';

    // Agronomist insight reads ONLY from the aggregator's KurimaScore block, which
    // runs in the field's own scope — so it never shows "Field not found".
    const displayInsight = fs.kurima_score
        ? [fs.kurima_score.primary_driver, fs.kurima_score.likely_cause, fs.kurima_score.recommended_action].filter(Boolean).join(' ')
        : null;

    return (
        <div className="min-h-screen p-6 lg:p-8" style={{ background: 'var(--ee-bg)', fontFamily: 'var(--font-body)' }}>
          <PageContainer variant="wide">
            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href={back.href}
                        title={`Back to ${back.label}`}
                        aria-label={`Back to ${back.label}`}
                        className="w-12 h-12 neu-surface rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                        style={{ background: 'var(--ee-surface)', color: 'var(--ee-muted)' }}
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
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
                                    {(fs?.indices?.trend_30d?.length ?? 0) > 0 && (
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
                                Last satellite pass: {fs.meta?.as_of_satellite_pass || '—'}
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
                            title={`KurimaScore ${fs.kurima_score.score}/100`}
                        >
                            <span className="material-symbols-outlined text-xs mr-1 align-middle">
                                {fs.kurima_score.score >= 70 ? 'eco' : fs.kurima_score.score >= 55 ? 'spa' : 'warning'}
                            </span>
                            {`${fs.kurima_score.label} • ${fs.kurima_score.score}/100`}
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
                                {fs.indices?.current?.ndvi != null ? fs.indices.current.ndvi.toFixed(2) : '—'}
                            </div>
                            <div className="text-[10px] font-bold mt-1" style={{ color: getNdviColor() }}>
                                {getNdviLabel() ?? '—'}
                            </div>
                        </div>

                        {/* Soil Moisture */}
                        <div className="p-5 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--ee-muted)', letterSpacing: '0.08em' }}>
                                <span className="material-symbols-outlined text-xs mr-1 align-middle" style={{ color: 'var(--ee-water)' }}>water_drop</span>
                                Moisture
                            </p>
                            <div className="text-3xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                {fs.water_balance?.soil_moisture_pct != null ? `${Math.round(fs.water_balance.soil_moisture_pct)}%` : '—'}
                            </div>
                            <div className="text-[10px] font-bold mt-1" style={{ color: getMoistureColor() }}>
                                {getMoistureLabel() ?? '—'}
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
                            {projected != null && (
                                <div className="text-[10px] font-bold mt-1" style={{ color: 'var(--ee-muted)' }}>
                                    {projected.toFixed(1)}t / {potential != null ? `${potential.toFixed(1)}t` : '—'} potential
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
                                {fs.season?.days_since_planted != null
                                    ? `${fs.season.days_since_planted}d`
                                    : <span className="text-lg" style={{ color: 'var(--ee-muted)' }}>Not set</span>}
                            </div>
                            <div className="text-[10px] font-bold mt-1" style={{ color: 'var(--ee-muted)' }}>
                                {fs.season?.planted_date
                                    ? new Date(fs.season.planted_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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
                        <p className="font-medium leading-relaxed text-base" style={{ opacity: 0.85, fontFamily: 'var(--font-body)' }}>
                            {displayInsight || "Run a satellite analysis to receive AI-powered agronomist recommendations for this field."}
                        </p>
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
                            onClick={() => refresh()}
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
                            <p className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{
                                color: 'var(--ee-muted)',
                                background: 'var(--ee-bg)',
                            }}>
                                KurimaScore (0–100)
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
                                            domain={[0, 100]}
                                            label={{ value: 'KurimaScore (0–100)', angle: -90, position: 'insideLeft', style: { fill: '#8B9D8F', fontSize: 10, fontWeight: 700 } }}
                                        />
                                        {/* Score bands as background regions: Strong/Adequate/Stressed */}
                                        <ReferenceArea y1={70} y2={100} fill="#0fb885" fillOpacity={0.06} />
                                        <ReferenceArea y1={55} y2={70} fill="#EAB308" fillOpacity={0.06} />
                                        <ReferenceArea y1={0} y2={55} fill="#dc2626" fillOpacity={0.05} />
                                        <ReferenceLine y={70} stroke="#0fb885" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'Strong', position: 'right', fontSize: 9, fill: '#0fb885' }} />
                                        <ReferenceLine y={55} stroke="#EAB308" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'Adequate', position: 'right', fontSize: 9, fill: '#EAB308' }} />
                                        <ReferenceLine y={40} stroke="#dc2626" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'Stressed', position: 'right', fontSize: 9, fill: '#dc2626' }} />
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
                                        <Area type="monotone" dataKey="kurima_score" stroke="#0fb885" strokeWidth={3} fillOpacity={1} fill="url(#colorKurima)" name="KurimaScore" connectNulls />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
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

                {/* Season accumulations (additive; self-contained data hook) */}
                <div className="lg:col-span-12 space-y-5">
                    <SeasonAccumulationCharts fieldId={fieldId} surface="consumer" />
                </div>

                {/* Capture actions (additive; offline-capable capture — Sprint 3) */}
                <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { href: `/fields/${fieldId}/harvest`, icon: 'agriculture', title: 'Record harvest', sub: 'Log actual yield — offline' },
                        { href: `/fields/${fieldId}/input`, icon: 'science', title: 'Log input', sub: 'Fertilizer / chemical — voice' },
                        { href: `/fields/${fieldId}/scout`, icon: 'pest_control', title: 'Scout & diagnose', sub: 'Photo → AI diagnosis' },
                    ].map((a) => (
                        <Link
                            key={a.href}
                            href={a.href}
                            className="flex items-center gap-3 neu-surface p-5 lg:p-6 transition-all hover:opacity-90"
                            style={{ background: 'var(--ee-surface)', borderRadius: '24px' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--ee-primary)' }}>{a.icon}</span>
                            <div>
                                <div className="font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{a.title}</div>
                                <div className="text-sm" style={{ color: 'var(--ee-muted)' }}>{a.sub}</div>
                            </div>
                        </Link>
                    ))}
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
          </PageContainer>
        </div>
    );
}
