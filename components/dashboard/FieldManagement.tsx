"use client";

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/services/api';
import { isNetworkError } from '@/services/fieldCapture';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { useFieldState } from '@/hooks/useFieldState';
import { FieldData } from './types';
import CropSearchSelect from './CropSearchSelect';
import type { MapMode } from './MapComponent';
import { MAPBOX_ENABLED } from '@/lib/mapbox';

interface FieldManagementProps {
    onSelectField?: (field: FieldData) => void;
}

// Dynamically import MapComponent to avoid SSR issues with Leaflet
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Mapbox GL when a USABLE token is configured (richer basemaps + Satellite/
// Streets/Terrain toggle); the Leaflet implementation stays as the fallback so
// the field-mapping flow keeps working if the token is missing, revoked, or of
// the wrong kind — see lib/mapbox. Both expose the identical prop contract, so
// the choice can also be revised at runtime if Mapbox fails to start.
const mapLoading = () => (
    <div
        className="w-full h-full animate-pulse flex items-center justify-center"
        style={{ background: '#1a2e1a', color: 'var(--ee-muted)', fontFamily: 'var(--font-body)', fontWeight: 700 }}
    >
        Loading Satellite Map...
    </div>
);

const MapboxMap = dynamic(() => import('./MapComponentMapbox'), { ssr: false, loading: mapLoading });
const LeafletMap = dynamic(() => import('./MapComponent'), { ssr: false, loading: mapLoading });

const FieldManagement: React.FC<FieldManagementProps> = ({ onSelectField }) => {
    const router = useRouter();
    const { fields, loading, refreshFields } = useDashboardData();
    const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);
    // Mapbox can still fail to start with a well-formed token (no WebGL,
    // revoked key, blocked domain). Drop to Leaflet rather than leaving the
    // user with no map — this screen IS how fields get created.
    const [mapboxFailed, setMapboxFailed] = useState(false);
    const MapComponent = MAPBOX_ENABLED && !mapboxFailed ? MapboxMap : LeafletMap;

    // Panel state: open/closed on mobile, always visible on desktop
    const [panelOpen, setPanelOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const handleDeleteField = async (fieldId: string, fieldName: string) => {
        setDeletingFieldId(fieldId);
        try {
            await api.deleteField(fieldId);
            await refreshFields();
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
    // Edit mode: null = creating a new field, otherwise the id of the field
    // being edited. The creation modal is reused for both flows.
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    // Mapping a field and planting it are different events, often weeks apart.
    // Forcing a crop and planting date at capture time made farmers invent
    // both — and a wrong planting date silently corrupts every stage, GDD and
    // yield calculation downstream. An unplanted field is now a valid state,
    // and the natural next step from it is the season planner.
    const [notPlantedYet, setNotPlantedYet] = useState(false);

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

    const resetFieldForm = () => {
        setIsCreating(false);
        setEditingFieldId(null);
        setNotPlantedYet(false);
        setNewFieldName("");
        setNewFieldDate("");
        setNewFieldTransplantDate("");
        setNewFieldVariety("");
        setNewFieldFertilizer("");
    };

    // Open the (shared) modal pre-filled to edit an existing field.
    const openEditModal = (field: FieldData) => {
        setEditingFieldId(field.id);
        setNewFieldName(field.name || "");
        setNewFieldCrop((field.crop as string) || "Maize");
        setNewFieldDate((field.plantingDate || field.planting_date || "").slice(0, 10));
        setNewFieldTransplantDate("");
        setNewFieldVariety(field.variety || "");
        setNewFieldFertilizer(field.fertilizerHistory || "");
        setNewFieldCoords([]);
        setNewFieldArea(field.area || 0);
        setIsCreating(true);
    };

    const saveField = async () => {
        if (!newFieldName) return;
        setIsSaving(true);
        try {
            if (editingFieldId) {
                // EDIT: partial metadata update via PATCH /fields/{id}. Geometry
                // is not editable here (it belongs to the map draw flow).
                await api.updateField(editingFieldId, {
                    name: newFieldName,
                    crop: newFieldCrop,
                    variety: newFieldVariety,
                    plantingDate: newFieldDate || undefined,
                    transplantDate: isTransplantedCrop ? (newFieldTransplantDate || undefined) : undefined,
                    isTransplanted: isTransplantedCrop,
                    fertilizerHistory: newFieldFertilizer,
                });
                resetFieldForm();
                await refreshFields();
                return;
            }

            // An unplanted field carries no crop details at all. Leaving the
            // planting date empty is the important part: downstream stage, GDD
            // and yield maths all key off it, and a placeholder date is worse
            // than no date because it produces confident wrong answers.
            const payload = notPlantedYet
                ? {
                    name: newFieldName,
                    coordinates: newFieldCoords,
                    area: newFieldArea,
                }
                : {
                    name: newFieldName,
                    crop: newFieldCrop,
                    coordinates: newFieldCoords,
                    area: newFieldArea,
                    plantingDate: newFieldDate || undefined,
                    transplantDate: isTransplantedCrop ? (newFieldTransplantDate || undefined) : undefined,
                    isTransplanted: isTransplantedCrop,
                    variety: newFieldVariety,
                    fertilizerHistory: newFieldFertilizer
                };
            // Online create with LOUD errors. We previously routed failures into an
            // offline outbox, which silently swallowed real errors (and the
            // unreliable navigator.onLine sometimes diverted online saves) — so a
            // failed save looked like "nothing happened". Field creation now always
            // hits the server and surfaces exactly what went wrong.
            let created: { id?: string } | undefined;
            try {
                created = await api.saveField(payload);
            } catch (postErr: any) {
                // The backend can cold-start (free hosting spins down on idle), so
                // the first request after a quiet spell may fail/time out. Retry
                // once after a short wait before giving up.
                if (isNetworkError(postErr)) {
                    await new Promise((r) => setTimeout(r, 2500));
                    created = await api.saveField(payload);
                } else {
                    throw postErr;
                }
            }

            // Saved. Force a cache-bypassing refresh so the new field always shows
            // (a stale 'fields' cache entry must never hide it).
            const wasUnplanted = notPlantedYet;
            const newFieldId = created?.id;
            resetFieldForm();
            await refreshFields();

            // An unplanted field's whole point is the plan that follows, so go
            // straight there rather than dropping the farmer on an empty field.
            if (wasUnplanted && newFieldId) {
                router.push(`/fields/${newFieldId}/plan-season`);
                return;
            }
        } catch (e: any) {
            console.error("Save field failed:", e);
            const offline = isNetworkError(e);
            alert(
                offline
                    ? "Couldn't reach the server — it may be waking up, or you're offline. Please wait a moment and try saving again."
                    : (e?.message || "Could not save the field. Please try again."),
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleFieldCardClick = (field: FieldData) => {
        if (highlightedFieldId === field.id) {
            setHighlightedFieldId(null);
        } else {
            setHighlightedFieldId(field.id);
            // On mobile, close the panel so the user can see the map
            if (window.innerWidth < 1024) {
                setPanelOpen(false);
            }
        }
    };

    // Close panel when entering draw/GPS mode
    useEffect(() => {
        if (mapMode !== 'view') {
            setPanelOpen(false);
        }
    }, [mapMode]);

    return (
        <>
            {/* ───── FULL-SCREEN MAP CONTAINER ───── */}
            <div
                className="fixed inset-0 bottom-[80px] lg:bottom-0 lg:left-[288px] z-0"
            >
                <MapComponent
                    fields={fields}
                    onSelectField={(field) => {
                        setHighlightedFieldId(field.id);
                        setPanelOpen(true);
                        // Scroll to field card
                        setTimeout(() => {
                            const el = document.getElementById(`field-card-${field.id}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                    }}
                    onFieldCreated={handleFieldCreated}
                    highlightedFieldId={highlightedFieldId}
                    mode={mapMode}
                    onModeChange={setMapMode}
                    fullscreen
                    onInitError={() => setMapboxFailed(true)}
                />
            </div>

            {/* ───── FLOATING TOP BAR ───── */}
            <div
                className="fixed top-3 left-3 right-3 lg:left-[300px] z-[400] flex items-center gap-2 sm:gap-3"
                style={{ pointerEvents: 'none' }}
            >
                {/* My Fields pill */}
                <div
                    className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full backdrop-blur-xl"
                    style={{
                        background: 'rgba(45,58,38,0.85)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                        pointerEvents: 'auto',
                    }}
                >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>map</span>
                    <h2
                        className="text-sm sm:text-base font-black text-white truncate"
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        My Fields
                    </h2>
                    {fields.length > 0 && (
                        <span
                            className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                                background: 'rgba(215,242,108,0.25)',
                                color: '#D7F26C',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            {fields.length}
                        </span>
                    )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Add Field / Cancel button */}
                <button
                    onClick={() => setMapMode(mapMode === 'view' ? 'draw' : 'view')}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold flex items-center gap-1.5 sm:gap-2 hover:scale-105 transition-transform text-sm sm:text-base backdrop-blur-xl"
                    style={{
                        background: mapMode !== 'view' ? '#D7F26C' : 'rgba(45,58,38,0.85)',
                        color: mapMode !== 'view' ? '#2D3A26' : '#FFFFFF',
                        fontFamily: 'var(--font-heading)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                        pointerEvents: 'auto',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {mapMode !== 'view' ? 'close' : 'add'}
                    </span>
                    <span className="hidden sm:inline">{mapMode !== 'view' ? 'Cancel Mapping' : 'Add Field'}</span>
                    <span className="sm:hidden">{mapMode !== 'view' ? 'Cancel' : 'Add'}</span>
                </button>

                {/* Toggle field list panel (mobile) */}
                {fields.length > 0 && mapMode === 'view' && (
                    <button
                        onClick={() => setPanelOpen(!panelOpen)}
                        className="lg:hidden px-3 py-2.5 sm:py-3 rounded-full backdrop-blur-xl flex items-center gap-1.5"
                        style={{
                            background: panelOpen ? '#D7F26C' : 'rgba(45,58,38,0.85)',
                            color: panelOpen ? '#2D3A26' : '#FFFFFF',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                            pointerEvents: 'auto',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            {panelOpen ? 'close' : 'list'}
                        </span>
                    </button>
                )}
            </div>

            {/* ───── FIELD LIST PANEL ───── */}
            {/* Desktop: right side panel, always visible when fields exist */}
            {/* Mobile: bottom sheet drawer */}
            {fields.length > 0 && mapMode === 'view' && (
                <>
                    {/* DESKTOP SIDE PANEL */}
                    <div
                        className="hidden lg:flex fixed top-[72px] right-4 bottom-4 w-[320px] xl:w-[360px] z-[400] flex-col rounded-2xl overflow-hidden"
                        style={{
                            background: 'rgba(45,58,38,0.88)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                        }}
                    >
                        {/* Panel header */}
                        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <p
                                className="text-xs font-bold uppercase tracking-wider"
                                style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}
                            >
                                Tap a field to locate on map
                            </p>
                            {highlightedFieldId && (
                                <button
                                    onClick={() => setHighlightedFieldId(null)}
                                    className="text-xs font-bold flex items-center gap-1 transition-colors"
                                    style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#D7F26C')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Scrollable field list */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
                            {loading ? (
                                <>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <div className="h-5 rounded-lg w-2/3 mb-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
                                            <div className="h-3 rounded-lg w-1/3" style={{ background: 'rgba(255,255,255,0.05)' }} />
                                        </div>
                                    ))}
                                </>
                            ) : (
                                fields.map(field => (
                                    <FieldCard
                                        key={field.id}
                                        field={field}
                                        isSelected={highlightedFieldId === field.id}
                                        showDeleteConfirm={showDeleteConfirm}
                                        deletingFieldId={deletingFieldId}
                                        onCardClick={handleFieldCardClick}
                                        onEditClick={openEditModal}
                                        onDeleteClick={setShowDeleteConfirm}
                                        onDeleteConfirm={handleDeleteField}
                                        onDeleteCancel={() => setShowDeleteConfirm(null)}
                                        onAnalyze={(field) => {
                                            api.analyzeField(field.id).then(() => router.push(`/fields/${field.id}`));
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* MOBILE BOTTOM SHEET */}
                    <div
                        ref={panelRef}
                        className={`lg:hidden fixed left-0 right-0 bottom-[80px] z-[400] transition-transform duration-300 ease-out`}
                        style={{
                            transform: panelOpen ? 'translateY(0)' : 'translateY(100%)',
                            maxHeight: '60vh',
                        }}
                    >
                        <div
                            className="rounded-t-2xl overflow-hidden flex flex-col"
                            style={{
                                background: 'rgba(45,58,38,0.92)',
                                backdropFilter: 'blur(20px)',
                                boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
                                maxHeight: '60vh',
                            }}
                        >
                            {/* Drag handle */}
                            <div
                                className="flex justify-center py-3 cursor-pointer"
                                onClick={() => setPanelOpen(!panelOpen)}
                            >
                                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
                            </div>

                            {/* Panel header */}
                            <div className="px-4 pb-3 flex items-center justify-between">
                                <p
                                    className="text-xs font-bold uppercase tracking-wider"
                                    style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}
                                >
                                    {fields.length} field{fields.length !== 1 ? 's' : ''} mapped
                                </p>
                                {highlightedFieldId && (
                                    <button
                                        onClick={() => setHighlightedFieldId(null)}
                                        className="text-xs font-bold flex items-center gap-1"
                                        style={{ color: '#D7F26C', fontFamily: 'var(--font-body)' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Scrollable field list */}
                            <div className="overflow-y-auto px-3 pb-6 space-y-2.5" style={{ maxHeight: 'calc(60vh - 80px)' }}>
                                {loading ? (
                                    <>
                                        {[1, 2].map(i => (
                                            <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                <div className="h-5 rounded-lg w-2/3 mb-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
                                                <div className="h-3 rounded-lg w-1/3" style={{ background: 'rgba(255,255,255,0.05)' }} />
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    fields.map(field => (
                                        <FieldCard
                                            key={field.id}
                                            field={field}
                                            isSelected={highlightedFieldId === field.id}
                                            showDeleteConfirm={showDeleteConfirm}
                                            deletingFieldId={deletingFieldId}
                                            onCardClick={handleFieldCardClick}
                                        onEditClick={openEditModal}
                                            onDeleteClick={setShowDeleteConfirm}
                                            onDeleteConfirm={handleDeleteField}
                                            onDeleteCancel={() => setShowDeleteConfirm(null)}
                                            onAnalyze={(field) => {
                                                api.analyzeField(field.id).then(() => router.push(`/fields/${field.id}`));
                                            }}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ───── EMPTY STATE (no fields) ───── */}
            {!loading && fields.length === 0 && mapMode === 'view' && (
                <div
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] w-[90vw] max-w-sm text-center p-8 rounded-2xl backdrop-blur-xl"
                    style={{
                        background: 'rgba(45,58,38,0.88)',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                    }}
                >
                    <div
                        className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(215,242,108,0.2)' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#D7F26C' }}>map</span>
                    </div>
                    <h3
                        className="text-xl font-black mb-2 text-white"
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        No fields yet
                    </h3>
                    <p
                        className="font-medium mb-5 text-sm"
                        style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)' }}
                    >
                        Tap &ldquo;Add Field&rdquo; to map your first field. Draw on the satellite map or walk your boundary with GPS.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: '#D7F26C' }} />
                            Tap Add Field
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: '#D7F26C' }} />
                            Draw or Walk GPS
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: '#D7F26C' }} />
                            Add crop details
                        </span>
                    </div>
                </div>
            )}

            {/* ───── FIELD CREATION MODAL ───── */}
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
                                {editingFieldId ? 'Edit Field' : 'New Field'}
                            </h3>
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                                style={{ background: 'color-mix(in srgb, var(--ee-primary) 15%, transparent)' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--ee-text)' }}>{editingFieldId ? 'edit' : 'crop_free'}</span>
                                <span
                                    className="text-xs font-bold"
                                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                >
                                    {(newFieldArea || 0).toFixed(1)} ha
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

                            {/* Not-planted-yet escape hatch. Only offered when
                                creating — editing an existing field's crop is a
                                different intent. */}
                            {!editingFieldId && (
                                <label
                                    className="flex items-start gap-3 rounded-[16px] p-3.5 cursor-pointer"
                                    style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={notPlantedYet}
                                        onChange={e => setNotPlantedYet(e.target.checked)}
                                        className="w-5 h-5 mt-0.5 shrink-0"
                                    />
                                    <span>
                                        <span
                                            className="text-sm font-bold block"
                                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                        >
                                            I haven&apos;t planted here yet
                                        </span>
                                        <span
                                            className="text-xs block mt-0.5 leading-relaxed"
                                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                        >
                                            Save the boundary now and plan the crop, spacing and
                                            fertiliser next — that&apos;s where the decisions that
                                            matter still get made.
                                        </span>
                                    </span>
                                </label>
                            )}

                            {!notPlantedYet && (
                            <>
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
                                        {/* Preserve an existing (e.g. custom) variety when editing a
                                            field whose variety isn't in the catalogue. */}
                                        {newFieldVariety && !availableVarieties.some(v => v.variety_name === newFieldVariety) && newFieldVariety !== 'Other' && (
                                            <option value={newFieldVariety}>{newFieldVariety}</option>
                                        )}
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
                            </>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={resetFieldForm}
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
                                        color: 'var(--ee-on-primary)',
                                        fontFamily: 'var(--font-heading)',
                                        boxShadow: 'var(--shadow-neu)',
                                    }}
                                >
                                    {isSaving ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            Saving...
                                        </span>
                                    ) : (editingFieldId ? 'Save Changes' : 'Save Field')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

/* ───── FIELD CARD COMPONENT ───── */
interface FieldCardProps {
    field: FieldData;
    isSelected: boolean;
    showDeleteConfirm: string | null;
    deletingFieldId: string | null;
    onCardClick: (field: FieldData) => void;
    onEditClick: (field: FieldData) => void;
    onDeleteClick: (id: string) => void;
    onDeleteConfirm: (id: string, name: string) => void;
    onDeleteCancel: () => void;
    onAnalyze: (field: FieldData) => void;
}

const FieldCard: React.FC<FieldCardProps> = ({
    field,
    isSelected,
    showDeleteConfirm,
    deletingFieldId,
    onCardClick,
    onEditClick,
    onDeleteClick,
    onDeleteConfirm,
    onDeleteCancel,
    onAnalyze,
}) => {
    // Health, NDVI and moisture come from the aggregator (single source of truth);
    // no legacy field.healthStatus / field.ndvi threshold mapping.
    const { fieldState: fs } = useFieldState(field.id);
    const ks = fs?.kurima_score;
    const health = ks ? { color: ks.color, label: ks.label } : { color: 'rgba(255,255,255,0.35)', label: '…' };
    const ndviText = fs?.indices?.current?.ndvi != null ? fs.indices.current.ndvi.toFixed(2) : '—';
    const moistureText = fs?.water_balance?.soil_moisture_pct != null ? `${Math.round(fs.water_balance.soil_moisture_pct)}%` : '—';

    return (
        <div
            id={`field-card-${field.id}`}
            onClick={() => onCardClick(field)}
            className="relative rounded-xl p-4 transition-all cursor-pointer group"
            style={{
                background: isSelected ? 'rgba(215,242,108,0.15)' : 'rgba(255,255,255,0.06)',
                border: isSelected ? '1px solid rgba(215,242,108,0.4)' : '1px solid rgba(255,255,255,0.06)',
            }}
        >
            {/* Delete Confirmation */}
            {showDeleteConfirm === field.id && (
                <div
                    className="absolute inset-0 rounded-xl z-10 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
                    style={{ background: 'rgba(45,58,38,0.95)' }}
                >
                    <p className="text-sm font-bold text-white mb-3 text-center" style={{ fontFamily: 'var(--font-body)' }}>
                        Delete <strong>{field.name}</strong>?
                    </p>
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteCancel(); }}
                            className="flex-1 py-2 rounded-lg text-sm font-bold"
                            style={{ color: 'rgba(255,255,255,0.6)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteConfirm(field.id, field.name); }}
                            disabled={deletingFieldId === field.id}
                            className="flex-1 py-2 rounded-lg text-sm font-black disabled:opacity-50"
                            style={{ background: '#E05C5C', color: '#fff' }}
                        >
                            {deletingFieldId === field.id ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            )}

            {/* Card content */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        {isSelected && (
                            <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#D7F26C' }} />
                        )}
                        <h3
                            className="text-sm font-black text-white truncate"
                            style={{ fontFamily: 'var(--font-heading)' }}
                        >
                            {field.name}
                        </h3>
                    </div>
                    <p
                        className="text-[10px] font-bold uppercase"
                        style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}
                    >
                        {/* A field with no planting date has nothing growing in
                            it, so naming a crop would be a claim rather than a
                            fact — say "not planted" instead. */}
                        {(field.plantingDate || field.planting_date)
                            ? <>{field.crop} &bull; {field.area.toFixed(1)} ha</>
                            : <>Not planted &bull; {field.area.toFixed(1)} ha</>}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{
                            background: `color-mix(in srgb, ${health.color} 20%, transparent)`,
                            color: health.color,
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: health.color }} />
                        {health.label}
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEditClick(field); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full"
                        title="Edit field"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'rgba(255,255,255,0.55)' }}>edit</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(field.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full"
                        title="Delete field"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#E05C5C' }}>delete</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="flex gap-3 mb-3">
                <div className="flex-1 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <p className="text-[9px] font-bold uppercase mb-0.5" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-body)' }}>NDVI</p>
                    <span className="text-base font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{ndviText}</span>
                </div>
                <div className="flex-1 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <p className="text-[9px] font-bold uppercase mb-0.5" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-body)' }}>Moisture</p>
                    <span className="text-base font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{moistureText}</span>
                </div>
            </div>

            {/* Analyze button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    const btn = e.currentTarget;
                    btn.innerText = "Starting...";
                    onAnalyze(field);
                }}
                className="w-full py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: 'var(--font-heading)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#D7F26C', e.currentTarget.style.color = '#2D3A26')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)', e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            >
                Analyze Insights
            </button>
        </div>
    );
};

export default FieldManagement;
