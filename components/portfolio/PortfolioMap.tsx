'use client'

/**
 * PortfolioMap — satellite map of the contracted portfolio (Depth Sprint PR C).
 *
 * MapLibre GL over Esri World Imagery (keyed raster tiles). Field polygons +
 * centroid markers coloured by a switchable data layer (Score / NDVI / Moisture
 * / Crop), tappable through to field detail. Client-only; the page imports it
 * with `dynamic(..., { ssr: false })` because MapLibre touches `window` at
 * import time. Colours come from the pure `lib/map-utils` helpers — this file
 * holds only the imperative GL wiring + the React overlays (layer switcher,
 * legend).
 *
 * Never crashes: a missing imagery key renders a calm notice instead of a map.
 */

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
    toGeoJSON, centroidFeatures, portfolioBounds, colorFor,
    MAP_LAYERS, MAP_LAYER_LABELS, CROP_LEGEND, INDEX_LEGENDS, NULL_COLOR,
    type MapLayer,
} from '@/lib/map-utils'
import { routeForField, withFrom } from '@/lib/nav-links'
import type { PortfolioPriority } from '@/lib/portfolio-utils'

const ARCGIS_KEY = process.env.NEXT_PUBLIC_ARCGIS_API_KEY
const ZOOM_SPLIT = 12 // markers below, polygons at/above

function esc(s: string): string {
    return String(s ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
    ))
}

// Build both feature collections with a per-feature `color` baked in for the
// active layer (so the GL paint can just read ['get','color']).
function buildData(priorities: PortfolioPriority[], layer: MapLayer) {
    const poly = toGeoJSON(priorities)
    const cent = centroidFeatures(priorities)
    for (const f of poly.features) (f.properties as unknown as Record<string, unknown>).color = colorFor(layer, f.properties)
    for (const f of cent.features) (f.properties as unknown as Record<string, unknown>).color = colorFor(layer, f.properties)
    return { poly, cent }
}

function popupHTML(props: Record<string, unknown>): string {
    const name = esc(String(props.name || 'Field'))
    const grower = props.grower_name ? esc(String(props.grower_name)) : ''
    const score = props.kurima_score
    const color = String(props.kurima_color || NULL_COLOR)
    const concern = esc(String(props.primary_concern || ''))
    const href = withFrom(routeForField(String(props.field_id), 'portfolio'), 'Map', '/portfolio/fields')

    const chip = score == null
        ? `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;background:var(--ee-bg);color:var(--ee-muted)">Awaiting data</span>`
        : `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:900;background:${color}1A;color:${color}">${esc(String(score))}</span>`

    return `
      <div style="font-family:var(--font-body);min-width:200px;max-width:260px;color:var(--ee-text)">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
          <div style="min-width:0">
            <p style="font-weight:900;font-size:14px;line-height:1.2;margin:0">${grower || name}</p>
            ${grower ? `<p style="font-size:11px;font-weight:700;color:var(--ee-muted);margin:2px 0 0">${name}</p>` : ''}
          </div>
          ${chip}
        </div>
        ${concern ? `<p style="font-size:12px;margin:8px 0 0;line-height:1.35">${concern}</p>` : ''}
        <a href="${href}" style="display:inline-flex;align-items:center;gap:4px;margin-top:10px;font-size:12px;font-weight:800;color:var(--ee-primary);text-decoration:none">
          Open field <span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span>
        </a>
      </div>`
}

export interface PortfolioMapProps {
    /** Already-filtered, already-sorted priorities (same array the list shows). */
    priorities: PortfolioPriority[]
}

