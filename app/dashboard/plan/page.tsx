"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import CropPlan from '@/components/dashboard/CropPlan';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { FieldData } from '@/components/dashboard/types';

export default function PlanPage() {
    const [fields, setFields] = useState<FieldData[]>([]);
    const [selectedField, setSelectedField] = useState<FieldData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activityRefresh, setActivityRefresh] = useState(0);

    useEffect(() => {
        api.getFields().then(data => {
            setFields(data);
            if (data.length > 0) {
                setSelectedField(data[0]);
            }
            setLoading(false);
        });
    }, []);

    // Called when CropPlan's "Add to Tasks" button is pressed
    const handleActionsAdded = () => {
        setActivityRefresh(prev => prev + 1);
    };

    if (loading) {
        return (
            <div
                className="p-10 flex flex-col items-center justify-center min-h-[50vh]"
                style={{ background: 'var(--ee-bg)' }}
            >
                <div
                    className="w-12 h-12 rounded-full animate-spin mb-4"
                    style={{
                        border: '4px solid var(--ee-primary)',
                        borderTopColor: 'transparent',
                    }}
                ></div>
                <p
                    className="font-bold"
                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                >
                    Loading Plan...
                </p>
            </div>
        );
    }

    // Calculate days since planting for field selector
    const getDaysSincePlanting = (field: FieldData) => {
        const pd = field.plantingDate || field.planting_date;
        if (!pd) return null;
        return Math.floor((Date.now() - new Date(pd).getTime()) / (1000 * 60 * 60 * 24));
    };

    return (
        <div
            className="p-8 h-screen overflow-y-auto"
            style={{ background: 'var(--ee-bg)' }}
        >
            <h1
                className="text-4xl font-black mb-8 tracking-tight"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                <span className="material-symbols-outlined align-middle mr-2" style={{ fontSize: '2rem', color: 'var(--ee-primary)' }}>
                    eco
                </span>
                Smart Crop Plan
            </h1>

            {/* Field Selector */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-4 snap-x">
                {fields.map(field => {
                    const dsp = getDaysSincePlanting(field);
                    const isSelected = selectedField?.id === field.id;
                    return (
                        <button
                            key={field.id}
                            onClick={() => setSelectedField(field)}
                            className={`flex-shrink-0 p-6 rounded-[24px] transition-all min-w-[220px] text-left snap-start ${
                                isSelected ? 'neu-surface scale-105' : 'neu-surface'
                            }`}
                            style={{
                                background: isSelected ? 'var(--ee-text)' : 'var(--ee-surface)',
                                color: isSelected ? '#FFFFFF' : 'var(--ee-muted)',
                                boxShadow: isSelected ? 'var(--shadow-ambient)' : 'var(--shadow-neu)',
                            }}
                        >
                            <p
                                className="text-xs font-bold uppercase mb-1 opacity-70"
                                style={{ fontFamily: 'var(--font-body)' }}
                            >
                                {field.crop}
                            </p>
                            <h3
                                className="text-xl font-black"
                                style={{ fontFamily: 'var(--font-heading)' }}
                            >
                                {field.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-2">
                                <p className="text-xs font-bold opacity-70" style={{ fontFamily: 'var(--font-body)' }}>
                                    {field.area?.toFixed(1)} ha
                                </p>
                                {field.variety && (
                                    <p className="text-xs font-bold opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                                        {field.variety}
                                    </p>
                                )}
                            </div>
                            {dsp != null && dsp > 0 && (
                                <p
                                    className="text-[10px] font-bold mt-2 uppercase tracking-wider"
                                    style={{
                                        color: isSelected ? 'var(--ee-primary)' : 'var(--ee-muted)',
                                        fontFamily: 'var(--font-heading)',
                                    }}
                                >
                                    Day {dsp}
                                </p>
                            )}
                        </button>
                    );
                })}
                {fields.length === 0 && (
                    <div
                        className="p-6 rounded-[24px] neu-surface"
                        style={{
                            background: 'var(--ee-surface)',
                            color: 'var(--ee-muted)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        No fields found. Add a field to get started.
                    </div>
                )}
            </div>

            {/* Plan Display */}
            <div
                className="rounded-[24px] p-2 mb-8 neu-surface"
                style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}
            >
                <CropPlan
                    selectedField={selectedField}
                    onActionsAdded={handleActionsAdded}
                />
            </div>

            {/* Activity Log Section */}
            <div className="mb-8">
                <ActivityLog
                    fieldId={selectedField?.id}
                    refreshTrigger={activityRefresh}
                    onActivityComplete={(id) => {
                        // Could trigger a re-fetch of the dashboard priorities if needed
                        console.log('Activity completed:', id);
                    }}
                    onActivityCreate={(activity) => {
                        console.log('Activity created:', activity);
                    }}
                />
            </div>
        </div>
    );
}
