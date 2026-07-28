"use client";

/**
 * Field-management map — Mapbox GL implementation.
 *
 * Drop-in replacement for the Leaflet `MapComponent` (identical props), used
 * when NEXT_PUBLIC_MAPBOX_TOKEN is configured. Preserves every capability of
 * the Leaflet original:
 *   • view mode — field polygons + markers, highlight, click-to-select, fly-to
 *   • draw mode — tap-to-place corners with live area/perimeter, undo, clear
 *   • gps-walk  — walk the boundary, jitter-filtered recording, pause/resume
 * The drawing was never leaflet-draw (it is custom tap-to-place), so the port
 * is a faithful re-render of the same state machine on a different map engine
 * rather than a swap of drawing libraries.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { calculatePolygonArea, calculatePolygonPerimeter, distanceBetween } from '@/lib/geo';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export type MapMode = 'view' | 'draw' | 'gps-walk';

/** Minimal shape this map needs from a field. Structural + optional, so any
 * richer field object from the app satisfies it (the Leaflet original used
 * `any[]`; a new file shouldn't inherit that). */
export interface MapField {
    id: string;
    name?: string;
    crop?: string;
    area?: number;
    healthStatus?: string;
    location?: { lat: number; lon: number };
    coordinates?: { lat: number; lon?: number; lng?: number }[];
}

interface MapComponentProps {
    fields: MapField[];
    onSelectField?: (field: MapField) => void;
    onFieldCreated?: (points: { lat: number; lon: number }[], area?: number) => void;
    highlightedFieldId?: string | null;
    mode?: MapMode;
    onModeChange?: (mode: MapMode) => void;
    fullscreen?: boolean;
}

type Pt = { lat: number; lon: number };

