'use client'

/**
 * Climate API Service for KurimaSense
 * Interfaces with backend climate endpoints
 */
import type {
    CurrentWeather,
    ForecastResponse,
    AgriculturalMetrics,
    AlertsResponse,
    SprayWindowResponse,
    HistoricalComparison,
    FullClimateData
} from '@/lib/climate-types';
import { getAuthHeaders, getCached, setCache, CACHE_TTL } from '@/lib/api-cache';

import { API_BASE_URL } from '@/lib/api-base';
import { resilientFetch } from '@/lib/http';
import { coalesce, newInflightMap } from '@/lib/single-flight';

// Build query params from options + a stable cache-key suffix
function buildKey(options: Record<string, any>): string {
    return Object.entries(options)
        .filter(([, v]) => v !== undefined && v !== null)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
}

function buildQueryParams(options: Record<string, any>): string {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            params.append(key, String(value));
        }
    });
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Requests in flight right now, keyed exactly as the cache is. Module-level so
// every component calling climateApi shares it — the whole point is that four
// separate callers coalesce onto one request.
const inflight = newInflightMap<any>();

/**
 * Resilient cached GET for climate data.
 *
 * Retries transient failures (network error, backend cold-start, or a backend
 * soft-`{available:false}` payload — which is what the API now returns when
 * Open-Meteo is momentarily rate-limiting the server) with exponential backoff,
 * so the Climate page self-heals without the user hitting "Retry". Soft
 * unavailable payloads are NOT cached, so the next attempt can fetch live data.
 */
async function cachedGet<T>(
    path: string,
    options: Record<string, any>,
    cacheKeyPrefix: string,
    ttlMs: number,
    retries = 2,
): Promise<T | null> {
    const cacheKey = `${cacheKeyPrefix}|${buildKey(options)}`;
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;

    // Single-flight. The cache above answers "have we fetched this?"; it cannot
    // answer "are we fetching it right now?", and on a cold cache — a fresh page
    // load, which is when the app is judged — four components mounted together
    // all missed and all four fired the same request. See lib/single-flight.
    return coalesce(cacheKey, inflight as Map<string, Promise<any>>, () =>
        fetchAndCache<T>(path, options, cacheKey, ttlMs, retries),
    ) as Promise<T | null>;
}

/** The actual fetch, retries and cache write. One caller at a time — see above. */
async function fetchAndCache<T>(
    path: string,
    options: Record<string, any>,
    cacheKey: string,
    ttlMs: number,
    retries: number,
): Promise<T | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const headers = await getAuthHeaders();
            const res = await resilientFetch(`${API_BASE_URL}${path}${buildQueryParams(options)}`, { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
            const data = await res.json() as T & { available?: boolean };

            // Backend signalled a transient outage — retry rather than cache it.
            if (data && data.available === false && attempt < retries) {
                await sleep(1000 * Math.pow(2, attempt));
                continue;
            }
            if (!data || data.available === false) return data as T; // final: hand back so UI shows its unavailable state
            setCache(cacheKey, data, ttlMs);
            return data as T;
        } catch (e) {
            if (attempt < retries) {
                await sleep(1000 * Math.pow(2, attempt)); // 1s, 2s
                continue;
            }
            console.error(`[Climate] ${path} error after ${retries + 1} attempts:`, e);
            return null;
        }
    }
    return null;
}

export const climateApi = {
    getCurrentWeather(options: { lat?: number; lon?: number; field_id?: string } = {}): Promise<CurrentWeather | null> {
        return cachedGet<CurrentWeather>('/climate/current', options, 'climate_current', CACHE_TTL.CLIMATE_CURRENT);
    },

    getForecast(options: { lat?: number; lon?: number; field_id?: string; days?: number } = {}): Promise<ForecastResponse | null> {
        return cachedGet<ForecastResponse>('/climate/forecast', options, 'climate_forecast', CACHE_TTL.CLIMATE_FORECAST);
    },

    getAgriculturalMetrics(options: { lat?: number; lon?: number; field_id?: string; base_temp?: number; start_date?: string } = {}): Promise<AgriculturalMetrics | null> {
        return cachedGet<AgriculturalMetrics>('/climate/agricultural', options, 'climate_agricultural', CACHE_TTL.CLIMATE_DAILY);
    },

    getAlerts(options: { lat?: number; lon?: number; field_id?: string } = {}): Promise<AlertsResponse | null> {
        return cachedGet<AlertsResponse>('/climate/alerts', options, 'climate_alerts', CACHE_TTL.CLIMATE_FORECAST);
    },

    getSprayWindow(options: { lat?: number; lon?: number; field_id?: string; hours?: number } = {}): Promise<SprayWindowResponse | null> {
        return cachedGet<SprayWindowResponse>('/climate/spray-window', options, 'climate_spray', CACHE_TTL.CLIMATE_FORECAST);
    },

    getHistoricalComparison(options: { lat?: number; lon?: number; field_id?: string } = {}): Promise<HistoricalComparison | null> {
        return cachedGet<HistoricalComparison>('/climate/historical', options, 'climate_historical', CACHE_TTL.CLIMATE_DAILY);
    },

    getFullClimateData(options: { lat?: number; lon?: number; field_id?: string } = {}): Promise<FullClimateData | null> {
        return cachedGet<FullClimateData>('/climate/full', options, 'climate_full', CACHE_TTL.CLIMATE_FORECAST);
    },
};

export default climateApi;
