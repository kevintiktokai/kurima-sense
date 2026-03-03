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
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-bold">Loading Insights...</div>;
    }

    if (!field) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-bold">Field not found</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            {/* Header / Nav */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform text-slate-400"
                >
                    ←
                </button>
                <div>
                    <h1 className="text-4xl font-black text-brand-dark tracking-tight">{field.name}</h1>
                    <p className="text-slate-400 font-bold uppercase text-sm mt-1">{field.crop} • {field.area} ha</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Main Status Card */}
                <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] shadow-xl border border-white">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-brand-dark">Current Status</h2>
                            <p className="text-slate-400 text-sm font-bold mt-1">Satellite Analysis: {field.lastSatellitePass}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider ${field.healthStatus === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                            {field.healthStatus} Health
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                        <div className="bg-slate-50 p-6 rounded-[2.5rem]">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">NDVI Index</p>
                            <div className="text-4xl font-black text-brand-dark">{field.ndvi.toFixed(2)}</div>
                            <div className={`text-xs font-bold mt-2 ${field.ndvi > 0.5 ? 'text-emerald-500' : field.ndvi > 0.3 ? 'text-amber-500' : 'text-rose-500'}`}>
                                {field.ndvi > 0.5 ? 'Optimal Range' : field.ndvi > 0.3 ? 'Moderate Health' : 'Critical Health'}
                            </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2.5rem]">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Soil Moisture</p>
                            <div className="text-4xl font-black text-brand-dark">{field.soilMoisture}%</div>
                            <div className={`text-xs font-bold mt-2 ${field.soilMoisture > 40 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {field.soilMoisture > 40 ? 'Optimal' : field.soilMoisture > 20 ? 'Moderate Stress' : 'Critical'}
                            </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2.5rem]">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Yield Potential</p>
                            <div className="text-4xl font-black text-brand-dark">
                                {field.projected_yield ? `${Math.min(98, Math.round((field.projected_yield / (field.yield_potential || 1)) * 100))}%` : "Calculating..."}
                            </div>
                            <div className="text-slate-400 text-xs font-bold mt-2">Efficiency Rating</div>
                        </div>
                    </div>
                </div>

                {/* 2. AI Agronomist Quick Insight */}
                <div className="bg-brand-dark text-brand-beige p-10 rounded-[3.5rem] shadow-xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime opacity-10 blur-[80px] rounded-full pointer-events-none"></div>
                    <div>
                        <h2 className="text-2xl font-black mb-4">Agronomist Insight</h2>
                        <p className="text-white/80 font-medium leading-relaxed">
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
                        className="mt-8 py-3 bg-brand-lime text-brand-dark rounded-xl font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform"
                    >
                        Ask Follow-up
                    </button>
                </div>

                {/* 3. Historical Trends Chart */}
                <div className="lg:col-span-3 bg-white p-10 rounded-[3.5rem] shadow-xl border border-white">
                    <h2 className="text-2xl font-black text-brand-dark mb-8">Crop Health Trends (14 Days)</h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorNdvi" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} tickMargin={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#94A3B8', strokeWidth: 1 }}
                                />
                                <Area type="monotone" dataKey="ndvi" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorNdvi)" name="NDVI" />
                                <Area type="monotone" dataKey="soilMoisture" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorMoisture)" name="Moisture (%)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
