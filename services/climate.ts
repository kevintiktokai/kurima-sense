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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

async function cachedGet<T>(path: string, options: Record<string, any>, cacheKeyPrefix: string, ttlMs: number): Promise<T | null> {
    const cacheKey = `${cacheKeyPrefix}|${buildKey(options)}`;
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;

    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}${path}${buildQueryParams(options)}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch ${path}`);
        const data = await res.json() as T;
        setCache(cacheKey, data, ttlMs);
        return data;
    } catch (e) {
        console.error(`[Climate] ${path} error:`, e);
        return null;
    }
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
