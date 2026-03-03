'use client'

/**
 * Climate API Service for KurimaSense
 * Interfaces with backend climate endpoints
 */
import { supabase, waitForAuth } from '@/lib/supabase';
import type {
    CurrentWeather,
    ForecastResponse,
    AgriculturalMetrics,
    AlertsResponse,
    SprayWindowResponse,
    HistoricalComparison,
    FullClimateData
} from '@/lib/climate-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Track if auth is ready
let authReady = false;
let authReadyPromise: Promise<void> | null = null;

async function ensureAuthReady(): Promise<void> {
    if (authReady) return;
    if (!authReadyPromise) {
        authReadyPromise = waitForAuth().then(() => {
            authReady = true;
        });
    }
    await authReadyPromise;
}

// Helper to get auth headers with JWT token
async function getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    };

    if (typeof window === 'undefined') {
        return headers;
    }

    try {
        await ensureAuthReady();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
    } catch (e) {
        console.error('[Climate API] Error getting auth session:', e);
    }

    return headers;
}

// Build query params from options
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

export const climateApi = {
    /**
     * Get current weather conditions
     */
    async getCurrentWeather(options: {
        lat?: number;
        lon?: number;
        field_id?: string;
    } = {}): Promise<CurrentWeather | null> {
        try {
            const headers = await getAuthHeaders();
            const queryParams = buildQueryParams(options);
            const res = await fetch(`${API_BASE_URL}/climate/current${queryParams}`, { headers });

            if (!res.ok) throw new Error('Failed to fetch current weather');
            return await res.json();
        } catch (e) {
            console.error('Climate current error:', e);
            return null;
        }
    },

    /**
     * Get forecast (daily + hourly)
     */
    async getForecast(options: {
        lat?: number;
        lon?: number;
        field_id?: string;
        days?: number;
    } = {}): Promise<ForecastResponse | null> {
        try {
            const headers = await getAuthHeaders();
            const queryParams = buildQueryParams(options);
            const res = await fetch(`${API_BASE_URL}/climate/forecast${queryParams}`, { headers });

            if (!res.ok) throw new Error('Failed to fetch forecast');
            return await res.json();
        } catch (e) {
            console.error('Climate forecast error:', e);
            return null;
        }
    },

    /**
     * Get agricultural metrics (GDD, ET, soil moisture)
     */
    async getAgriculturalMetrics(options: {
        lat?: number;
        lon?: number;
        field_id?: string;
        base_temp?: number;
        start_date?: string;
    } = {}): Promise<AgriculturalMetrics | null> {
        try {
            const headers = await getAuthHeaders();
            const queryParams = buildQueryParams(options);
            const res = await fetch(`${API_BASE_URL}/climate/agricultural${queryParams}`, { headers });

            if (!res.ok) throw new Error('Failed to fetch agricultural metrics');
            return await res.json();
        } catch (e) {
            console.error('Agricultural metrics error:', e);
            return null;
        }
    },

    /**
     * Get weather alerts
     */
    async getAlerts(options: {
        lat?: number;
        lon?: number;
        field_id?: string;
    } = {}): Promise<AlertsResponse | null> {
        try {
            const headers = await getAuthHeaders();
            const queryParams = buildQueryParams(options);
            const res = await fetch(`${API_BASE_URL}/climate/alerts${queryParams}`, { headers });

            if (!res.ok) throw new Error('Failed to fetch alerts');
            return await res.json();
        } catch (e) {
            console.error('Weather alerts error:', e);
            return null;
        }
    },

    /**
     * Get spray window recommendations
     */
    async getSprayWindow(options: {
        lat?: number;
        lon?: number;
        field_id?: string;
        hours?: number;
    } = {}): Promise<SprayWindowResponse | null> {
        try {
            const headers = await getAuthHeaders();
            const queryParams = buildQueryParams(options);
            const res = await fetch(`${API_BASE_URL}/climate/spray-window${queryParams}`, { headers });

            if (!res.ok) throw new Error('Failed to fetch spray window');
            return await res.json();
        } catch (e) {
            console.error('Spray window error:', e);
            return null;
        }
    },

    /**
     * Get historical comparison
     */
    async getHistoricalComparison(options: {
        lat?: number;
        lon?: number;
        field_id?: string;
    } = {}): Promise<HistoricalComparison | null> {
        try {
            const headers = await getAuthHeaders();
            const queryParams = buildQueryParams(options);
            const res = await fetch(`${API_BASE_URL}/climate/historical${queryParams}`, { headers });

            if (!res.ok) throw new Error('Failed to fetch historical data');
            return await res.json();
        } catch (e) {
            console.error('Historical comparison error:', e);
            return null;
        }
    },

    /**
     * Get full climate data in a single call
     */
    async getFullClimateData(options: {
        lat?: number;
        lon?: number;
        field_id?: string;
    } = {}): Promise<FullClimateData | null> {
        try {
            const headers = await getAuthHeaders();
            const queryParams = buildQueryParams(options);
            const res = await fetch(`${API_BASE_URL}/climate/full${queryParams}`, { headers });

            if (!res.ok) throw new Error('Failed to fetch climate data');
            return await res.json();
        } catch (e) {
            console.error('Full climate data error:', e);
            return null;
        }
    }
};

export default climateApi;
