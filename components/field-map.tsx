"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Polygon, Popup, useMap, Circle, Marker } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { Loader2, Plus, Minus, Crosshair } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import L from "leaflet"
import { calculatePolygonArea, calculatePolygonPerimeter } from "@/lib/geo"

// Fix for default marker icons in Next.js
const iconUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png";

// Default Fallback (Zimbabwe)
const DEFAULT_CENTER = [-17.82, 31.05] as [number, number];

function MapController({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 16, { duration: 2 });
    }, [center, map]);
    return null;
}

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

function CustomControls() {
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
            <GlassCard className="p-1 flex flex-col gap-1 bg-black/40 backdrop-blur-xl border-white/20 rounded-xl overflow-hidden shadow-2xl">
                <Button
                    onClick={handleLocateMe}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-white hover:text-brand-lime hover:bg-white/10 rounded-lg transition-all"
                >
                    <Crosshair className="h-5 w-5" />
                </Button>
            </GlassCard>

            <GlassCard className="p-1 flex flex-col gap-1 bg-black/40 backdrop-blur-xl border-white/20 rounded-xl overflow-hidden shadow-2xl">
                <Button
                    onClick={handleZoomIn}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-white hover:text-brand-lime hover:bg-white/10 rounded-lg transition-all"
                >
                    <Plus className="h-5 w-5" />
                </Button>
                <div className="h-px w-full bg-white/10" />
                <Button
                    onClick={handleZoomOut}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-white hover:text-brand-lime hover:bg-white/10 rounded-lg transition-all"
                >
                    <Minus className="h-5 w-5" />
                </Button>
            </GlassCard>
        </div>
    );
}

interface FieldMapProps {
    center?: [number, number]
    polygon?: [number, number][]
    fieldName?: string
    area?: number
    ndvi?: number
    healthStatus?: string
}

export default function FieldMap({ center = DEFAULT_CENTER, polygon, fieldName = "Main Field", area, ndvi, healthStatus }: FieldMapProps) {
    const [mounted, setMounted] = useState(false);

    // Mock polygon based on center if not provided
    const displayPolygon = polygon || [
        [center[0] + 0.002, center[1] - 0.002],
        [center[0] + 0.002, center[1] + 0.002],
        [center[0] - 0.002, center[1] + 0.002],
        [center[0] - 0.002, center[1] - 0.002],
    ] as [number, number][];

    // Calculate stats from the polygon
    const polygonPoints = displayPolygon.map(p => ({ lat: p[0], lon: p[1] }));
    const computedArea = area || calculatePolygonArea(polygonPoints);
    const perimeter = calculatePolygonPerimeter(polygonPoints);

    useEffect(() => {
        setMounted(true);
        L.Icon.Default.mergeOptions({
            iconUrl: iconUrl,
            iconRetinaUrl: iconRetinaUrl,
            shadowUrl: shadowUrl,
        });
    }, []);

    if (!mounted) {
        return (
            <GlassCard className="h-full w-full flex items-center justify-center bg-black/20">
                <Loader2 className="h-8 w-8 animate-spin text-neon-green" />
            </GlassCard>
        );
    }

    return (
        <div className="h-full w-full relative rounded-3xl overflow-hidden z-0 shadow-inner group">
            <style jsx global>{`
                .leaflet-control-zoom { display: none !important; }
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
                zoomControl={false}
                scrollWheelZoom={true}
                className="h-full w-full"
                style={{ background: "#020617" }}
            >
                {/* Esri World Imagery (Satellite) */}
                <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />

                {/* Field boundary polygon */}
                <Polygon
                    positions={displayPolygon}
                    pathOptions={{
                        color: '#D7F26C',
                        fillColor: '#D7F26C',
                        fillOpacity: 0.1,
                        weight: 2.5,
                    }}
                >
                    <Popup className="glass-popup">
                        <div className="p-2 text-center">
                            <h3 className="font-bold text-charcoal text-sm">{fieldName}</h3>
                            <p className="text-xs text-slate-600">{computedArea} ha &bull; {perimeter >= 1000 ? `${(perimeter / 1000).toFixed(1)} km` : `${perimeter} m`} perimeter</p>
                            {ndvi !== undefined && <p className="text-xs text-slate-600">NDVI: {ndvi.toFixed(2)}</p>}
                            {healthStatus && <p className="text-xs text-slate-600">Status: {healthStatus}</p>}
                        </div>
                    </Popup>
                </Polygon>

                {/* Vertex dots on the boundary */}
                {displayPolygon.map((pos, i) => (
                    <Marker
                        key={`vertex-${i}`}
                        position={pos}
                        icon={L.divIcon({
                            className: 'field-vertex',
                            html: `<div style="width:8px;height:8px;background:#D7F26C;border:2px solid #2D3A26;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>`,
                            iconSize: [8, 8],
                            iconAnchor: [4, 4],
                        })}
                    />
                ))}

                <MapController center={center} />
                <CustomControls />
                <LocationMarker />
            </MapContainer>

            {/* Field info overlay */}
            <div className="absolute bottom-20 left-4 z-[400] pointer-events-none">
                <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 shadow-lg">
                    <p className="text-white font-bold text-sm">{fieldName}</p>
                    <p className="text-white/60 text-xs">
                        {computedArea} ha &bull; {perimeter >= 1000 ? `${(perimeter / 1000).toFixed(1)} km` : `${perimeter} m`}
                    </p>
                </div>
            </div>

            {/* Overlay Gradient for clearer UI on top */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-[300]" />
        </div>
    )
}
