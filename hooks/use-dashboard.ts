"use client"

import useSWR from 'swr'

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface DashboardData {
    stats: {
        active_fields: number
        crop_health: number
        rain_forecast: string
        farmers_reached: number
    }
    charts: {
        ndvi: number[]
        rain: number[]
        dates: string[]
    }
    alerts: Array<{
        type: string
        message: string
        severity: string
        time: string
    }>
    field_names: string[]
}

export function useDashboardStats() {
    const { data, error, isLoading } = useSWR<DashboardData>(`${NEXT_PUBLIC_API_URL}/dashboard`, fetcher, {
        refreshInterval: 60000
    })

    return {
        data,
        isLoading,
        isError: error
    }
}
