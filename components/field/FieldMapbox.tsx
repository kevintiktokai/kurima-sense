'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { FieldSection } from '@/hooks/useFieldSections'
import { zoneStyle } from '@/lib/section-colors'
import { MAPBOX_TOKEN, MAPBOX_ENABLED } from '@/lib/mapbox'

export { MAPBOX_ENABLED }

const STYLES: { id: string; label: string; url: string }[] = [
    { id: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
    { id: 'streets', label: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
    { id: 'outdoors', label: 'Terrain', url: 'mapbox://styles/mapbox/outdoors-v12' },
]

interface Props {
    /** Field boundary as stored: {lat, lon}, open ring. */
    polygon: { lat: number; lon: number }[]
    sections?: FieldSection[]
    /** Show the per-zone NDVI heat overlay (vs. just the boundary). */
    showSections?: boolean
    onZoneClick?: (section: FieldSection) => void
    className?: string
    /** Called when Mapbox GL cannot start (bad token, WebGL unavailable, …)
     *  so the caller can swap in the fallback map instead of showing nothing. */
    onInitError?: (err: unknown) => void
}

// {lat,lon} open ring → GeoJSON [lon,lat] closed ring.
function toClosedRing(pts: { lat: number; lon: number }[]): number[][] {
    const ring = pts.map((p) => [p.lon, p.lat])
    if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push(ring[0])
    }
    return ring
}

function boundsOf(pts: { lat: number; lon: number }[]): mapboxgl.LngLatBounds | null {
    if (!pts.length) return null
    const b = new mapboxgl.LngLatBounds()
    pts.forEach((p) => b.extend([p.lon, p.lat]))
    return b
}

/**
 * Mapbox GL field map: satellite/streets/terrain toggle, the field boundary,
 * and (optionally) the per-zone NDVI heat overlay. Rendered only when a Mapbox
 * token is configured — callers fall back to the Leaflet map otherwise.
 */
export default function FieldMapbox({
    polygon, sections = [], showSections = true, onZoneClick, className, onInitError,
}: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<mapboxgl.Map | null>(null)
    const [styleId, setStyleId] = useState('satellite')
    const [ready, setReady] = useState(false)
    // Keep the latest callback in a ref so the init effect stays run-once.
    const onInitErrorRef = useRef(onInitError)
    onInitErrorRef.current = onInitError

    // Init once.
    useEffect(() => {
        if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return
        mapboxgl.accessToken = MAPBOX_TOKEN

        const b = boundsOf(polygon)
        const center: [number, number] = b
            ? (b.getCenter().toArray() as [number, number])
            : [31.05, -17.82]

        // `new mapboxgl.Map` THROWS synchronously on an unusable token or when
        // WebGL is unavailable. Uncaught inside an effect that reaches the route
        // error boundary and replaces the entire page with "Something went
        // wrong" — so a map that can't start must degrade, never escalate.
        let map: mapboxgl.Map
        try {
            map = new mapboxgl.Map({
                container: containerRef.current,
                style: STYLES[0].url,
                center,
                zoom: 15,
                attributionControl: false,
            })
        } catch (err) {
            console.error('[mapbox] map init failed; falling back to the basic map', err)
            onInitErrorRef.current?.(err)
            return
        }
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
        map.on('load', () => {
            if (b) map.fitBounds(b, { padding: 48, duration: 0, maxZoom: 17 })
            setReady(true)
        })
        // Async failures (401 on the style, tile errors) arrive here rather than
        // as a throw. mapbox-gl treats an unhandled 'error' as fatal, so this
        // listener is also what stops it from re-raising.
        map.on('error', (e) => console.error('[mapbox] ', e?.error?.message || e))
        mapRef.current = map
        return () => { map.remove(); mapRef.current = null }
        // polygon intentionally read once at init; fitBounds re-runs via the
        // layer effect below when it changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // (Re)draw layers on data change AND after a style switch (setStyle wipes
    // custom sources/layers, so we re-add them on styledata).
    useEffect(() => {
        const map = mapRef.current
        if (!map || !ready) return

        const draw = () => {
            // Field boundary
            const boundary = {
                type: 'Feature' as const,
                geometry: { type: 'Polygon' as const, coordinates: [toClosedRing(polygon)] },
                properties: {},
            }
            const src = map.getSource('field-boundary') as mapboxgl.GeoJSONSource | undefined
            if (src) {
                src.setData(boundary)
            } else {
                map.addSource('field-boundary', { type: 'geojson', data: boundary })
                map.addLayer({
                    id: 'field-boundary-line',
                    type: 'line',
                    source: 'field-boundary',
                    paint: { 'line-color': '#D7F26C', 'line-width': 2.5 },
                })
            }

            // Zone overlay
            const zoneFeatures = (showSections ? sections : []).map((s) => ({
                type: 'Feature' as const,
                geometry: { type: 'Polygon' as const, coordinates: [toClosedRing(s.polygon)] },
                properties: {
                    index: s.index,
                    label: s.label,
                    color: zoneStyle(s.ndvi).color,
                    ndvi: s.ndvi,
                },
            }))
            const zoneData = { type: 'FeatureCollection' as const, features: zoneFeatures }
            const zsrc = map.getSource('field-zones') as mapboxgl.GeoJSONSource | undefined
            if (zsrc) {
                zsrc.setData(zoneData)
            } else {
                map.addSource('field-zones', { type: 'geojson', data: zoneData })
                map.addLayer({
                    id: 'field-zones-fill',
                    type: 'fill',
                    source: 'field-zones',
                    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.45 },
                }, 'field-boundary-line')
                map.addLayer({
                    id: 'field-zones-line',
                    type: 'line',
                    source: 'field-zones',
                    paint: { 'line-color': '#ffffff', 'line-width': 1, 'line-opacity': 0.6 },
                }, 'field-boundary-line')
                map.addLayer({
                    id: 'field-zones-label',
                    type: 'symbol',
                    source: 'field-zones',
                    layout: { 'text-field': ['get', 'label'], 'text-size': 11 },
                    paint: { 'text-color': '#ffffff', 'text-halo-color': '#0f1a14', 'text-halo-width': 1.2 },
                })
            }
        }

        if (map.isStyleLoaded()) draw()
        else map.once('styledata', draw)
    }, [ready, polygon, sections, showSections, styleId])

    // Zone click
    useEffect(() => {
        const map = mapRef.current
        if (!map || !ready || !onZoneClick) return
        const handler = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
            const f = e.features?.[0]
            if (!f) return
            const idx = f.properties?.index as number
            const section = sections.find((s) => s.index === idx)
            if (section) onZoneClick(section)
        }
        map.on('click', 'field-zones-fill', handler)
        const enter = () => { map.getCanvas().style.cursor = 'pointer' }
        const leave = () => { map.getCanvas().style.cursor = '' }
        map.on('mouseenter', 'field-zones-fill', enter)
        map.on('mouseleave', 'field-zones-fill', leave)
        return () => {
            map.off('click', 'field-zones-fill', handler)
            map.off('mouseenter', 'field-zones-fill', enter)
            map.off('mouseleave', 'field-zones-fill', leave)
        }
    }, [ready, sections, onZoneClick])

    const switchStyle = (s: typeof STYLES[number]) => {
        setStyleId(s.id)
        mapRef.current?.setStyle(s.url) // triggers styledata → layers re-added
    }

    return (
        <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden' }} />
            {/* Style toggle */}
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 5 }}>
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(15,26,20,0.6)', backdropFilter: 'blur(12px)' }}>
                    {STYLES.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => switchStyle(s)}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors"
                            style={styleId === s.id
                                ? { background: '#D7F26C', color: '#1a2216' }
                                : { color: '#ffffff', background: 'transparent' }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
