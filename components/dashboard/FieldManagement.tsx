"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { FieldData } from './types';

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
    const [viewMode, setViewMode] = useState<'MAP' | 'LIST'>('MAP');
    const [fields, setFields] = useState<FieldData[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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
            // Remove from local state
            setFields(prev => prev.filter(f => f.id !== fieldId));
            setShowDeleteConfirm(null);
        } catch (e: any) {
            alert(e.message || "Failed to delete field");
        } finally {
            setDeletingFieldId(null);
        }
    };

    const [isCreating, setIsCreating] = useState(false);
    const [newFieldCoords, setNewFieldCoords] = useState<{ lat: number, lon: number }[]>([]);
    const [newFieldArea, setNewFieldArea] = useState(0);
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldCrop, setNewFieldCrop] = useState("Maize");
    const [newFieldDate, setNewFieldDate] = useState("");  // Planting/seeding date
    const [newFieldTransplantDate, setNewFieldTransplantDate] = useState("");  // Transplant date for vegetables
    const [newFieldVariety, setNewFieldVariety] = useState("");
    const [newFieldFertilizer, setNewFieldFertilizer] = useState("");
    const [availableVarieties, setAvailableVarieties] = useState<any[]>([]);

    // Crops that are typically transplanted (not direct-seeded)
    const TRANSPLANTED_CROPS = ['Tomato', 'Cabbage', 'Onion', 'Potato', 'Pepper', 'Eggplant', 'Lettuce', 'Paprika', 'Green Pepper', 'Strawberries', 'Tea', 'Blueberries'];
    const isTransplantedCrop = TRANSPLANTED_CROPS.includes(newFieldCrop);

    useEffect(() => {
        if (newFieldCrop) {
            api.getCropVarieties(newFieldCrop).then(data => {
                setAvailableVarieties(data || []);
            });
            // Reset transplant date when switching away from transplanted crops
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

            // Refresh fields
            const data = await api.getFields();
            setFields(data);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to save field");
        }
    };

    if (loading && viewMode === 'LIST') {
        return <div className="p-10 text-center text-slate-400">Loading Fields...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">
            {/* Field Creation Modal */}
            {isCreating && (
                <div className="absolute inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-[3.5rem]">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-96 animate-in zoom-in-95">
                        <h3 className="text-2xl font-black text-brand-dark mb-6">New Field Details</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Field Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime"
                                    placeholder="e.g. North Ridge"
                                    value={newFieldName}
                                    onChange={e => setNewFieldName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Crop Type</label>
                                <select
                                    className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime"
                                    value={newFieldCrop}
                                    onChange={e => {
                                        setNewFieldCrop(e.target.value);
                                        setNewFieldVariety(""); // Reset variety on crop change
                                    }}
                                >
                                    {/* Cereals & Grains */}
                                    <optgroup label="Cereals & Grains">
                                        <option value="Maize">Maize</option>
                                        <option value="Wheat">Wheat</option>
                                        <option value="Sorghum">Sorghum</option>
                                        <option value="Finger Millet">Finger Millet (Rapoko)</option>
                                        <option value="Pearl Millet">Pearl Millet (Mhunga)</option>
                                    </optgroup>

                                    {/* Cash Crops */}
                                    <optgroup label="Cash Crops">
                                        <option value="Tobacco">Tobacco</option>
                                        <option value="Cotton">Cotton</option>
                                        <option value="Sunflower">Sunflower</option>
                                        <option value="Paprika">Paprika / Chillies</option>
                                        <option value="Sesame">Sesame</option>
                                        <option value="Tea">Tea</option>
                                    </optgroup>

                                    {/* Legumes & Oilseeds */}
                                    <optgroup label="Legumes & Oilseeds">
                                        <option value="Soybeans">Soybeans</option>
                                        <option value="Groundnuts">Groundnuts</option>
                                        <option value="Sugar Beans">Sugar Beans</option>
                                        <option value="Cowpeas">Cowpeas (Nyemba)</option>
                                        <option value="Bambara Nuts">Bambara Nuts (Nyimo)</option>
                                        <option value="Peas">Peas</option>
                                        <option value="Green Beans">Green Beans</option>
                                    </optgroup>

                                    {/* Vegetables & Root Crops */}
                                    <optgroup label="Vegetables & Root Crops">
                                        <option value="Potato">Potato</option>
                                        <option value="Sweet Potato">Sweet Potato</option>
                                        <option value="Cassava">Cassava</option>
                                        <option value="Tomato">Tomato</option>
                                        <option value="Onion">Onion</option>
                                        <option value="Cabbage">Cabbage</option>
                                        <option value="Butternut">Butternut / Pumpkin</option>
                                        <option value="Green Pepper">Green Pepper</option>
                                        <option value="Garlic">Garlic</option>
                                    </optgroup>

                                    {/* Export Horticulture & Fruits */}
                                    <optgroup label="Export Horticulture & Fruits">
                                        <option value="Snow Peas">Snow Peas / Mange Tout</option>
                                        <option value="Blueberries">Blueberries</option>
                                        <option value="Strawberries">Strawberries</option>
                                    </optgroup>
                                </select>
                            </div>

                            {/* Date fields - show different fields based on crop type */}
                            {isTransplantedCrop ? (
                                <>
                                    {/* Transplanted crops: Show both nursery seeding and transplant dates */}
                                    <div className="bg-amber-50 p-3 rounded-xl mb-4">
                                        <p className="text-xs text-amber-700 font-bold">
                                            🌱 {newFieldCrop} is a transplanted crop. Track both nursery seeding and field transplant dates for accurate growth tracking.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                                Nursery Seeding Date
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime"
                                                value={newFieldDate}
                                                onChange={e => setNewFieldDate(e.target.value)}
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">When seeds were sown in nursery</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                                Transplant Date
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime"
                                                value={newFieldTransplantDate}
                                                onChange={e => setNewFieldTransplantDate(e.target.value)}
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">When seedlings moved to field</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Planting Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime"
                                        value={newFieldDate}
                                        onChange={e => setNewFieldDate(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Variety</label>
                                    {availableVarieties.length > 0 ? (
                                        <select
                                            className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime"
                                            value={newFieldVariety}
                                            onChange={e => setNewFieldVariety(e.target.value)}
                                        >
                                            <option value="">Select Variety</option>
                                            {availableVarieties.map(v => (
                                                <option key={v.variety_name} value={v.variety_name}>
                                                    {v.variety_name} {v.breeder ? `(${v.breeder})` : ''}
                                                </option>
                                            ))}
                                            <option value="Other">Other (Enter Manually)</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime"
                                            placeholder="e.g. SC727"
                                            value={newFieldVariety}
                                            onChange={e => setNewFieldVariety(e.target.value)}
                                        />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fertilizer History</label>
                                <textarea
                                    className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-brand-dark focus:ring-2 focus:ring-brand-lime text-sm"
                                    placeholder="e.g. Compound D at planting, AN top dressing week 4..."
                                    rows={2}
                                    value={newFieldFertilizer}
                                    onChange={e => setNewFieldFertilizer(e.target.value)}
                                />
                            </div>

                            <div className="pt-2">
                                <p className="text-xs text-slate-400 font-bold">Detected Area: <span className="text-brand-dark ml-1">{newFieldArea} ha</span></p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveField}
                                    className="flex-1 py-3 bg-brand-lime text-brand-dark rounded-xl font-black shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                                >
                                    Save Field
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center bg-white p-4 rounded-[2.5rem] shadow-sm">
                <div id="field-view-mode-toggle" className="flex bg-slate-100 p-1.5 rounded-full">
                    <button
                        onClick={() => setViewMode('MAP')}
                        className={`px-8 py-2 rounded-full text-xs font-bold uppercase transition-all ${viewMode === 'MAP' ? 'bg-brand-lime text-brand-dark shadow-sm' : 'text-slate-500'}`}
                    >
                        Map View
                    </button>
                    <button
                        onClick={() => setViewMode('LIST')}
                        className={`px-8 py-2 rounded-full text-xs font-bold uppercase transition-all ${viewMode === 'LIST' ? 'bg-brand-lime text-brand-dark shadow-sm' : 'text-slate-500'}`}
                    >
                        List View
                    </button>
                </div>
                <button
                    id="add-field-btn"
                    onClick={() => setViewMode('MAP')} // Force map view to draw
                    className="bg-brand-dark text-brand-lime px-8 py-3 rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform"
                >
                    + Add Field
                </button>
            </div>

            {viewMode === 'MAP' ? (
                <div id="fields-map-container" className="relative h-[600px] rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-white z-0">
                    <MapComponent
                        fields={fields}
                        onSelectField={onSelectField}
                        onFieldCreated={handleFieldCreated}
                    />


                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {fields.map(field => (
                        <div
                            key={field.id}
                            onClick={() => onSelectField?.(field)}
                            className="bg-white p-10 rounded-[3.5rem] shadow-xl hover:shadow-2xl transition-all cursor-pointer group border border-slate-50 relative"
                        >
                            {/* Delete Confirmation Overlay */}
                            {showDeleteConfirm === field.id && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-[3.5rem] z-10 flex flex-col items-center justify-center p-6">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-rose-100 rounded-full flex items-center justify-center">
                                            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </div>
                                        <h4 className="text-xl font-black text-brand-dark mb-2">Delete Field?</h4>
                                        <p className="text-sm text-slate-500 mb-6">This will permanently delete <strong>{field.name}</strong> and all its data.</p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteConfirm(null);
                                                }}
                                                className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteField(field.id, field.name);
                                                }}
                                                disabled={deletingFieldId === field.id}
                                                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black hover:bg-rose-600 transition-colors disabled:opacity-50"
                                            >
                                                {deletingFieldId === field.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <h3 className="text-3xl font-black text-brand-dark tracking-tight">{field.name}</h3>
                                    <p className="text-slate-400 font-bold text-sm uppercase mt-1">{field.crop} • {field.area.toFixed(1)} ha</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${field.healthStatus === 'Excellent' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowDeleteConfirm(field.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-rose-50 rounded-full"
                                        title="Delete field"
                                    >
                                        <svg className="w-5 h-5 text-rose-400 hover:text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-10">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Vegetation</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-black text-brand-dark">{field.ndvi.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Moisture</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-black text-brand-dark">{field.soilMoisture}%</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent card click
                                    const btn = e.currentTarget;
                                    btn.innerText = "Starting Analysis...";

                                    api.analyzeField(field.id).then(() => {
                                        // Navigate immediately, let page handle loading
                                        router.push(`/fields/${field.id}`);
                                    });
                                }}
                                className="w-full py-4 bg-brand-beige text-brand-dark rounded-2xl font-black text-sm uppercase tracking-widest group-hover:bg-brand-lime transition-colors active:scale-95"
                            >
                                Analyze Insights
                            </button>
                        </div>
                    ))}
                    {fields.length === 0 && (
                        <div className="col-span-3 text-center py-20 text-slate-400">
                            No fields found. Start by adding one!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FieldManagement;