export default function PortfolioMap({ priorities }: PortfolioMapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const loadedRef = useRef(false)
    const [layer, setLayer] = useState<MapLayer>('score')
    // Why the canvas is blank, if it is. `null` = healthy (or still loading).
    //  - 'imagery': the map started but Esri tiles never painted — a rejected
    //    ArcGIS key (expired / over-quota / referrer-restricted / missing the
    //    Basemaps scope), a blocked request, or a dead-slow network.
    //  - 'webgl': the map could not start at all — WebGL unavailable or
    //    exhausted (common on devices with many open tabs / in-app browsers).
    // Either way we show a real explanation instead of a silent grey square.
    const [mapError, setMapError] = useState<null | 'imagery' | 'webgl'>(null)

    // Init once.
    useEffect(() => {
        if (!ARCGIS_KEY || !containerRef.current || mapRef.current) return

        let map: maplibregl.Map
        try {
            map = new maplibregl.Map({
                container: containerRef.current,
                attributionControl: false,
                style: {
                    version: 8,
                    sources: {
                        esri: {
                            type: 'raster',
                            tiles: [`https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${ARCGIS_KEY}`],
                            tileSize: 256,
                            attribution: 'Powered by Esri — Esri, Maxar, Earthstar Geographics',
                        },
                    },
                    layers: [{ id: 'esri', type: 'raster', source: 'esri' }],
                },
                center: [31.05, -17.5], // Mashonaland fallback before fitBounds
                zoom: 6,
            })
        } catch (err) {
            // Constructing the map throws when WebGL can't be acquired. Don't let
            // it bubble (that would blank the whole page) — show a clear notice.
            console.error('[PortfolioMap] could not start MapLibre (WebGL):', err)
            setMapError('webgl')
            return
        }
        mapRef.current = map
        map.addControl(new maplibregl.AttributionControl({ compact: true }))
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

        // Imagery watchdog: if no Esri tile has painted within the grace period,
        // the basemap silently failed (a rejected key answers 200-with-error-body,
        // which fires no HTTP error, or the GL context was lost after init). Flag
        // it so the blank canvas explains itself. A successful tile clears it.
        let firstTilePainted = false
        const watchdog = setTimeout(() => {
            if (!firstTilePainted) setMapError((e) => e ?? 'imagery')
        }, 10000)

        // Esri source error → imagery failed (rejected key / blocked / network).
        map.on('error', (e) => {
            const sourceId = (e as { sourceId?: string }).sourceId
            console.error('[PortfolioMap] map error:', (e as { error?: unknown }).error ?? e)
            if (sourceId === 'esri') setMapError('imagery')
        })
        // Lost GL context (tab/memory pressure) — the canvas goes blank.
        map.on('webglcontextlost', () => setMapError('webgl'))
        // A real Esri tile decoded → healthy; clear any watchdog/transient flag.
        map.on('data', (e) => {
            const d = e as { sourceId?: string; tile?: unknown }
            if (d.sourceId === 'esri' && d.tile) {
                firstTilePainted = true
                clearTimeout(watchdog)
                setMapError(null)
            }
        })

        // Blank-canvas guard: the map is mounted via the List→Map toggle into a
        // viewport-sized container, so its size may not be settled at init.
        // A ResizeObserver keeps the GL canvas matched to the container (the
        // first callback fires once the real size is known → tiles + polygons
        // draw); also covers the toggle becoming visible and window resizes.
        const ro = new ResizeObserver(() => map.resize())
        ro.observe(containerRef.current)

        map.on('load', () => {
            map.resize() // ensure the canvas matches the now-laid-out container
            const { poly, cent } = buildData(priorities, layer)
            map.addSource('fields-poly', { type: 'geojson', data: poly as never })
            map.addSource('fields-cent', { type: 'geojson', data: cent as never })

            // Polygons at high zoom.
            map.addLayer({
                id: 'fields-fill', type: 'fill', source: 'fields-poly', minzoom: ZOOM_SPLIT,
                paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.55 },
            })
            map.addLayer({
                id: 'fields-outline', type: 'line', source: 'fields-poly', minzoom: ZOOM_SPLIT,
                paint: { 'line-color': ['get', 'color'], 'line-width': 1.5 },
            })
            // Centroid markers at low zoom.
            map.addLayer({
                id: 'fields-markers', type: 'circle', source: 'fields-cent', maxzoom: ZOOM_SPLIT,
                paint: {
                    'circle-radius': 6, 'circle-color': ['get', 'color'],
                    'circle-stroke-width': 1.5, 'circle-stroke-color': '#FFFFFF',
                },
            })

            const openPopup = (e: maplibregl.MapLayerMouseEvent) => {
                const f = e.features?.[0]
                if (!f) return
                new maplibregl.Popup({ closeButton: true, maxWidth: '280px', className: 'portfolio-popup' })
                    .setLngLat(e.lngLat)
                    .setHTML(popupHTML(f.properties as Record<string, unknown>))
                    .addTo(map)
            }
            for (const id of ['fields-fill', 'fields-markers']) {
                map.on('click', id, openPopup)
                map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer' })
                map.on('mouseleave', id, () => { map.getCanvas().style.cursor = '' })
            }

            loadedRef.current = true
            const b = portfolioBounds(priorities)
            if (b) map.fitBounds(b as [[number, number], [number, number]], { padding: 48, maxZoom: 14, duration: 0 })
        })

        return () => { clearTimeout(watchdog); ro.disconnect(); map.remove(); mapRef.current = null; loadedRef.current = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Re-colour / re-data when the layer or the filtered set changes.
    useEffect(() => {
        const map = mapRef.current
        if (!map || !loadedRef.current) return
        const { poly, cent } = buildData(priorities, layer)
        ;(map.getSource('fields-poly') as maplibregl.GeoJSONSource | undefined)?.setData(poly as never)
        ;(map.getSource('fields-cent') as maplibregl.GeoJSONSource | undefined)?.setData(cent as never)
    }, [priorities, layer])

    // Graceful missing-key state — never a broken map.
    if (!ARCGIS_KEY) {
        return (
            <div className="w-full h-full min-h-[420px] flex items-center justify-center rounded-[20px] p-8 text-center"
                style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
                <div>
                    <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-muted)' }}>map</span>
                    <p className="font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>Map unavailable</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--ee-muted)' }}>Imagery key not configured.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative w-full h-full min-h-[420px] rounded-[20px] overflow-hidden" style={{ boxShadow: 'var(--shadow-neu)' }}>
            <div ref={containerRef} className="absolute inset-0" />

            {/* Blank-canvas notice — explain *why* instead of a silent grey box. */}
            {mapError && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-8 text-center"
                    style={{ background: 'var(--ee-surface)' }}>
                    <div className="max-w-sm">
                        <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-muted)' }}>
                            {mapError === 'webgl' ? 'desktop_access_disabled' : 'wrong_location'}
                        </span>
                        {mapError === 'webgl' ? (
                            <>
                                <p className="font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>The map couldn&apos;t start</p>
                                <p className="text-sm mt-1" style={{ color: 'var(--ee-muted)' }}>
                                    Your browser couldn&apos;t open the map view (WebGL). Try closing other tabs and
                                    reloading, or open the site in Safari or Chrome directly.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>Satellite imagery didn&apos;t load</p>
                                <p className="text-sm mt-1" style={{ color: 'var(--ee-muted)' }}>
                                    The ArcGIS imagery didn&apos;t come through. Usually the key needs the Basemaps
                                    scope and your domain in its referrers (and to be in quota); on a device with
                                    many tabs open it can also be a browser graphics limit. Try reloading.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Layer switcher (top-right) */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 p-1 rounded-full"
                style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
                <div className="flex">
                    {MAP_LAYERS.map((l) => (
                        <button
                            key={l}
                            onClick={() => setLayer(l)}
                            className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                            style={layer === l
                                ? { background: 'var(--ee-primary)', color: '#FFFFFF' }
                                : { background: 'transparent', color: 'var(--ee-muted)' }}
                        >
                            {MAP_LAYER_LABELS[l]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Legend (bottom-left) */}
            <div className="absolute bottom-3 left-3 z-10 p-3 rounded-[14px] max-w-[60%]"
                style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
                {layer === 'crop' ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                        {CROP_LEGEND.map((c) => (
                            <span key={c.label} className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--ee-muted)' }}>
                                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c.color }} />
                                {c.label}
                            </span>
                        ))}
                    </div>
                ) : layer === 'score' ? (
                    <p className="text-[11px] font-bold" style={{ color: 'var(--ee-muted)' }}>
                        Coloured by KurimaScore band · grey = awaiting
                    </p>
                ) : (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ee-muted)' }}>
                            {MAP_LAYER_LABELS[layer]}
                        </p>
                        <div className="h-2 w-32 rounded-full" style={{
                            background: layer === 'ndvi'
                                ? `linear-gradient(90deg, ${INDEX_LEGENDS.ndvi.from}, ${INDEX_LEGENDS.ndvi.mid}, ${INDEX_LEGENDS.ndvi.to})`
                                : `linear-gradient(90deg, ${INDEX_LEGENDS.moisture.from}, ${INDEX_LEGENDS.moisture.to})`,
                        }} />
                        <div className="flex justify-between w-32 mt-0.5 text-[10px] font-bold" style={{ color: 'var(--ee-muted)' }}>
                            <span>{INDEX_LEGENDS[layer === 'ndvi' ? 'ndvi' : 'moisture'].min}</span>
                            <span>{INDEX_LEGENDS[layer === 'ndvi' ? 'ndvi' : 'moisture'].max}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
