"use client";

import React, { useState, useEffect } from 'react';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import CropPlan from '@/components/dashboard/CropPlan';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { FieldData } from '@/components/dashboard/types';
import { PageContainer } from '@/components/layout/PageContainer';
import Link from 'next/link';
import { routeForField, withFrom } from '@/lib/nav-links';
import IrrigationAdvisorCard from '@/components/irrigation/IrrigationAdvisorCard';

export default function PlanPage() {
    const { fields, loading } = useDashboardData();
    const [selectedField, setSelectedField] = useState<FieldData | null>(null);
    const [activityRefresh, setActivityRefresh] = useState(0);

    useEffect(() => {
        if (fields.length > 0 && !selectedField) {
            setSelectedField(fields[0] as FieldData);
        }
    }, [fields, selectedField]);

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
        // The dashboard layout's <main> already owns the scroll container; an
        // inner `h-screen overflow-y-auto` here created a nested scroll region
        // that ran under the fixed mobile nav and froze before the bottom. Flow
        // inside the layout's scroll instead (matches the dashboard home page).
        <PageContainer variant="wide">
            <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-black mb-5 sm:mb-8 tracking-tight"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                <span className="material-symbols-outlined align-middle mr-1.5 sm:mr-2" style={{ fontSize: '1.5rem', color: 'var(--ee-primary)' }}>
                    eco
                </span>
                Smart Crop Plan
            </h1>

            {/* Field Selector */}
            <div className="flex gap-3 sm:gap-4 mb-5 sm:mb-8 overflow-x-auto pb-3 sm:pb-4 snap-x scrollbar-hide">
                {fields.map(field => {
                    const dsp = getDaysSincePlanting(field);
                    const isSelected = selectedField?.id === field.id;
                    return (
                        <button
                            key={field.id}
                            onClick={() => setSelectedField(field)}
                            className={`flex-shrink-0 p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] transition-all min-w-[170px] sm:min-w-[220px] text-left snap-start ${
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

            {/* This plan is scoped to the selected field — link through to it.
                (Plan/activity items carry no per-item field_id; see
                docs/navigation_audit.md.) */}
            {selectedField?.id && (
                <Link
                    href={withFrom(routeForField(selectedField.id, 'consumer'), 'Plan', '/dashboard/plan')}
                    className="inline-flex items-center gap-1 mb-4 text-sm font-bold"
                    style={{ color: 'var(--ee-muted)' }}
                >
                    View {selectedField.name || 'field'} detail
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </Link>
            )}

            {/* Plan Display */}
            <div
                className="rounded-[20px] sm:rounded-[24px] p-1.5 sm:p-2 mb-5 sm:mb-8 neu-surface overflow-hidden"
                style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}
            >
                <CropPlan
                    selectedField={selectedField}
                    onActionsAdded={handleActionsAdded}
                />
            </div>

            {/* AI irrigation recommendation for the selected field — the
                irrigation engine's actionable planner integration. */}
            <div className="mb-5 sm:mb-8">
                <IrrigationAdvisorCard
                    fieldId={selectedField?.id}
                    fieldName={selectedField?.name}
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
        </PageContainer>
    );
}
