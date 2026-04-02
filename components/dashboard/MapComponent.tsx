"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, FeatureGroup, Circle, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import { calculatePolygonArea, calculatePolygonPerimeter, distanceBetween } from '@/lib/geo';

// Fix for default marker icons in Next.js/Webpack
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const customIcon = new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to recenter map when fields change
const MapRecenter = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
}

export type MapMode = 'view' | 'draw' | 'gps-walk';

interface MapComponentProps {
    fields: any[];
    onSelectField?: (field: any) => void;
    onFieldCreated?: (points: { lat: number, lon: number }[], area?: number) => void;
    highlightedFieldId?: string | null;
    mode?: MapMode;
    onModeChange?: (mode: MapMode) => void;
}

// ─── Location marker (blue dot) ───────────────────────────────────────────────
const LocationMarker = () => {
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const [accuracy, setAccuracy] = useState<number>(0);
    const map = useMap();

    useEffect(() => {
        map.on('locationfound', (e) => {
            setPosition(e.latlng);
            setAccuracy(e.accuracy);
            map.flyTo(e.latlng, 18);
        });

        map.on('locationerror', (e) => {
            console.error('Location error:', e.message);
            alert("Could not get your precise location. Please ensure GPS is enabled and you've granted permission.");
        });
    }, [map]);

    return position === null ? null : (
        <>
            <Circle
                center={position}
                radius={accuracy}
                pathOptions={{
                    fillColor: '#3B82F6',
                    fillOpacity: 0.1,
                    color: '#3B82F6',
                    weight: 1,
                    dashArray: '5, 5'
                }}
            />
            <Marker position={position} icon={L.divIcon({
                className: 'user-location-marker',
                html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })}>
                <Popup>You are here (within {Math.round(accuracy)}m)</Popup>
            </Marker>
        </>
    );
};

