"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { FieldData } from '@/components/dashboard/types';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function FieldInsightsPage() {
    const params = useParams();
    const router = useRouter();
    const fieldId = params.id as string;

    const [field, setField] = useState<FieldData | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!fieldId) return;

        // Fetch specific field from list (or endpoint if we had one, filtering for now)
        api.getFields().then(fields => {
            const found = fields.find(f => f.id === fieldId);
            if (found) setField(found);
            else {
                // Handle not found
            }
        });

        api.getFieldHistory(fieldId).then(data => {
            setHistory(data);
            setLoading(false);
        });
    }, [fieldId]);

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

    return (
        <div className="min-h-screen p-8" style={{ background: 'var(--ee-bg)', fontFamily: 'var(--font-body)' }}>
            {/* Header / Nav */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="w-12 h-12 neu-surface rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                    style={{ background: 'var(--ee-surface)', color: 'var(--ee-muted)' }}
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h1
                        className="text-4xl font-black tracking-tight"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        {field.name}
                    </h1>
                    <p
                        className="font-bold uppercase text-sm mt-1"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        {field.crop} &bull; {field.area} ha
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Main Status Card */}
                <div
                    className="lg:col-span-2 neu-surface p-10"
                    style={{ background: 'var(--ee-surface)', borderRadius: '24px' }}
                >
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2
                                className="text-2xl font-black"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                            >
                                Current Status
                            </h2>
                            <p className="text-sm font-bold mt-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                <span className="material-symbols-outlined text-sm mr-1 align-middle" style={{ color: 'var(--ee-water)' }}>satellite_alt</span>
                                Satellite Analysis: {field.lastSatellitePass}
                            </p>
                        </div>
                        <div
                            className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider"
                            style={{
                                background: field.healthStatus === 'Excellent' ? 'rgba(15, 184, 133, 0.1)' : 'rgba(220, 38, 38, 0.08)',
                                color: field.healthStatus === 'Excellent' ? 'var(--ee-primary)' : '#dc2626'
                            }}
                        >
                            <span className="material-symbols-outlined text-xs mr-1 align-middle">
                                {field.healthStatus === 'Excellent' ? 'eco' : 'warning'}
                            </span>
                            {field.healthStatus} Health
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                        <div className="p-6 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                            <p
                                className="text-xs font-bold uppercase mb-2"
                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }}
                            >
                                <span className="material-symbols-outlined text-xs mr-1 align-middle" style={{ color: 'var(--ee-primary)' }}>grass</span>
                                NDVI Index
                            </p>
                            <div
                                className="text-4xl font-black"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                            >
                                {field.ndvi.toFixed(2)}
                            </div>
                            <div
                                className="text-xs font-bold mt-2"
                                style={{
                                    color: field.ndvi > 0.5 ? 'var(--ee-primary)' : field.ndvi > 0.3 ? 'var(--ee-sun)' : '#dc2626'
                                }}
                            >
                                {field.ndvi > 0.5 ? 'Optimal Range' : field.ndvi > 0.3 ? 'Moderate Health' : 'Critical Health'}
                            </div>
                        </div>
                        <div className="p-6 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                            <p
                                className="text-xs font-bold uppercase mb-2"
                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }}
                            >
                                <span className="material-symbols-outlined text-xs mr-1 align-middle" style={{ color: 'var(--ee-water)' }}>water_drop</span>
                                Soil Moisture
                            </p>
                            <div
                                className="text-4xl font-black"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                            >
                                {field.soilMoisture}%
                            </div>
                            <div
                                className="text-xs font-bold mt-2"
                                style={{
                                    color: field.soilMoisture > 40 ? 'var(--ee-primary)' : 'var(--ee-sun)'
                                }}
                            >
                                {field.soilMoisture > 40 ? 'Optimal' : field.soilMoisture > 20 ? 'Moderate Stress' : 'Critical'}
                            </div>
                        </div>
                        <div className="p-6 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
                            <p
                                className="text-xs font-bold uppercase mb-2"
                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }}
                            >
                                <span className="material-symbols-outlined text-xs mr-1 align-middle" style={{ color: 'var(--ee-sun)' }}>trending_up</span>
                                Yield Potential
                            </p>
                            <div
                                className="text-4xl font-black"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                            >
                                {field.projected_yield ? `${Math.min(98, Math.round((field.projected_yield / (field.yield_potential || 1)) * 100))}%` : "Calculating..."}
                            </div>
                            <div className="text-xs font-bold mt-2" style={{ color: 'var(--ee-muted)' }}>Efficiency Rating</div>
                        </div>
                    </div>
                </div>

                {/* 2. AI Agronomist Quick Insight */}
                <div
                    className="neu-surface p-10 flex flex-col justify-between relative overflow-hidden"
                    style={{
                        background: 'var(--ee-text)',
                        borderRadius: '24px',
                        color: 'var(--ee-bg)'
                    }}
                >
                    <div
                        className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
                        style={{ background: 'var(--ee-primary)', opacity: 0.08, filter: 'blur(80px)' }}
                    ></div>
                    <div>
                        <h2
                            className="text-2xl font-black mb-4"
                            style={{ fontFamily: 'var(--font-heading)' }}
                        >
                            <span className="material-symbols-outlined text-2xl mr-2 align-middle" style={{ color: 'var(--ee-primary)' }}>psychology</span>
                            Agronomist Insight
                        </h2>
                        <p className="font-medium leading-relaxed" style={{ opacity: 0.8, fontFamily: 'var(--font-body)' }}>
                            {field.latestInsight ? `"${field.latestInsight}"` : (
                                field.lastSatellitePass === "Pending..." || field.lastSatellitePass === "Analyzing..."
                                    ? "Intelligence pass in progress. Analysis will appear here shortly."
                                    : (field.healthStatus === 'Excellent'
                                        ? "Vegetation index is strong. No immediate irrigation required. Continue monitoring nitrogen levels."
                                        : "Moisture levels are dropping below optimal range. Consider scheduling irrigation for tomorrow morning.")
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            const insight = field.latestInsight || "the current field status";
                            const message = `I just reviewed the analysis for ${field.name}. It says: "${insight}". What specific actions should I take next?`;
                            router.push(`/dashboard/chat?initialMessage=${encodeURIComponent(message)}&fieldId=${field.id}`);
                        }}
                        className="mt-8 py-3 rounded-[16px] font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform"
                        style={{
                            background: 'var(--ee-primary)',
                            color: 'var(--ee-surface)',
                            fontFamily: 'var(--font-body)'
                        }}
                    >
                        <span className="material-symbols-outlined text-sm mr-1 align-middle">chat</span>
                        Ask Follow-up
                    </button>
                </div>

                {/* 3. Historical Trends Chart */}
                <div
                    className="lg:col-span-3 neu-surface p-10"
                    style={{ background: 'var(--ee-surface)', borderRadius: '24px' }}
                >
                    <h2
                        className="text-2xl font-black mb-8"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        <span className="material-symbols-outlined text-2xl mr-2 align-middle" style={{ color: 'var(--ee-water)' }}>show_chart</span>
                        Crop Health Trends (14 Days)
                    </h2>
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
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#8B9D8F', fontSize: 10, fontWeight: 700 }} tickMargin={10} />
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
                                />
                                <Area type="monotone" dataKey="ndvi" stroke="#0fb885" strokeWidth={3} fillOpacity={1} fill="url(#colorNdvi)" name="NDVI" />
                                <Area type="monotone" dataKey="soilMoisture" stroke="#5C9EAD" strokeWidth={3} fillOpacity={1} fill="url(#colorMoisture)" name="Moisture (%)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
