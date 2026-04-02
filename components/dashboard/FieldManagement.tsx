"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { FieldData } from './types';
import CropSearchSelect from './CropSearchSelect';
import type { MapMode } from './MapComponent';

interface FieldManagementProps {
    onSelectField?: (field: FieldData) => void;
}

// Dynamically import MapComponent to avoid SSR issues with Leaflet
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const MapComponent = dynamic(() => import('./MapComponent'), {
    ssr: false,
    loading: () => (
        <div
            className="w-full h-full animate-pulse rounded-[24px] flex items-center justify-center"
            style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)', fontFamily: 'var(--font-body)', fontWeight: 700 }}
        >
            Loading Satellite Map...
        </div>
    )
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

    // Map mode state
    const [mapMode, setMapMode] = useState<MapMode>('view');

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
    const TRANSPLANTED_CROPS = ['Tomato', 'Cabbage', 'Onion', 'Potato', 'Paprika', 'Green Pepper', 'Strawberries', 'Tea', 'Blueberries', 'Coffee', 'Tobacco', 'Covo', 'Rape', 'Mustard'];
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
        setMapMode('view');
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
        Excellent: { color: 'var(--ee-primary)', label: 'Healthy' },
        Good: { color: 'var(--ee-sun)', label: 'Fair' },
        Critical: { color: '#E05C5C', label: 'Needs Attention' },
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">
            {/* Field Creation Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" style={{ background: 'rgba(45,58,48,0.4)', backdropFilter: 'blur(8px)' }}>
                    <div
                        className="neu-surface w-full max-w-md animate-in zoom-in-95 max-h-[90vh] overflow-y-auto p-8 rounded-[24px]"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3
                                className="text-2xl font-black"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                            >
                                New Field
                            </h3>
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                                style={{ background: 'color-mix(in srgb, var(--ee-primary) 15%, transparent)' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--ee-text)' }}>crop_free</span>
                                <span
                                    className="text-xs font-bold"
                                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                >
                                    {newFieldArea} ha
                                </span>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {/* Field Name */}
                            <div>
                                <label
                                    className="block text-xs font-bold uppercase mb-1.5"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    Field Name
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
                                    placeholder="e.g. North Ridge, Musasa Plot"
                                    value={newFieldName}
                                    onChange={e => setNewFieldName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* Crop Type — Searchable */}
                            <div>
                                <label
                                    className="block text-xs font-bold uppercase mb-1.5"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    Crop Type
                                </label>
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
                                    <div className="p-3 rounded-[16px]" style={{ background: 'color-mix(in srgb, var(--ee-sun) 15%, transparent)' }}>
                                        <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--ee-sun)', fontFamily: 'var(--font-body)' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>eco</span>
                                            {newFieldCrop} is transplanted. Track both dates for accurate GDD tracking.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label
                                                className="block text-xs font-bold uppercase mb-1.5"
                                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                            >
                                                Nursery Seeding
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                                                style={{
                                                    background: 'var(--ee-bg)',
                                                    color: 'var(--ee-text)',
                                                    fontFamily: 'var(--font-body)',
                                                    boxShadow: 'var(--shadow-neu-inset)',
                                                    border: 'none',
                                                }}
                                                value={newFieldDate}
                                                onChange={e => setNewFieldDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label
                                                className="block text-xs font-bold uppercase mb-1.5"
                                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                            >
                                                Transplant Date
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                                                style={{
                                                    background: 'var(--ee-bg)',
                                                    color: 'var(--ee-text)',
                                                    fontFamily: 'var(--font-body)',
                                                    boxShadow: 'var(--shadow-neu-inset)',
                                                    border: 'none',
                                                }}
                                                value={newFieldTransplantDate}
                                                onChange={e => setNewFieldTransplantDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label
                                        className="block text-xs font-bold uppercase mb-1.5"
                                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                    >
                                        Planting Date
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full rounded-[16px] p-3 font-bold focus:outline-none"
                                        style={{
                                            background: 'var(--ee-bg)',
                                            color: 'var(--ee-text)',
                                            fontFamily: 'var(--font-body)',
                                            boxShadow: 'var(--shadow-neu-inset)',
                                            border: 'none',
                                        }}
                                        value={newFieldDate}
                                        onChange={e => setNewFieldDate(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Variety */}
                            <div>
                                <label
                                    className="block text-xs font-bold uppercase mb-1.5"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    Variety
                                </label>
                                {availableVarieties.length > 0 ? (
                                    <select
                                        className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                                        style={{
                                            background: 'var(--ee-bg)',
                                            color: 'var(--ee-text)',
                                            fontFamily: 'var(--font-body)',
                                            boxShadow: 'var(--shadow-neu-inset)',
                                            border: 'none',
                                        }}
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
                                        className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                                        style={{
                                            background: 'var(--ee-bg)',
                                            color: 'var(--ee-text)',
                                            fontFamily: 'var(--font-body)',
                                            boxShadow: 'var(--shadow-neu-inset)',
                                            border: 'none',
                                        }}
                                        placeholder="e.g. SC727, Mukushi"
                                        value={newFieldVariety}
                                        onChange={e => setNewFieldVariety(e.target.value)}
                                    />
                                )}
                            </div>

                            {/* Fertilizer History */}
                            <div>
                                <label
                                    className="block text-xs font-bold uppercase mb-1.5"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    Fertilizer History <span style={{ color: 'var(--ee-muted)', fontWeight: 400, textTransform: 'lowercase' }}>(optional)</span>
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
                                    className="flex-1 py-3.5 rounded-[16px] font-bold transition-colors"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ee-bg)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveField}
                                    disabled={!newFieldName || isSaving}
                                    className="flex-1 py-3.5 rounded-[16px] font-black transition-all disabled:opacity-50"
                                    style={{
                                        background: 'var(--ee-primary)',
                                        color: '#FFFFFF',
                                        fontFamily: 'var(--font-heading)',
                                        boxShadow: 'var(--shadow-neu)',
                                    }}
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
            <div className="neu-surface flex justify-between items-center p-4 rounded-[24px]">
                <div className="flex items-center gap-3">
                    <h2
                        className="text-lg font-black pl-4"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        My Fields
                    </h2>
                    {fields.length > 0 && (
                        <span
                            className="text-xs font-bold px-3 py-1 rounded-full"
                            style={{
                                background: 'color-mix(in srgb, var(--ee-primary) 15%, transparent)',
                                color: 'var(--ee-text)',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                        </span>
                    )}
                </div>
                <button
                    id="add-field-btn"
                    onClick={() => setMapMode(mapMode === 'view' ? 'draw' : 'view')}
                    className="px-8 py-3 rounded-[16px] font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                    style={{
                        background: mapMode !== 'view' ? 'var(--ee-primary)' : 'var(--ee-text)',
                        color: '#FFFFFF',
                        fontFamily: 'var(--font-heading)',
                        boxShadow: 'var(--shadow-neu)',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {mapMode !== 'view' ? 'close' : 'add'}
                    </span>
                    {mapMode !== 'view' ? 'Cancel Mapping' : 'Add Field'}
                </button>
            </div>

            {/* Map — always visible */}
            <div
                id="fields-map-container"
                className="relative h-[500px] rounded-[24px] overflow-hidden z-0"
                style={{ boxShadow: 'var(--shadow-ambient)' }}
            >
                <MapComponent
                    fields={fields}
                    onSelectField={(field) => {
                        setHighlightedFieldId(field.id);
                        const el = document.getElementById(`field-card-${field.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    onFieldCreated={handleFieldCreated}
                    highlightedFieldId={highlightedFieldId}
                    mode={mapMode}
                    onModeChange={setMapMode}
                />
            </div>

            {/* Fields List — always below map */}
            <div>
                {/* Section header */}
                {fields.length > 0 && (
                    <div className="flex items-center justify-between mb-4 px-2">
                        <p
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            Click a field to locate on map
                        </p>
                        {highlightedFieldId && (
                            <button
                                onClick={() => setHighlightedFieldId(null)}
                                className="text-xs font-bold transition-colors flex items-center gap-1"
                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ee-text)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ee-muted)')}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                Clear selection
                            </button>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="neu-surface rounded-[24px] p-8 animate-pulse">
                                <div className="h-6 rounded-[16px] w-2/3 mb-4" style={{ background: 'var(--ee-bg)' }}></div>
                                <div className="h-4 rounded-[12px] w-1/3 mb-8" style={{ background: 'var(--ee-bg)' }}></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-12 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}></div>
                                    <div className="h-12 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : fields.length === 0 ? (
                    <div className="neu-surface rounded-[24px] p-16 text-center">
                        <div
                            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                            style={{ background: 'color-mix(in srgb, var(--ee-primary) 15%, transparent)' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--ee-text)' }}>map</span>
                        </div>
                        <h3
                            className="text-2xl font-black mb-2"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            No fields yet
                        </h3>
                        <p
                            className="font-medium mb-6 max-w-sm mx-auto"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            Tap &ldquo;Add Field&rdquo; to map your first field. Draw on the satellite map or walk your boundary with GPS.
                        </p>
                        <div className="flex items-center justify-center gap-3 text-xs" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ee-primary)' }}></span>
                                Tap Add Field
                            </span>
                            <span style={{ color: 'var(--ee-bg)' }}>|</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ee-primary)' }}></span>
                                Draw or Walk GPS
                            </span>
                            <span style={{ color: 'var(--ee-bg)' }}>|</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ee-primary)' }}></span>
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
                                    className={`neu-surface p-8 rounded-[24px] transition-all cursor-pointer group relative`}
                                    style={{
                                        boxShadow: isSelected ? 'var(--shadow-neu), 0 0 0 3px var(--ee-primary)' : 'var(--shadow-neu)',
                                        transform: isSelected ? 'scale(1.01)' : undefined,
                                    }}
                                >
                                    {/* Delete Confirmation Overlay */}
                                    {showDeleteConfirm === field.id && (
                                        <div
                                            className="absolute inset-0 rounded-[24px] z-10 flex flex-col items-center justify-center p-6"
                                            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)' }}
                                        >
                                            <div className="text-center">
                                                <div
                                                    className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center"
                                                    style={{ background: 'color-mix(in srgb, #E05C5C 15%, transparent)' }}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#E05C5C' }}>delete</span>
                                                </div>
                                                <h4
                                                    className="text-lg font-black mb-1"
                                                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                                >
                                                    Delete Field?
                                                </h4>
                                                <p
                                                    className="text-sm mb-5"
                                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                                >
                                                    This will permanently delete <strong>{field.name}</strong>.
                                                </p>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowDeleteConfirm(null);
                                                        }}
                                                        className="flex-1 py-2.5 rounded-[16px] font-bold transition-colors"
                                                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--ee-bg)')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteField(field.id, field.name);
                                                        }}
                                                        disabled={deletingFieldId === field.id}
                                                        className="flex-1 py-2.5 rounded-[16px] font-black transition-colors disabled:opacity-50"
                                                        style={{
                                                            background: '#E05C5C',
                                                            color: '#FFFFFF',
                                                            fontFamily: 'var(--font-heading)',
                                                        }}
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
                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: 'var(--ee-primary)' }}></div>
                                                )}
                                                <h3
                                                    className="text-xl font-black tracking-tight truncate"
                                                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                                >
                                                    {field.name}
                                                </h3>
                                            </div>
                                            <p
                                                className="font-bold text-xs uppercase"
                                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                            >
                                                {field.crop} &bull; {field.area.toFixed(1)} ha
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                            {/* Health badge */}
                                            <span
                                                className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                                                style={{
                                                    background: `color-mix(in srgb, ${health.color} 15%, transparent)`,
                                                    color: health.color,
                                                    fontFamily: 'var(--font-body)',
                                                }}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: health.color }}></span>
                                                {health.label}
                                            </span>
                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteConfirm(field.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full"
                                                title="Delete field"
                                                onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, #E05C5C 10%, transparent)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#E05C5C' }}>delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Metrics Row */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="rounded-[16px] p-3" style={{ background: 'var(--ee-bg)' }}>
                                            <p
                                                className="text-[10px] font-bold uppercase mb-1"
                                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                            >
                                                NDVI
                                            </p>
                                            <span
                                                className="text-xl font-black"
                                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                            >
                                                {field.ndvi.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="rounded-[16px] p-3" style={{ background: 'var(--ee-bg)' }}>
                                            <p
                                                className="text-[10px] font-bold uppercase mb-1"
                                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                            >
                                                Moisture
                                            </p>
                                            <span
                                                className="text-xl font-black"
                                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                            >
                                                {field.soilMoisture}%
                                            </span>
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
                                        className="w-full py-3.5 rounded-[16px] font-black text-xs uppercase tracking-widest transition-colors active:scale-95"
                                        style={{
                                            background: 'var(--ee-bg)',
                                            color: 'var(--ee-text)',
                                            fontFamily: 'var(--font-heading)',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--ee-primary)', e.currentTarget.style.color = '#FFFFFF')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--ee-bg)', e.currentTarget.style.color = 'var(--ee-text)')}
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
