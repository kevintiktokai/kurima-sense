'use client'

// useNotifications — SWR hooks for the centralized notification service
// (inbox + unread badge + preferences). Polls gently so the badge stays live
// without a websocket; native push will complement this on mobile.

import useSWR, { mutate as globalMutate } from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'
import type {
    AppNotification,
    NotificationCategory,
    NotificationPreferences,
} from '@/lib/notification-utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const INBOX_KEY = 'notifications:inbox'
const PREFS_KEY = 'notifications:preferences'
const CATALOG_KEY = 'notifications:catalog'

interface InboxResponse {
    notifications: AppNotification[]
    unread_count: number
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
    const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
    return fetch(`${API_BASE_URL}${path}`, { ...init, headers })
}

async function fetchInbox(): Promise<InboxResponse> {
    const res = await authedFetch('/notifications?limit=30')
    if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`)
    return res.json()
}

export function useNotifications() {
    const { data, error, isLoading, mutate } = useSWR<InboxResponse>(INBOX_KEY, fetchInbox, {
        refreshInterval: 90_000,
        revalidateOnFocus: true,
        dedupingInterval: 30_000,
        shouldRetryOnError: false,
    })

    const markRead = async (id: string) => {
        // Optimistic: clear locally, then confirm server-side.
        await mutate(
            (current) => current && {
                unread_count: Math.max(0, current.unread_count - 1),
                notifications: current.notifications.map((n) =>
                    n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n,
                ),
            },
            { revalidate: false },
        )
        try { await authedFetch(`/notifications/${id}/read`, { method: 'POST' }) } catch { /* next poll reconciles */ }
        void mutate()
    }

    const markAllRead = async () => {
        await mutate(
            (current) => current && {
                unread_count: 0,
                notifications: current.notifications.map((n) =>
                    n.read_at ? n : { ...n, read_at: new Date().toISOString() },
                ),
            },
            { revalidate: false },
        )
        try { await authedFetch('/notifications/read-all', { method: 'POST' }) } catch { /* next poll reconciles */ }
        void mutate()
    }

    return {
        notifications: data?.notifications ?? [],
        unreadCount: data?.unread_count ?? 0,
        isLoading,
        error: error as Error | undefined,
        refresh: () => { void mutate() },
        markRead,
        markAllRead,
    }
}

export function invalidateNotifications(): void {
    void globalMutate(INBOX_KEY)
}

// ── preferences ──────────────────────────────────────────────────────────────

async function fetchPreferences(): Promise<NotificationPreferences> {
    const res = await authedFetch('/notifications/preferences')
    if (!res.ok) throw new Error(`Failed to load preferences (${res.status})`)
    return (await res.json()).preferences as NotificationPreferences
}

async function fetchCatalog(): Promise<{ groups: string[]; channels: string[]; categories: NotificationCategory[] }> {
    const res = await authedFetch('/notifications/catalog')
    if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`)
    return res.json()
}

export function useNotificationPreferences() {
    const prefs = useSWR(PREFS_KEY, fetchPreferences, { revalidateOnFocus: false })
    const catalog = useSWR(CATALOG_KEY, fetchCatalog, {
        revalidateOnFocus: false,
        dedupingInterval: 3_600_000, // static registry
    })

    const save = async (partial: Partial<NotificationPreferences>) => {
        const res = await authedFetch('/notifications/preferences', {
            method: 'PUT',
            body: JSON.stringify(partial),
        })
        if (!res.ok) throw new Error(`Could not save preferences (${res.status})`)
        const saved = (await res.json()).preferences as NotificationPreferences
        await prefs.mutate(saved, { revalidate: false })
        return saved
    }

    return {
        preferences: prefs.data,
        catalog: catalog.data,
        isLoading: prefs.isLoading || catalog.isLoading,
        error: (prefs.error || catalog.error) as Error | undefined,
        save,
    }
}