const STYLES = [
    { id: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
    { id: 'streets', label: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
    { id: 'terrain', label: 'Terrain', url: 'mapbox://styles/mapbox/outdoors-v12' },
];

const DEFAULT_CENTER: [number, number] = [31.05, -17.82]; // [lon, lat]
const MIN_GPS_DISTANCE = 3; // metres — matches the Leaflet original's jitter filter

// {lat,lon} open ring → GeoJSON [lon,lat] closed ring.
function closedRing(pts: Pt[]): number[][] {
    const r = pts.map((p) => [p.lon, p.lat]);
    if (r.length && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push(r[0]);
    return r;
}

const emptyFC = {
    type: 'FeatureCollection' as const,
    features: [] as GeoJSON.Feature[],
};

// ─── Shared HUD (identical copy/《stats》to the Leaflet version) ───────────────
function DrawHud({
    points, onUndo, onClear, onFinish, onCancel,
}: {
    points: Pt[];
    onUndo: () => void; onClear: () => void; onFinish: () => void; onCancel: () => void;
}) {
    const area = points.length >= 3 ? calculatePolygonArea(points) : 0;
    const perimeter = points.length >= 2 ? calculatePolygonPerimeter(points) : 0;
    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto">
            <div className="bg-black/70 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3 shadow-2xl flex flex-col items-center gap-2 min-w-[280px]">
                <p className="text-white/80 text-xs font-medium text-center">
                    {points.length === 0
                        ? 'Tap on the map to place your first corner'
                        : points.length < 3
                            ? `Tap to add more corners (${3 - points.length} more needed)`
                            : 'Keep adding corners or tap Finish'}
                </p>
                {points.length >= 2 && (
                    <div className="flex gap-4 text-center">
                        <div>
                            <p className="text-[10px] text-white/50 uppercase font-bold">Area</p>
                            <p className="text-lg font-black text-brand-lime">{area} ha</p>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div>
                            <p className="text-[10px] text-white/50 uppercase font-bold">Perimeter</p>
                            <p className="text-lg font-black text-white">
                                {perimeter >= 1000 ? `${(perimeter / 1000).toFixed(1)} km` : `${perimeter} m`}
                            </p>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div>
                            <p className="text-[10px] text-white/50 uppercase font-bold">Points</p>
                            <p className="text-lg font-black text-white">{points.length}</p>
                        </div>
                    </div>
                )}
                <div className="flex gap-2 w-full">
                    <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all">
                        Cancel
                    </button>
                    {points.length > 0 && (
                        <button onClick={onUndo} className="flex-1 py-2 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-400/10 transition-all">
                            Undo
                        </button>
                    )}
                    {points.length > 0 && (
                        <button onClick={onClear} className="flex-1 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-400/10 transition-all">
                            Clear
                        </button>
                    )}
                    {points.length >= 3 && (
                        <button onClick={onFinish} className="flex-[1.5] py-2 rounded-xl text-xs font-black bg-brand-lime text-brand-dark hover:brightness-110 transition-all">
                            Finish ({area} ha)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ModeSelector({ onSelectDraw, onSelectGPS, onCancel }: {
    onSelectDraw: () => void; onSelectGPS: () => void; onCancel: () => void;
}) {
    return (
        <div className="absolute inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
            <div className="bg-[#0F1A14] border border-white/15 rounded-3xl p-6 w-[min(92%,380px)] shadow-2xl">
                <h3 className="text-white font-black text-lg mb-1">Map your field</h3>
                <p className="text-white/60 text-xs mb-5">Choose how you want to capture the boundary.</p>
                <button onClick={onSelectDraw} className="w-full mb-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all">
                    <p className="text-brand-lime font-bold text-sm">Draw on map</p>
                    <p className="text-white/50 text-xs mt-0.5">Tap each corner on the satellite view.</p>
                </button>
                <button onClick={onSelectGPS} className="w-full mb-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all">
                    <p className="text-brand-lime font-bold text-sm">Walk the boundary (GPS)</p>
                    <p className="text-white/50 text-xs mt-0.5">Record your position as you walk the edge.</p>
                </button>
                <button onClick={onCancel} className="w-full py-2 text-white/60 hover:text-white text-xs font-bold transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
}

const MapComponentMapbox: React.FC<MapComponentProps> = ({
    fields, onSelectField, onFieldCreated, highlightedFieldId,
    mode = 'view', onModeChange, fullscreen = false,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [ready, setReady] = useState(false);
    const [styleId, setStyleId] = useState('satellite');
    const [internalMode, setInternalMode] = useState<'view' | 'choosing' | 'draw' | 'gps-walk'>('view');

    // Draw / GPS shared point state
    const [points, setPoints] = useState<Pt[]>([]);
    const pointsRef = useRef<Pt[]>([]);
    const [gpsStatus, setGpsStatus] = useState<'waiting' | 'acquiring' | 'recording' | 'paused'>('waiting');
    const [accuracy, setAccuracy] = useState(0);
    const watchIdRef = useRef<number | null>(null);

    // Callbacks live in refs so the map's native listeners always see fresh
    // handlers without being torn down and re-bound on every render.
    const modeRef = useRef(internalMode);
    modeRef.current = internalMode;
    const selectRef = useRef(onSelectField);
    selectRef.current = onSelectField;

    // Sync external mode prop (same contract as the Leaflet version).
    useEffect(() => {
        if (mode === 'draw' || mode === 'gps-walk') setInternalMode('choosing');
        else setInternalMode('view');
    }, [mode]);

    // ── init ──
    useEffect(() => {
        if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return;
        mapboxgl.accessToken = MAPBOX_TOKEN;
        const firstLoc = fields.find((f) => f.location)?.location;
        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: STYLES[0].url,
            center: firstLoc ? [firstLoc.lon, firstLoc.lat] : DEFAULT_CENTER,
            zoom: 15,
            attributionControl: false,
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
        map.addControl(new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
        }), 'bottom-right');
        map.on('load', () => setReady(true));
        mapRef.current = map;
        return () => { map.remove(); mapRef.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── (re)build layers; also re-runs after a style switch wipes them ──
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready) return;

        const draw = () => {
            // Saved fields
            const fieldFeatures = fields
                .filter((f) => f.coordinates && f.coordinates.length >= 3)
                .map((f) => ({
                    type: 'Feature' as const,
                    geometry: {
                        type: 'Polygon' as const,
                        coordinates: [closedRing((f.coordinates ?? []).map((c) => ({ lat: c.lat, lon: c.lon ?? c.lng ?? 0 })))],
                    },
                    properties: {
                        id: f.id, name: f.name, crop: f.crop ?? '',
                        highlighted: f.id === highlightedFieldId,
                    },
                }));
            const fieldData = { type: 'FeatureCollection' as const, features: fieldFeatures };

            const src = map.getSource('fm-fields') as mapboxgl.GeoJSONSource | undefined;
            if (src) src.setData(fieldData);
            else {
                map.addSource('fm-fields', { type: 'geojson', data: fieldData });
                map.addLayer({
                    id: 'fm-fields-fill', type: 'fill', source: 'fm-fields',
                    paint: {
                        'fill-color': ['case', ['get', 'highlighted'], '#D7F26C', '#ffffff'],
                        'fill-opacity': ['case', ['get', 'highlighted'], 0.18, 0.06],
                    },
                });
                map.addLayer({
                    id: 'fm-fields-line', type: 'line', source: 'fm-fields',
                    paint: {
                        'line-color': ['case', ['get', 'highlighted'], '#D7F26C', '#ffffff'],
                        'line-width': ['case', ['get', 'highlighted'], 3, 1.5],
                    },
                });
                map.addLayer({
                    id: 'fm-fields-label', type: 'symbol', source: 'fm-fields',
                    layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 0.6] },
                    paint: { 'text-color': '#ffffff', 'text-halo-color': '#0F1A14', 'text-halo-width': 1.4 },
                });
            }

            // In-progress boundary (draw + gps share this)
            const wip = pointsRef.current;
            const wipData = wip.length
                ? {
                    type: 'FeatureCollection' as const,
                    features: [
                        ...(wip.length >= 3 ? [{
                            type: 'Feature' as const,
                            geometry: { type: 'Polygon' as const, coordinates: [closedRing(wip)] },
                            properties: {},
                        }] : []),
                        ...(wip.length >= 2 ? [{
                            type: 'Feature' as const,
                            geometry: { type: 'LineString' as const, coordinates: wip.map((p) => [p.lon, p.lat]) },
                            properties: {},
                        }] : []),
                        ...wip.map((p, i) => ({
                            type: 'Feature' as const,
                            geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
                            properties: { first: i === 0 },
                        })),
                    ],
                }
                : emptyFC;

            const wsrc = map.getSource('fm-wip') as mapboxgl.GeoJSONSource | undefined;
            if (wsrc) wsrc.setData(wipData);
            else {
                map.addSource('fm-wip', { type: 'geojson', data: wipData });
                map.addLayer({
                    id: 'fm-wip-fill', type: 'fill', source: 'fm-wip',
                    filter: ['==', ['geometry-type'], 'Polygon'],
                    paint: { 'fill-color': '#D7F26C', 'fill-opacity': 0.15 },
                });
                map.addLayer({
                    id: 'fm-wip-line', type: 'line', source: 'fm-wip',
                    filter: ['==', ['geometry-type'], 'LineString'],
                    paint: { 'line-color': '#D7F26C', 'line-width': 3, 'line-dasharray': [2, 1] },
                });
                map.addLayer({
                    id: 'fm-wip-vertex', type: 'circle', source: 'fm-wip',
                    filter: ['==', ['geometry-type'], 'Point'],
                    paint: {
                        'circle-radius': ['case', ['get', 'first'], 7, 5],
                        'circle-color': ['case', ['get', 'first'], '#D7F26C', '#ffffff'],
                        'circle-stroke-color': ['case', ['get', 'first'], '#2D3A26', '#D7F26C'],
                        'circle-stroke-width': 2,
                    },
                });
            }
        };

        if (map.isStyleLoaded()) draw();
        else map.once('styledata', draw);
    }, [ready, fields, highlightedFieldId, points, styleId]);

    // ── field click → select (bound once; reads mode/handler via refs) ──
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready) return;
        const onClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
            if (modeRef.current !== 'view') return; // don't select while drawing
            const id = e.features?.[0]?.properties?.id;
            const field = fields.find((f) => f.id === id);
            if (field) selectRef.current?.(field);
        };
        map.on('click', 'fm-fields-fill', onClick);
        return () => { map.off('click', 'fm-fields-fill', onClick); };
    }, [ready, fields]);

    // ── draw mode: tap to place a corner ──
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready || internalMode !== 'draw') return;
        const onMapClick = (e: mapboxgl.MapMouseEvent) => {
            const next = [...pointsRef.current, { lat: e.lngLat.lat, lon: e.lngLat.lng }];
            pointsRef.current = next;
            setPoints(next);
        };
        map.on('click', onMapClick);
        map.getCanvas().style.cursor = 'crosshair';
        return () => {
            map.off('click', onMapClick);
            map.getCanvas().style.cursor = '';
        };
    }, [ready, internalMode]);

    // ── fly to the highlighted field ──
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready || !highlightedFieldId) return;
        const f = fields.find((x) => x.id === highlightedFieldId);
        if (f?.location) map.flyTo({ center: [f.location.lon, f.location.lat], zoom: 17, duration: 1200 });
    }, [ready, highlightedFieldId, fields]);

    // ── GPS walk ──
    const stopWatch = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, []);

    const beginWatch = useCallback(() => {
        if (!navigator.geolocation) {
            alert('GPS is not available on this device.');
            return;
        }
        setGpsStatus('acquiring');
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                setAccuracy(pos.coords.accuracy);
                setGpsStatus('recording');
                const last = pointsRef.current[pointsRef.current.length - 1];
                if (!last || distanceBetween(last, p) >= MIN_GPS_DISTANCE) {
                    pointsRef.current = [...pointsRef.current, p];
                    setPoints(pointsRef.current);
                }
                mapRef.current?.panTo([p.lon, p.lat]);
            },
            (err) => {
                console.error('GPS error:', err);
                alert(err.code === 1
                    ? 'GPS permission denied. Please enable location access.'
                    : 'GPS error: ' + err.message);
                setGpsStatus('waiting');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
    }, []);

    useEffect(() => () => stopWatch(), [stopWatch]);

    const resetPoints = () => { pointsRef.current = []; setPoints([]); };

    const finish = () => {
        const pts = pointsRef.current;
        if (pts.length < 3) return;
        const area = calculatePolygonArea(pts);
        stopWatch();
        setGpsStatus('waiting');
        resetPoints();
        setInternalMode('view');
        onModeChange?.('view');
        onFieldCreated?.(pts, area);
    };

    const cancel = () => {
        stopWatch();
        setGpsStatus('waiting');
        resetPoints();
        setInternalMode('view');
        onModeChange?.('view');
    };

    const switchStyle = (s: typeof STYLES[number]) => {
        setStyleId(s.id);
        mapRef.current?.setStyle(s.url); // styledata re-adds our layers
    };

    return (
        <div className="h-full w-full relative">
            <div
                ref={containerRef}
                style={{ height: '100%', width: '100%', borderRadius: fullscreen ? 0 : '3.5rem', overflow: 'hidden' }}
            />

            {/* Basemap / style toggle */}
            <div className="absolute bottom-8 left-8 z-[400]">
                <div className="p-1 flex gap-1 bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-2xl">
                    {STYLES.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => switchStyle(s)}
                            className={`h-9 px-3 text-xs font-bold rounded-lg transition-all ${styleId === s.id ? 'bg-brand-lime text-brand-dark' : 'text-white hover:bg-white/10'}`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {internalMode === 'choosing' && (
                <ModeSelector
                    onSelectDraw={() => { resetPoints(); setInternalMode('draw'); }}
                    onSelectGPS={() => { resetPoints(); setInternalMode('gps-walk'); beginWatch(); }}
                    onCancel={cancel}
                />
            )}

            {internalMode === 'draw' && (
                <DrawHud
                    points={points}
                    onUndo={() => { pointsRef.current = pointsRef.current.slice(0, -1); setPoints(pointsRef.current); }}
                    onClear={resetPoints}
                    onFinish={finish}
                    onCancel={cancel}
                />
            )}

            {internalMode === 'gps-walk' && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto">
                    <div className="bg-black/70 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3 shadow-2xl flex flex-col items-center gap-2 min-w-[300px]">
                        <p className="text-white/80 text-xs font-medium text-center">
                            {gpsStatus === 'acquiring' && 'Acquiring GPS…'}
                            {gpsStatus === 'recording' && `Walking the boundary — ${points.length} points (±${Math.round(accuracy)}m)`}
                            {gpsStatus === 'paused' && 'Paused — resume when you continue walking'}
                            {gpsStatus === 'waiting' && 'Start walking to record the boundary'}
                        </p>
                        {points.length >= 3 && (
                            <p className="text-lg font-black text-brand-lime">{calculatePolygonArea(points)} ha</p>
                        )}
                        <div className="flex gap-2 w-full">
                            <button onClick={cancel} className="flex-1 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all">
                                Cancel
                            </button>
                            {gpsStatus === 'recording' ? (
                                <button onClick={() => { stopWatch(); setGpsStatus('paused'); }} className="flex-1 py-2 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-400/10 transition-all">
                                    Pause
                                </button>
                            ) : (
                                <button onClick={beginWatch} className="flex-1 py-2 rounded-xl text-xs font-bold text-brand-lime hover:bg-white/10 transition-all">
                                    {gpsStatus === 'paused' ? 'Resume' : 'Start'}
                                </button>
                            )}
                            {points.length > 0 && (
                                <button onClick={() => { pointsRef.current = pointsRef.current.slice(0, -1); setPoints(pointsRef.current); }} className="flex-1 py-2 rounded-xl text-xs font-bold text-white/70 hover:bg-white/10 transition-all">
                                    Undo
                                </button>
                            )}
                            {points.length >= 3 && (
                                <button onClick={finish} className="flex-[1.5] py-2 rounded-xl text-xs font-black bg-brand-lime text-brand-dark hover:brightness-110 transition-all">
                                    Finish
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-[300] ${fullscreen ? '' : 'rounded-[3.5rem]'}`} />
        </div>
    );
};

export default MapComponentMapbox;
