"use client";

// v2.0 Satellite Map - Forced Update
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, FeatureGroup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import { calculatePolygonArea } from '@/lib/geo';

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

interface MapComponentProps {
    fields: any[];
    onSelectField?: (field: any) => void;
    onFieldCreated?: (points: { lat: number, lon: number }[], area?: number) => void;
}

const LocationMarker = () => {
    const [position, setPosition] = React.useState<L.LatLng | null>(null);
    const [accuracy, setAccuracy] = React.useState<number>(0);
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

const MapComponent: React.FC<MapComponentProps> = ({ fields, onSelectField, onFieldCreated }) => {
    // Default center (Harare)
    const defaultCenter: [number, number] = [-17.82, 31.05];
    const center = fields.length > 0 && fields[0].location
        ? [fields[0].location.lat, fields[0].location.lon] as [number, number]
        : defaultCenter;

    // Dynamic import for EditControl to avoid SSR issues
    const { EditControl } = require("react-leaflet-draw");

    const _onCreated = (e: any) => {
        const { layerType, layer } = e;
        if (layerType === 'polygon' && onFieldCreated) {
            const { _latlngs } = layer;
            const latlngs = _latlngs[0] || _latlngs;
            const points = latlngs.map((p: any) => ({ lat: p.lat, lon: p.lng }));

            const area = calculatePolygonArea(points);
            onFieldCreated(points, area);
        }
    };

    return (
        <div className="h-full w-full relative">
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
                style={{ height: "100%", width: "100%", borderRadius: "3.5rem" }}
                zoomControl={false}
                className="z-0"
            >
                {/* Esri World Imagery (Satellite) */}
                <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />

                <FeatureGroup>
                    <EditControl
                        position="topleft"
                        onCreated={_onCreated}
                        draw={{
                            rectangle: false,
                            circle: false,
                            circlemarker: false,
                            marker: false,
                            polyline: false,
                            polygon: {
                                allowIntersection: false,
                                drawError: {
                                    color: '#e1e100',
                                    message: '<strong>Oh snap!<strong> you can\'t draw that!'
                                },
                                shapeOptions: {
                                    color: '#D7F26C',
                                    fillColor: '#D7F26C',
                                    fillOpacity: 0.2,
                                    weight: 2
                                }
                            }
                        }}
                    />
                </FeatureGroup>

                <MapRecenter center={center} />
                <CustomControls />
                <LocationMarker />

                {fields.map((field) => (
                    field.location && (
                        <Marker
                            key={field.id}
                            position={[field.location.lat, field.location.lon]}
                            icon={customIcon}
                            eventHandlers={{
                                click: () => onSelectField && onSelectField(field),
                            }}
                        >
                            <Popup className="custom-popup">
                                <div className="text-center">
                                    <p className="font-black text-brand-dark text-sm">{field.name}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-500">{field.healthStatus}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>
            {/* Overlay Gradient for clearer UI on top */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-[300] rounded-[3.5rem]" />
        </div>
    );
};

export default MapComponent;