// ─── Custom zoom & locate controls ────────────────────────────────────────────
const CustomControls = () => {
    const map = useMap();

    const handleZoomIn = () => map.zoomIn();
    const handleZoomOut = () => map.zoomOut();

    const handleLocateMe = () => {
        map.locate({
            setView: true,
            maxZoom: 18,
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    };

    return (
        <div className="absolute bottom-8 right-8 z-[400] flex flex-col gap-2">
            <div className="p-1 flex flex-col gap-1 bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-2xl">
                <button
                    onClick={handleLocateMe}
                    className="h-10 w-10 flex items-center justify-center text-white hover:text-brand-lime hover:bg-white/10 rounded-lg transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></svg>
                </button>
            </div>

            <div className="p-1 flex flex-col gap-1 bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-2xl">
                <button
                    onClick={handleZoomIn}
                    className="h-10 w-10 flex items-center justify-center text-white hover:text-brand-lime hover:bg-white/10 rounded-lg transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                </button>
                <div className="h-px w-full bg-white/10" />
                <button
                    onClick={handleZoomOut}
                    className="h-10 w-10 flex items-center justify-center text-white hover:text-brand-lime hover:bg-white/10 rounded-lg transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
                </button>
            </div>
        </div>
    );
};

// ─── Fly to a highlighted field ───────────────────────────────────────────────
const FlyToField = ({ fields, highlightedFieldId }: { fields: any[], highlightedFieldId?: string | null }) => {
    const map = useMap();
    useEffect(() => {
        if (!highlightedFieldId) return;
        const field = fields.find((f: any) => f.id === highlightedFieldId);
        if (field?.location) {
            map.flyTo([field.location.lat, field.location.lon], 17, { duration: 1.2 });
        }
    }, [highlightedFieldId, fields, map]);
    return null;
};

// ─── Manual Draw Mode (tap-to-place with undo & live area) ───────────────────
const ManualDrawMode = ({
    onComplete,
    onCancel,
}: {
    onComplete: (points: { lat: number; lon: number }[], area: number) => void;
    onCancel: () => void;
}) => {
    const [points, setPoints] = useState<{ lat: number; lon: number }[]>([]);
    const map = useMap();

    // Tap on map to add a point
    useMapEvents({
        click(e) {
            setPoints(prev => [...prev, { lat: e.latlng.lat, lon: e.latlng.lng }]);
        }
    });

    const area = points.length >= 3 ? calculatePolygonArea(points) : 0;
    const perimeter = points.length >= 2 ? calculatePolygonPerimeter(points) : 0;

    const handleUndo = () => {
        setPoints(prev => prev.slice(0, -1));
    };

    const handleFinish = () => {
        if (points.length < 3) return;
        onComplete(points, area);
    };

    const handleClear = () => {
        setPoints([]);
    };

    // Convert points to Leaflet positions
    const positions: [number, number][] = points.map(p => [p.lat, p.lon]);

    return (
        <>
            {/* Draw the polygon-in-progress */}
            {positions.length >= 2 && (
                <Polyline
                    positions={positions}
                    pathOptions={{ color: '#D7F26C', weight: 3, dashArray: '8, 4' }}
                />
            )}
            {positions.length >= 3 && (
                <Polygon
                    positions={positions}
                    pathOptions={{
                        color: '#D7F26C',
                        fillColor: '#D7F26C',
                        fillOpacity: 0.15,
                        weight: 2,
                    }}
                />
            )}

            {/* Vertex markers */}
            {positions.map((pos, i) => (
                <Marker
                    key={`draw-vertex-${i}`}
                    position={pos}
                    icon={L.divIcon({
                        className: 'draw-vertex',
                        html: `<div style="width:${i === 0 ? 14 : 10}px;height:${i === 0 ? 14 : 10}px;background:${i === 0 ? '#D7F26C' : '#fff'};border:2px solid ${i === 0 ? '#2D3A26' : '#D7F26C'};border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,0.4);"></div>`,
                        iconSize: [i === 0 ? 14 : 10, i === 0 ? 14 : 10],
                        iconAnchor: [i === 0 ? 7 : 5, i === 0 ? 7 : 5],
                    })}
                />
            ))}

            {/* HUD overlay — live stats & controls */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto">
                <div className="bg-black/70 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3 shadow-2xl flex flex-col items-center gap-2 min-w-[280px]">
                    {/* Instructions */}
                    <p className="text-white/80 text-xs font-medium text-center">
                        {points.length === 0
                            ? 'Tap on the map to place your first corner'
                            : points.length < 3
                                ? `Tap to add more corners (${3 - points.length} more needed)`
                                : 'Keep adding corners or tap Finish'}
                    </p>

                    {/* Live stats */}
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

                    {/* Action buttons */}
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all"
                        >
                            Cancel
                        </button>
                        {points.length > 0 && (
                            <button
                                onClick={handleUndo}
                                className="flex-1 py-2 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-400/10 transition-all flex items-center justify-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                                Undo
                            </button>
                        )}
                        {points.length > 0 && (
                            <button
                                onClick={handleClear}
                                className="flex-1 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-400/10 transition-all"
                            >
                                Clear
                            </button>
                        )}
                        {points.length >= 3 && (
                            <button
                                onClick={handleFinish}
                                className="flex-[1.5] py-2 rounded-xl text-xs font-black bg-brand-lime text-brand-dark hover:brightness-110 transition-all"
                            >
                                Finish ({area} ha)
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

// ─── GPS Walk Mode ────────────────────────────────────────────────────────────
const GPSWalkMode = ({
    onComplete,
    onCancel,
}: {
    onComplete: (points: { lat: number; lon: number }[], area: number) => void;
    onCancel: () => void;
}) => {
    const [points, setPoints] = useState<{ lat: number; lon: number }[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [accuracy, setAccuracy] = useState<number>(0);
    const [currentPos, setCurrentPos] = useState<{ lat: number; lon: number } | null>(null);
    const [pointCount, setPointCount] = useState(0);
    const [status, setStatus] = useState<'waiting' | 'acquiring' | 'recording' | 'paused' | 'done'>('waiting');
    const watchIdRef = useRef<number | null>(null);
    const pointsRef = useRef<{ lat: number; lon: number }[]>([]);
    const map = useMap();

    // Minimum distance (meters) between recorded points to filter GPS jitter
    const MIN_DISTANCE = 3;

    const startRecording = useCallback(() => {
        if (!navigator.geolocation) {
            alert('GPS is not available on this device.');
            return;
        }

        setStatus('acquiring');
        setIsRecording(true);
        setIsPaused(false);
        pointsRef.current = [];
        setPoints([]);
        setPointCount(0);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const newPoint = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                setAccuracy(pos.coords.accuracy);
                setCurrentPos(newPoint);
                setStatus('recording');

                // Only add point if it's far enough from the last one
                const lastPoint = pointsRef.current[pointsRef.current.length - 1];
                if (!lastPoint || distanceBetween(lastPoint, newPoint) >= MIN_DISTANCE) {
                    pointsRef.current = [...pointsRef.current, newPoint];
                    setPoints(pointsRef.current);
                    setPointCount(pointsRef.current.length);
                }

                // Follow the user
                map.panTo([newPoint.lat, newPoint.lon]);
            },
            (err) => {
                console.error('GPS error:', err);
                if (err.code === 1) {
                    alert('GPS permission denied. Please enable location access.');
                } else {
                    alert('GPS error: ' + err.message);
                }
                setStatus('waiting');
                setIsRecording(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    }, [map]);

    const pauseRecording = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsPaused(true);
        setStatus('paused');
    };

    const resumeRecording = () => {
        setIsPaused(false);
        setStatus('acquiring');

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const newPoint = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                setAccuracy(pos.coords.accuracy);
                setCurrentPos(newPoint);
                setStatus('recording');

                const lastPoint = pointsRef.current[pointsRef.current.length - 1];
                if (!lastPoint || distanceBetween(lastPoint, newPoint) >= MIN_DISTANCE) {
                    pointsRef.current = [...pointsRef.current, newPoint];
                    setPoints(pointsRef.current);
                    setPointCount(pointsRef.current.length);
                }

                map.panTo([newPoint.lat, newPoint.lon]);
            },
            (err) => {
                console.error('GPS error on resume:', err);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    };

    const addManualPoint = () => {
        if (currentPos) {
            pointsRef.current = [...pointsRef.current, currentPos];
            setPoints(pointsRef.current);
            setPointCount(pointsRef.current.length);
        }
    };

    const undoLastPoint = () => {
        pointsRef.current = pointsRef.current.slice(0, -1);
        setPoints(pointsRef.current);
        setPointCount(pointsRef.current.length);
    };

    const finishRecording = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsRecording(false);
        setStatus('done');

        if (pointsRef.current.length >= 3) {
            const area = calculatePolygonArea(pointsRef.current);
            onComplete(pointsRef.current, area);
        }
    };

    const handleCancel = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsRecording(false);
        onCancel();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    const area = points.length >= 3 ? calculatePolygonArea(points) : 0;
    const perimeter = points.length >= 2 ? calculatePolygonPerimeter(points) : 0;
    const positions: [number, number][] = points.map(p => [p.lat, p.lon]);

    // Accuracy quality indicator
    const accuracyQuality = accuracy <= 5 ? 'excellent' : accuracy <= 10 ? 'good' : accuracy <= 20 ? 'fair' : 'poor';
    const accuracyColor = accuracy <= 5 ? '#22C55E' : accuracy <= 10 ? '#D7F26C' : accuracy <= 20 ? '#F59E0B' : '#EF4444';

    return (
        <>
            {/* GPS trail line */}
            {positions.length >= 2 && (
                <Polyline
                    positions={positions}
                    pathOptions={{ color: '#D7F26C', weight: 3, opacity: 0.8 }}
                />
            )}

            {/* Filled polygon preview */}
            {positions.length >= 3 && (
                <Polygon
                    positions={positions}
                    pathOptions={{
                        color: '#D7F26C',
                        fillColor: '#D7F26C',
                        fillOpacity: 0.12,
                        weight: 2,
                    }}
                />
            )}

            {/* GPS points as dots */}
            {positions.map((pos, i) => (
                <Marker
                    key={`gps-pt-${i}`}
                    position={pos}
                    icon={L.divIcon({
                        className: 'gps-point',
                        html: `<div style="width:6px;height:6px;background:#D7F26C;border:1px solid #2D3A26;border-radius:50%;"></div>`,
                        iconSize: [6, 6],
                        iconAnchor: [3, 3],
                    })}
                />
            ))}

            {/* Current position marker with accuracy ring */}
            {currentPos && isRecording && (
                <>
                    <Circle
                        center={[currentPos.lat, currentPos.lon]}
                        radius={accuracy}
                        pathOptions={{
                            fillColor: accuracyColor,
                            fillOpacity: 0.08,
                            color: accuracyColor,
                            weight: 1,
                            dashArray: '4, 4'
                        }}
                    />
                    <Marker
                        position={[currentPos.lat, currentPos.lon]}
                        icon={L.divIcon({
                            className: 'gps-current',
                            html: `<div style="width:18px;height:18px;background:${accuracyColor};border:3px solid white;border-radius:50%;box-shadow:0 0 12px ${accuracyColor}80;"></div>`,
                            iconSize: [18, 18],
                            iconAnchor: [9, 9],
                        })}
                    />
                </>
            )}

            {/* HUD overlay */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto">
                <div className="bg-black/70 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3 shadow-2xl flex flex-col items-center gap-2.5 min-w-[300px]">

                    {/* Status indicator */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div
                                className={`w-3 h-3 rounded-full ${isRecording && !isPaused ? 'animate-pulse' : ''}`}
                                style={{ background: status === 'recording' ? '#EF4444' : status === 'paused' ? '#F59E0B' : '#666' }}
                            />
                            {isRecording && !isPaused && (
                                <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-50"
                                     style={{ background: '#EF4444' }} />
                            )}
                        </div>
                        <p className="text-white text-sm font-bold">
                            {status === 'waiting' && 'GPS Walk Mode'}
                            {status === 'acquiring' && 'Acquiring GPS signal...'}
                            {status === 'recording' && 'Recording — walk your field boundary'}
                            {status === 'paused' && 'Paused'}
                            {status === 'done' && 'Complete'}
                        </p>
                    </div>

                    {/* GPS accuracy bar */}
                    {isRecording && (
                        <div className="w-full">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-white/50 uppercase font-bold">GPS Accuracy</span>
                                <span className="text-[10px] font-bold" style={{ color: accuracyColor }}>
                                    {accuracyQuality} ({Math.round(accuracy)}m)
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        background: accuracyColor,
                                        width: `${Math.max(5, Math.min(100, ((30 - accuracy) / 30) * 100))}%`
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Live stats */}
                    {pointCount >= 2 && (
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
                                <p className="text-lg font-black text-white">{pointCount}</p>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 w-full">
                        {!isRecording && status === 'waiting' && (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={startRecording}
                                    className="flex-[2] py-2.5 rounded-xl text-sm font-black bg-brand-lime text-brand-dark hover:brightness-110 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    Start Walking
                                </button>
                            </>
                        )}

                        {isRecording && !isPaused && (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="py-2.5 px-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-400/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addManualPoint}
                                    className="py-2.5 px-3 rounded-xl text-xs font-bold text-white border border-white/20 hover:bg-white/10 transition-all flex items-center gap-1"
                                    title="Drop a pin at current location"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                    Pin
                                </button>
                                {pointCount > 0 && (
                                    <button
                                        onClick={undoLastPoint}
                                        className="py-2.5 px-3 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-400/10 transition-all"
                                    >
                                        Undo
                                    </button>
                                )}
                                <button
                                    onClick={pauseRecording}
                                    className="py-2.5 px-3 rounded-xl text-xs font-bold text-white border border-white/20 hover:bg-white/10 transition-all"
                                >
                                    Pause
                                </button>
                                {pointCount >= 3 && (
                                    <button
                                        onClick={finishRecording}
                                        className="flex-1 py-2.5 rounded-xl text-xs font-black bg-brand-lime text-brand-dark hover:brightness-110 transition-all"
                                    >
                                        Finish
                                    </button>
                                )}
                            </>
                        )}

                        {isRecording && isPaused && (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="py-2.5 px-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-400/10 transition-all"
                                >
                                    Cancel
                                </button>
                                {pointCount > 0 && (
                                    <button
                                        onClick={undoLastPoint}
                                        className="py-2.5 px-3 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-400/10 transition-all"
                                    >
                                        Undo
                                    </button>
                                )}
                                <button
                                    onClick={resumeRecording}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white border border-white/20 hover:bg-white/10 transition-all"
                                >
                                    Resume
                                </button>
                                {pointCount >= 3 && (
                                    <button
                                        onClick={finishRecording}
                                        className="flex-1 py-2.5 rounded-xl text-xs font-black bg-brand-lime text-brand-dark hover:brightness-110 transition-all"
                                    >
                                        Finish ({area} ha)
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Helpful tips */}
                    {isRecording && status === 'recording' && pointCount < 5 && (
                        <p className="text-[10px] text-white/40 text-center">
                            Walk steadily along your field boundary. Points are recorded automatically every 3m.
                        </p>
                    )}
                </div>
            </div>
        </>
    );
};

// ─── Mode Selector Bar (shown when not in a mode) ────────────────────────────
const ModeSelector = ({
    onSelectDraw,
    onSelectGPS,
    onCancel,
}: {
    onSelectDraw: () => void;
    onSelectGPS: () => void;
    onCancel: () => void;
}) => {
    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto">
            <div className="bg-black/70 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-4 shadow-2xl min-w-[320px]">
                <p className="text-white text-sm font-bold text-center mb-1">How would you like to map your field?</p>
                <p className="text-white/50 text-xs text-center mb-4">Choose the method that works best for you</p>

                <div className="flex flex-col gap-2.5">
                    {/* Draw on Map option */}
                    <button
                        onClick={onSelectDraw}
                        className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-brand-lime/50 hover:bg-white/10 transition-all text-left flex items-start gap-3 group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-brand-lime/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-lime/30 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D7F26C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Draw on Map</p>
                            <p className="text-white/50 text-xs mt-0.5">Tap corners on the satellite map to outline your field</p>
                        </div>
                    </button>

                    {/* GPS Walk option */}
                    <button
                        onClick={onSelectGPS}
                        className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-brand-lime/50 hover:bg-white/10 transition-all text-left flex items-start gap-3 group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Walk with GPS</p>
                            <p className="text-white/50 text-xs mt-0.5">Walk or drive around your field boundary — GPS records automatically</p>
                        </div>
                    </button>
                </div>

                <button
                    onClick={onCancel}
                    className="w-full mt-3 py-2 text-xs font-bold text-white/40 hover:text-white/70 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};


// ─── Main MapComponent ────────────────────────────────────────────────────────
const MapComponent: React.FC<MapComponentProps> = ({
    fields,
    onSelectField,
    onFieldCreated,
    highlightedFieldId,
    mode = 'view',
    onModeChange,
}) => {
    const defaultCenter: [number, number] = [-17.82, 31.05];
    const center = fields.length > 0 && fields[0].location
        ? [fields[0].location.lat, fields[0].location.lon] as [number, number]
        : defaultCenter;

    const [internalMode, setInternalMode] = useState<'view' | 'choosing' | 'draw' | 'gps-walk'>('view');

    // Sync external mode prop
    useEffect(() => {
        if (mode === 'draw' || mode === 'gps-walk') {
            setInternalMode('choosing');
        } else {
            setInternalMode('view');
        }
    }, [mode]);

    const handleFieldComplete = (points: { lat: number; lon: number }[], area: number) => {
        setInternalMode('view');
        onModeChange?.('view');
        onFieldCreated?.(points, area);
    };

    const handleCancel = () => {
        setInternalMode('view');
        onModeChange?.('view');
    };

    return (
        <div className="h-full w-full relative">
            <style jsx global>{`
                /* Hide default Leaflet controls we replaced */
                .leaflet-control-zoom { display: none !important; }
                /* Hide default draw toolbar — we use custom UI */
                .leaflet-draw { display: none !important; }
                .leaflet-draw-toolbar { display: none !important; }
                .leaflet-bar {
                     box-shadow: none !important;
                     border: none !important;
                }
            `}</style>

            <MapContainer
                center={center}
                zoom={16}
                style={{ height: "100%", width: "100%", borderRadius: "3.5rem" }}
                zoomControl={false}
                className="z-0"
            >
                {/* Esri World Imagery (Satellite) */}
                <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />

                {/* Render actual field boundary polygons */}
                {fields.map((field) => {
                    if (!field.coordinates || field.coordinates.length < 3) return null;
                    const isHighlighted = field.id === highlightedFieldId;
                    const positions: [number, number][] = field.coordinates.map((c: any) => [c.lat, c.lon || c.lng]);

                    return (
                        <Polygon
                            key={`poly-${field.id}`}
                            positions={positions}
                            pathOptions={{
                                color: isHighlighted ? '#D7F26C' : '#fff',
                                fillColor: isHighlighted ? '#D7F26C' : '#fff',
                                fillOpacity: isHighlighted ? 0.15 : 0.05,
                                weight: isHighlighted ? 3 : 1.5,
                                dashArray: isHighlighted ? undefined : '6, 4',
                            }}
                            eventHandlers={{
                                click: () => onSelectField?.(field),
                            }}
                        >
                            <Popup className="custom-popup">
                                <div className="text-center">
                                    <p className="font-black text-brand-dark text-sm">{field.name}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-500">
                                        {field.crop} &bull; {field.area?.toFixed(1)} ha
                                    </p>
                                </div>
                            </Popup>
                        </Polygon>
                    );
                })}

                {/* Field markers */}
                {fields.map((field) => {
                    if (!field.location) return null;
                    const isHighlighted = field.id === highlightedFieldId;
                    const markerIcon = isHighlighted
                        ? L.divIcon({
                            className: 'highlighted-field-marker',
                            html: `<div style="width:32px;height:32px;background:#D7F26C;border:3px solid #2D3A26;border-radius:50%;box-shadow:0 0 0 6px rgba(215,242,108,0.4),0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
                                <div style="width:10px;height:10px;background:#2D3A26;border-radius:50%;"></div>
                            </div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16],
                            popupAnchor: [0, -20]
                        })
                        : customIcon;

                    return (
                        <Marker
                            key={field.id}
                            position={[field.location.lat, field.location.lon]}
                            icon={markerIcon}
                            zIndexOffset={isHighlighted ? 1000 : 0}
                            eventHandlers={{
                                click: () => onSelectField && onSelectField(field),
                            }}
                        >
                            <Popup className="custom-popup">
                                <div className="text-center">
                                    <p className="font-black text-brand-dark text-sm">{field.name}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-500">{field.crop} &bull; {field.area?.toFixed(1)} ha</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-500">{field.healthStatus}</p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                <MapRecenter center={center} />
                <FlyToField fields={fields} highlightedFieldId={highlightedFieldId} />
                <CustomControls />
                <LocationMarker />

                {/* Mode selector */}
                {internalMode === 'choosing' && (
                    <ModeSelector
                        onSelectDraw={() => setInternalMode('draw')}
                        onSelectGPS={() => setInternalMode('gps-walk')}
                        onCancel={handleCancel}
                    />
                )}

                {/* Manual draw mode */}
                {internalMode === 'draw' && (
                    <ManualDrawMode
                        onComplete={handleFieldComplete}
                        onCancel={handleCancel}
                    />
                )}

                {/* GPS walk mode */}
                {internalMode === 'gps-walk' && (
                    <GPSWalkMode
                        onComplete={handleFieldComplete}
                        onCancel={handleCancel}
                    />
                )}
            </MapContainer>

            {/* Overlay Gradient for clearer UI on top */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-[300] rounded-[3.5rem]" />
        </div>
    );
};

export default MapComponent;
