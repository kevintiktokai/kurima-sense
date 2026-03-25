"use client"

import { useEffect, useState, useRef } from "react"
import { MapContainer, TileLayer, Polygon, Popup, useMap, FeatureGroup, Circle, Marker } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import { EditControl } from "react-leaflet-draw"
import { Loader2, Disc, Plus, Minus, Crosshair } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import L from "leaflet"

// Fix for default marker icons in Next.js
const iconUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png";

// Default Fallback (Zimbabwe)
const DEFAULT_CENTER = [-17.82, 31.05] as [number, number];

const NDVI_COLOR = "#fff"; // White outline for contrast on satellite

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
}

export default function FieldMap({ center = DEFAULT_CENTER, polygon, fieldName = "Main Field" }: FieldMapProps) {
    const [mounted, setMounted] = useState(false);

    // Mock polygon based on center if not provided
    const displayPolygon = polygon || [
        [center[0] + 0.002, center[1] - 0.002],
        [center[0] + 0.002, center[1] + 0.002],
        [center[0] - 0.002, center[1] + 0.002],
        [center[0] - 0.002, center[1] - 0.002],
    ] as [number, number][];

    useEffect(() => {
        setMounted(true);
        // Fix Leaflet icon issue
        (async () => {
            L.Icon.Default.mergeOptions({
                iconUrl: iconUrl,
                iconRetinaUrl: iconRetinaUrl,
                shadowUrl: shadowUrl,
            });
        })();
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
                /* Hide default Leaflet controls we replaced */
                .leaflet-control-zoom { display: none !important; }
                
                /* Style the Draw Toolbar to match Glassmorphism */
                .leaflet-draw-toolbar {
                    margin-top: 12px !important;
                    margin-left: 12px !important;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .leaflet-draw-toolbar a {
                    background-color: rgba(0, 0, 0, 0.6) !important;
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.2) !important;
                    color: white !important;
                    border-radius: 8px !important;
                    width: 36px !important;
                    height: 36px !important;
                    line-height: 36px !important;
                    display: flex !important;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .leaflet-draw-toolbar a:hover {
                    background-color: rgba(255, 255, 255, 0.1) !important;
                    border-color: #D7F26C !important;
                }
                /* Custom icons for draw tools could be set here by overriding background-image */
                .leaflet-draw-draw-polygon {
                    background-image: none !important;
                }
                .leaflet-draw-draw-polygon::after {
                    content: '⬠';
                    font-size: 18px;
                    color: white;
                }
                .leaflet-draw-edit-edit {
                    background-image: none !important;
                }
                .leaflet-draw-edit-edit::after {
                    content: '✎';
                    font-size: 18px;
                    color: white;
                }
                .leaflet-draw-edit-remove {
                    background-image: none !important;
                }
                .leaflet-draw-edit-remove::after {
                    content: '✕';
                    font-size: 18px;
                    color: white;
                }
                /* Hide unused draw tools if any */
                .leaflet-draw-draw-circle, .leaflet-draw-draw-rectangle, .leaflet-draw-draw-circlemarker, .leaflet-draw-draw-marker, .leaflet-draw-draw-polyline {
                    display: none !important;
                }
                .leaflet-bar {
                     box-shadow: none !important;
                     border: none !important;
                }
            `}</style>

            <MapContainer
                center={center}
                zoom={16}
                zoomControl={false} // Disable default zoom
                scrollWheelZoom={true}
                className="h-full w-full"
                style={{ background: "#020617" }}
            >
                {/* Esri World Imagery (Satellite) */}
                <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />

                <FeatureGroup>
                    <EditControl
                        position="topleft"
                        onCreated={(e) => console.log(e)}
                        draw={{
                            rectangle: false,
                            polyline: false,
                            circle: false,
                            circlemarker: false,
                            marker: false,
                            polygon: {
                                allowIntersection: false,
                                drawError: {
                                    color: "#e1e100",
                                    message: "<strong>Oh snap!<strong> you can't draw that!"
                                },
                                shapeOptions: {
                                    color: "#D7F26C", // Brand Lime
                                    fillColor: "#D7F26C",
                                    fillOpacity: 0.2,
                                    weight: 2

                                }
                            }
                        }}
                    />
                </FeatureGroup>

                <Polygon
                    positions={displayPolygon}
                    pathOptions={{
                        color: NDVI_COLOR,
                        fillColor: "transparent",
                        fillOpacity: 0,
                        weight: 2,
                        dashArray: "10, 5"
                    }}
                >
                    <Popup className="glass-popup">
                        <div className="p-2">
                            <h3 className="font-bold text-charcoal">{fieldName}</h3>
                            <p className="text-xs text-slate-600">NDVI: 0.72 (Good)</p>
                            <p className="text-xs text-slate-600">Status: Healthy</p>
                        </div>
                    </Popup>
                </Polygon>

                <MapController center={center} />
                <CustomControls />
                <LocationMarker />
            </MapContainer>

            {/* Overlay Gradient for clearer UI on top */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-[300]" />
        </div>
    )
}
