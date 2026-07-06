// Pure helpers for the notification center + preferences UI.
// No 'use client' — imported by components and by node:test.

export type NotificationSeverity = 'info' | 'warning' | 'critical'

export interface AppNotification {
    id: string
    category: string
    severity: NotificationSeverity
    title: string
    body: string
    field_id?: string | null
    action_url?: string | null
    data?: Record<string, unknown>
    source?: string
    created_at: string
    read_at?: string | null
}

export interface NotificationPreferences {
    enabled: boolean
    timezone: string
    channels: Record<string, boolean>
    groups: Record<string, boolean>
    quiet_hours: { enabled: boolean; start: number; end: number }
    summary_frequency: 'weekly' | 'monthly' | 'both' | 'off'
}

export interface NotificationCategory {
    key: string
    group: string
    label: string
    default_severity: NotificationSeverity
    default_channels: string[]
    description: string
}

/** Compact relative age for inbox rows: "now", "5m", "3h", "2d", else a date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
    const then = new Date(iso)
    if (isNaN(then.getTime())) return ''
    const seconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000))
    if (seconds < 60) return 'now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`
    return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** Severity accents aligned with the existing --ee design tokens. */
export function severityAccent(severity: NotificationSeverity): string {
    switch (severity) {
        case 'critical': return '#dc2626'
        case 'warning': return 'var(--ee-sun, #d97706)'
        default: return 'var(--ee-primary, #2F6B3C)'
    }
}

/** Material Symbols icon per category (falls back per group semantics). */
export function categoryIcon(category: string): string {
    if (category.startsWith('weather_frost')) return 'ac_unit'
    if (category.startsWith('weather_heat')) return 'thermostat'
    if (category.startsWith('weather_wind')) return 'air'
    if (category.startsWith('weather_dry')) return 'water_drop'
    if (category.startsWith('weather')) return 'thunderstorm'
    if (category === 'irrigation') return 'sprinkler'
    if (category.startsWith('fertilizer')) return 'compost'
    if (category.startsWith('spraying')) return 'sanitizer'
    if (category.startsWith('harvest')) return 'agriculture'
    if (category.startsWith('task')) return 'checklist'
    if (category.startsWith('summary')) return 'insights'
    if (category === 'subscription' || category === 'account') return 'manage_accounts'
    return 'notifications'
}

/** Badge text: cap at 9+ so the bubble never stretches. */
export function badgeLabel(unread: number): string {
    if (unread <= 0) return ''
    return unread > 9 ? '9+' : String(unread)
}

export const GROUP_LABELS: Record<string, string> = {
    planner: 'Planner & tasks',
    weather: 'Weather alerts',
    advisory: 'Smart recommendations',
    summary: 'Summaries',
    account: 'Account & billing',
}

export const CHANNEL_LABELS: Record<string, string> = {
    in_app: 'In-app',
    email: 'Email',
    push: 'Push (mobile)',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
}

/** Hour options for the quiet-hours selects: "20:00" etc. */
export function formatHour(hour: number): string {
    const h = ((hour % 24) + 24) % 24
    return `${String(h).padStart(2, '0')}:00`
}
