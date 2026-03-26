"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { FieldData } from './types';
import CropSearchSelect from './CropSearchSelect';

interface FieldManagementProps {
    onSelectField?: (field: FieldData) => void;
}

// Dynamically import MapComponent to avoid SSR issues with Leaflet
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const MapComponent = dynamic(() => import('./MapComponent'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-100 animate-pulse rounded-[3.5rem] flex items-center justify-center font-bold text-slate-300">Loading Satellite Map...</div>
});

const FieldManagement: React.FC<FieldManagementProps> = ({ onSelectField }) => {
    const router = useRouter();
    const [fields, setFields] = useState<FieldData[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);

    useEffect(() => {
        api.getFields().then(data => {
            setFields(data);
            setLoading(false);
        });
    }, []);

    const handleDeleteField = async (fieldId: string, fieldName: string) => {
        setDeletingFieldId(fieldId);
        try {
            await api.deleteField(fieldId);
            setFields(prev => prev.filter(f => f.id !== fieldId));
            setShowDeleteConfirm(null);
            if (highlightedFieldId === fieldId) setHighlightedFieldId(null);
        } catch (e: any) {
            alert(e.message || "Failed to delete field");
        } finally {
            setDeletingFieldId(null);
        }
    };

    // Field creation state
    const [isCreating, setIsCreating] = useState(false);
    const [newFieldCoords, setNewFieldCoords] = useState<{ lat: number, lon: number }[]>([]);
    const [newFieldArea, setNewFieldArea] = useState(0);
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldCrop, setNewFieldCrop] = useState("Maize");
    const [newFieldDate, setNewFieldDate] = useState("");
    const [newFieldTransplantDate, setNewFieldTransplantDate] = useState("");
    const [newFieldVariety, setNewFieldVariety] = useState("");
    const [newFieldFertilizer, setNewFieldFertilizer] = useState("");
    const [availableVarieties, setAvailableVarieties] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Crops that are typically transplanted (not direct-seeded)
    const TRANSPLANTED_CROPS = ['Tomato', 'Cabbage', 'Onion', 'Potato', 'Pepper', 'Eggplant', 'Lettuce', 'Paprika', 'Green Pepper', 'Strawberries', 'Tea', 'Blueberries'];
    const isTransplantedCrop = TRANSPLANTED_CROPS.includes(newFieldCrop);

    useEffect(() => {
        if (newFieldCrop) {
            api.getCropVarieties(newFieldCrop).then(data => {
                setAvailableVarieties(data || []);
            });
            if (!TRANSPLANTED_CROPS.includes(newFieldCrop)) {
                setNewFieldTransplantDate("");
            }
        }
    }, [newFieldCrop]);

    const handleFieldCreated = (points: { lat: number, lon: number }[], area?: number) => {
        setNewFieldCoords(points);
        setNewFieldArea(area || 0);
        setIsCreating(true);
    };

    const saveField = async () => {
        if (!newFieldName) return;
        setIsSaving(true);
        try {
            await api.saveField({
                name: newFieldName,
                crop: newFieldCrop,
                coordinates: newFieldCoords,
                area: newFieldArea,
                plantingDate: newFieldDate,
                transplantDate: isTransplantedCrop ? newFieldTransplantDate : undefined,
                isTransplanted: isTransplantedCrop,
                variety: newFieldVariety,
                fertilizerHistory: newFieldFertilizer
            });
            setIsCreating(false);
            setNewFieldName("");
            setNewFieldDate("");
            setNewFieldTransplantDate("");
            setNewFieldVariety("");
            setNewFieldFertilizer("");

            const data = await api.getFields();
            setFields(data);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to save field");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFieldCardClick = (field: FieldData) => {
        // Toggle highlight — if already selected, deselect
        if (highlightedFieldId === field.id) {
            setHighlightedFieldId(null);
        } else {
            setHighlightedFieldId(field.id);
        }
    };

    // Health status config
    const healthConfig = {
        Excellent: { color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Healthy' },
        Good: { color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Fair' },
        Critical: { color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', label: 'Needs Attention' },
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">
            {/* Field Creation Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-brand-dark">New Field</h3>
                            <div className="flex items-center gap-2 bg-brand-lime/20 px-3 py-1.5 rounded-full">
                                <svg className="w-4 h-4 text-brand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                <span className="text-xs font-bold text-brand-dark">{newFieldArea} ha</span>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {/* Field Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Field Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime focus:outline-none"
                                    placeholder="e.g. North Ridge, Musasa Plot"
                                    value={newFieldName}
                                    onChange={e => setNewFieldName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* Crop Type — Searchable */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Crop Type</label>
                                <CropSearchSelect
                                    value={newFieldCrop}
                                    onChange={(val) => {
                                        setNewFieldCrop(val);
                                        setNewFieldVariety("");
                                    }}
                                />
                            </div>

                            {/* Date fields */}
                            {isTransplantedCrop ? (
                                <>
                                    <div className="bg-amber-50 p-3 rounded-xl">
                                        <p className="text-xs text-amber-700 font-bold flex items-center gap-1.5">
                                            <span className="text-base">🌱</span>
                                            {newFieldCrop} is transplanted. Track both dates for accurate GDD tracking.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                                                Nursery Seeding
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime focus:outline-none text-sm"
                                                value={newFieldDate}
                                                onChange={e => setNewFieldDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                                                Transplant Date
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime focus:outline-none text-sm"
                                                value={newFieldTransplantDate}
                                                onChange={e => setNewFieldTransplantDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Planting Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime focus:outline-none"
                                        value={newFieldDate}
                                        onChange={e => setNewFieldDate(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Variety */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Variety</label>
                                {availableVarieties.length > 0 ? (
                                    <select
                                        className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime focus:outline-none text-sm"
                                        value={newFieldVariety}
                                        onChange={e => setNewFieldVariety(e.target.value)}
                                    >
                                        <option value="">Select variety...</option>
                                        {availableVarieties.map(v => (
                                            <option key={v.variety_name} value={v.variety_name}>
                                                {v.variety_name} {v.breeder ? `(${v.breeder})` : ''}
                                            </option>
                                        ))}
                                        <option value="Other">Other (enter manually)</option>
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime focus:outline-none text-sm"
                                        placeholder="e.g. SC727, Mukushi"
                                        value={newFieldVariety}
                                        onChange={e => setNewFieldVariety(e.target.value)}
                                    />
                                )}
                            </div>

                            {/* Fertilizer History */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Fertilizer History <span className="text-slate-300 font-normal lowercase">(optional)</span></label>
                                <textarea
                                    className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime focus:outline-none text-sm"
                                    placeholder="e.g. Compound D at planting, AN top dressing week 4..."
                                    rows={2}
                                    value={newFieldFertilizer}
                                    onChange={e => setNewFieldFertilizer(e.target.value)}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-slate-400 hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveField}
                                    disabled={!newFieldName || isSaving}
                                    className="flex-1 py-3.5 bg-brand-lime text-brand-dark rounded-xl font-black shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    {isSaving ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            Saving...
                                        </span>
                                    ) : 'Save Field'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black text-brand-dark pl-4">My Fields</h2>
                    {fields.length > 0 && (
                        <span className="bg-brand-lime/30 text-brand-dark text-xs font-bold px-3 py-1 rounded-full">
                            {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                        </span>
                    )}
                </div>
                <button
                    id="add-field-btn"
                    className="bg-brand-dark text-brand-lime px-8 py-3 rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Field
                </button>
            </div>

            {/* Map — always visible */}
            <div id="fields-map-container" className="relative h-[500px] rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-white z-0">
                <MapComponent
                    fields={fields}
                    onSelectField={(field) => {
                        setHighlightedFieldId(field.id);
                        // Scroll the field card into view
                        const el = document.getElementById(`field-card-${field.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    onFieldCreated={handleFieldCreated}
                    highlightedFieldId={highlightedFieldId}
                />
            </div>

            {/* Fields List — always below map */}
            <div>
                {/* Section header */}
                {fields.length > 0 && (
                    <div className="flex items-center justify-between mb-4 px-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Click a field to locate on map
                        </p>
                        {highlightedFieldId && (
                            <button
                                onClick={() => setHighlightedFieldId(null)}
                                className="text-xs font-bold text-slate-400 hover:text-brand-dark transition-colors flex items-center gap-1"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Clear selection
                            </button>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-[2.5rem] p-8 animate-pulse">
                                <div className="h-6 bg-slate-100 rounded-xl w-2/3 mb-4"></div>
                                <div className="h-4 bg-slate-100 rounded-lg w-1/3 mb-8"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-12 bg-slate-100 rounded-xl"></div>
                                    <div className="h-12 bg-slate-100 rounded-xl"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : fields.length === 0 ? (
                    <div className="bg-white rounded-[3.5rem] p-16 text-center shadow-sm">
                        <div className="w-20 h-20 mx-auto mb-6 bg-brand-lime/20 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-brand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-brand-dark mb-2">No fields yet</h3>
                        <p className="text-slate-400 font-medium mb-6 max-w-sm mx-auto">
                            Draw a polygon on the map above to mark your first field. We&apos;ll track satellite data, weather, and crop health automatically.
                        </p>
                        <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-brand-lime rounded-full"></span>
                                Click the polygon tool
                            </span>
                            <span className="text-slate-200">|</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-brand-lime rounded-full"></span>
                                Trace your field
                            </span>
                            <span className="text-slate-200">|</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-brand-lime rounded-full"></span>
                                Add crop details
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fields.map(field => {
                            const isSelected = highlightedFieldId === field.id;
                            const health = healthConfig[field.healthStatus] || healthConfig.Good;

                            return (
                                <div
                                    id={`field-card-${field.id}`}
                                    key={field.id}
                                    onClick={() => handleFieldCardClick(field)}
                                    className={`bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all cursor-pointer group border-2 relative ${
                                        isSelected
                                            ? 'border-brand-lime shadow-lg ring-2 ring-brand-lime/20 scale-[1.01]'
                                            : 'border-transparent hover:border-slate-100'
                                    }`}
                                >
                                    {/* Delete Confirmation Overlay */}
                                    {showDeleteConfirm === field.id && (
                                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-[2.5rem] z-10 flex flex-col items-center justify-center p-6">
                                            <div className="text-center">
                                                <div className="w-14 h-14 mx-auto mb-3 bg-rose-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-7 h-7 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </div>
                                                <h4 className="text-lg font-black text-brand-dark mb-1">Delete Field?</h4>
                                                <p className="text-sm text-slate-500 mb-5">
                                                    This will permanently delete <strong>{field.name}</strong>.
                                                </p>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowDeleteConfirm(null);
                                                        }}
                                                        className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteField(field.id, field.name);
                                                        }}
                                                        disabled={deletingFieldId === field.id}
                                                        className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-black hover:bg-rose-600 transition-colors disabled:opacity-50"
                                                    >
                                                        {deletingFieldId === field.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Card Content */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {isSelected && (
                                                    <div className="w-2.5 h-2.5 bg-brand-lime rounded-full flex-shrink-0 animate-pulse"></div>
                                                )}
                                                <h3 className="text-xl font-black text-brand-dark tracking-tight truncate">{field.name}</h3>
                                            </div>
                                            <p className="text-slate-400 font-bold text-xs uppercase">{field.crop} &bull; {field.area.toFixed(1)} ha</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                            {/* Health badge */}
                                            <span className={`${health.bg} ${health.text} text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${health.color} animate-pulse`}></span>
                                                {health.label}
                                            </span>
                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteConfirm(field.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-rose-50 rounded-full"
                                                title="Delete field"
                                            >
                                                <svg className="w-4 h-4 text-rose-400 hover:text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Metrics Row */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">NDVI</p>
                                            <span className="text-xl font-black text-brand-dark">{field.ndvi.toFixed(2)}</span>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Moisture</p>
                                            <span className="text-xl font-black text-brand-dark">{field.soilMoisture}%</span>
                                        </div>
                                    </div>

                                    {/* Analyze Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const btn = e.currentTarget;
                                            btn.innerText = "Starting Analysis...";
                                            api.analyzeField(field.id).then(() => {
                                                router.push(`/fields/${field.id}`);
                                            });
                                        }}
                                        className="w-full py-3.5 bg-brand-beige text-brand-dark rounded-2xl font-black text-xs uppercase tracking-widest group-hover:bg-brand-lime transition-colors active:scale-95"
                                    >
                                        Analyze Insights
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FieldManagement;
