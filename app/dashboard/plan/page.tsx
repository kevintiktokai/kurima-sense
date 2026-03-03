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

    useEffect(() => {
        api.getFields().then(data => {
            setFields(data);
            if (data.length > 0) {
                setSelectedField(data[0]);
            }
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="p-10 text-center text-slate-400">Loading Plan...</div>;
    }

    return (
        <div className="p-8 h-screen overflow-y-auto">
            <h1 className="text-4xl font-black text-brand-dark mb-8 tracking-tight">Smart Crop Plan</h1>

            {/* Field Selector */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-4 snap-x">
                {fields.map(field => (
                    <button
                        key={field.id}
                        onClick={() => setSelectedField(field)}
                        className={`flex-shrink-0 p-6 rounded-[2.5rem] border-2 transition-all min-w-[200px] text-left snap-start
                            ${selectedField?.id === field.id
                                ? 'bg-brand-dark border-brand-dark text-white shadow-xl scale-105'
                                : 'bg-white border-slate-100 text-slate-400 hover:border-brand-lime'
                            }`}
                    >
                        <p className="text-xs font-bold uppercase mb-1 opacity-70">{field.crop}</p>
                        <h3 className="text-xl font-black">{field.name}</h3>
                        <p className="text-xs font-bold mt-2 opacity-70">{field.area.toFixed(1)} ha</p>
                    </button>
                ))}
                {fields.length === 0 && (
                    <div className="p-6 bg-slate-50 text-slate-400 rounded-3xl">No fields found. Add a field to get started.</div>
                )}
            </div>

            {/* Plan Display */}
            <div className="bg-slate-50 rounded-[3.5rem] p-2 mb-8">
                <CropPlan selectedField={selectedField} />
            </div>

            {/* Activity Log Section */}
            <div className="mb-8">
                <ActivityLog
                    fieldId={selectedField?.id}
                    onActivityComplete={(id) => console.log('Activity completed:', id)}
                    onActivityCreate={(activity) => console.log('Activity created:', activity)}
                />
            </div>
        </div>
    );
}

