'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, ReactNode } from 'react'
import { api } from '@/services/api'
import { FieldData } from '@/components/dashboard/types'
import { useAuth } from './AuthProvider'

interface MarketPriceEntry {
    price: number
    unit: string
    trend: string
    last_updated?: string
}

interface MarketData {
    region: string
    prices: Record<string, MarketPriceEntry>
    currency: string
    timestamp?: string
}

interface DashboardDataContextType {
    fields: FieldData[]
    marketData: MarketData | null
    dashboardStats: any
    loading: boolean
    /** True when the backend could not be reached / errored on the last fetch.
     * Consumers must render an error state — NOT an empty farm. A 502 shown as
     * "0 fields" reads as data loss to a farmer. */
    backendError: boolean
    refreshFields: () => Promise<void>
    refreshAll: () => Promise<void>
}

const DashboardDataContext = createContext<DashboardDataContextType>({
    fields: [],
    marketData: null,
    dashboardStats: null,
    loading: true,
    backendError: false,
    refreshFields: async () => {},
    refreshAll: async () => {},
})

export const useDashboardData = () => {
    const context = useContext(DashboardDataContext)
    if (!context) {
        throw new Error('useDashboardData must be used within DashboardDataProvider')
    }
    return context
}

// Staleness threshold — only refetch if data is older than this
const STALE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

export function DashboardDataProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [fields, setFields] = useState<FieldData[]>([])
    const [marketData, setMarketData] = useState<MarketData | null>(null)
    const [dashboardStats, setDashboardStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [backendError, setBackendError] = useState(false)

    const lastFetchedAt = useRef<number>(0)
    const initializedRef = useRef(false)
    const fetchingRef = useRef(false)

    const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
        if (!user || fetchingRef.current) return
        fetchingRef.current = true

        // Only show loading on first fetch
        if (!opts?.silent && !initializedRef.current) {
            setLoading(true)
        }

        try {
            // Try the combined endpoint first (1 request instead of 3)
            const initData = await api.getDashboardInit()

            if (initData) {
                setFields(Array.isArray(initData.fields) ? initData.fields : [])
                setDashboardStats(initData.stats)
                setMarketData(initData.market)
                setBackendError(false)
            } else {
                // getDashboardInit returned null — either the combined route is
                // missing (older backend) or the backend is down. The strict
                // fields call disambiguates: it THROWS on failure instead of
                // returning [], so an outage becomes an error state rather than
                // an empty farm.
                const fieldsData = await api.getFields(true, { throwOnError: true })
                const [statsData, market] = await Promise.all([
                    api.getDashboardStats(),
                    api.getMarketPrices('Zimbabwe'),
                ])
                setFields(fieldsData)
                setDashboardStats(statsData)
                setMarketData(market)
                setBackendError(false)
            }

            lastFetchedAt.current = Date.now()
            initializedRef.current = true
        } catch (e) {
            console.error('[DashboardData] fetch error:', e)
            // Keep whatever fields we already have (stale beats a fake empty
            // farm) and surface the failure to the UI.
            setBackendError(true)
        } finally {
            setLoading(false)
            fetchingRef.current = false
        }
    }, [user])

    const refreshFields = useCallback(async () => {
        if (!user) return
        try {
            // force=true bypasses the in-memory cache so a just-saved field is
            // never hidden behind a stale 'fields' entry. Strict mode: a failed
            // refresh must not silently blank the field list.
            const fieldsData = await api.getFields(true, { throwOnError: true })
            setFields(fieldsData)
            setBackendError(false)
        } catch (e) {
            console.error('[DashboardData] refreshFields error:', e)
            setBackendError(true)
        }
    }, [user])

    // Initial fetch when user is available
    useEffect(() => {
        if (user) {
            fetchAll()
        }
    }, [user, fetchAll])

    // Smart refresh on tab visibility change
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState !== 'visible') return
            if (!initializedRef.current) return

            const age = Date.now() - lastFetchedAt.current
            if (age > STALE_THRESHOLD) {
                fetchAll({ silent: true })
            }
        }

        document.addEventListener('visibilitychange', handleVisibility)
        return () => document.removeEventListener('visibilitychange', handleVisibility)
    }, [fetchAll])

    const value = useMemo(
        () => ({
            fields,
            marketData,
            dashboardStats,
            loading,
            backendError,
            refreshFields,
            refreshAll: fetchAll,
        }),
        [fields, marketData, dashboardStats, loading, backendError, refreshFields, fetchAll]
    )

    return (
        <DashboardDataContext.Provider value={value}>
            {children}
        </DashboardDataContext.Provider>
    )
}
