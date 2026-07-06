'use client'

// Notification preferences — drives the centralized notification service.
// Renders from the backend catalog (GET /notifications/catalog), so new
// categories/channels appear here without frontend changes.

import React, { useState } from 'react'
import Link from 'next/link'
import { PageContainer } from '@/components/layout/PageContainer'
import { useNotificationPreferences } from '@/hooks/useNotifications'
import {
    CHANNEL_LABELS,
    GROUP_LABELS,
    formatHour,
    type NotificationPreferences,
} from '@/lib/notification-utils'

function Toggle({ checked, onChange, disabled }: {
    checked: boolean
    onChange: (v: boolean) => void
    disabled?: boolean
}) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-40"
            style={{ background: checked ? 'var(--ee-primary)' : 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
        >
            <span
                className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: checked ? '26px' : '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
            />
        </button>
    )
}

function SectionCard({ title, subtitle, children }: {
    title: string
    subtitle?: string
    children: React.ReactNode
}) {
    return (
        <div className="rounded-[20px] p-5 sm:p-6 mb-5" style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
            <h2 className="font-black text-lg mb-1" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                {title}
            </h2>
            {subtitle && (
                <p className="text-sm mb-4" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                    {subtitle}
                </p>
            )}
            {children}
        </div>
    )
}

function Row({ label, description, children }: {
    label: string
    description?: string
    children: React.ReactNode
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: '1px solid var(--ee-bg)' }}>
            <div className="min-w-0">
                <p className="font-bold text-sm" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>{label}</p>
                {description && <p className="text-xs mt-0.5" style={{ color: 'var(--ee-muted)' }}>{description}</p>}
            </div>
            {children}
        </div>
    )
}

export default function NotificationSettingsPage() {
    const { preferences, catalog, isLoading, error, save } = useNotificationPreferences()
    const [saving, setSaving] = useState(false)
    const [savedFlash, setSavedFlash] = useState(false)

    const update = async (partial: Partial<NotificationPreferences>) => {
        setSaving(true)
        try {
            await save(partial)
            setSavedFlash(true)
            setTimeout(() => setSavedFlash(false), 1500)
        } catch (e) {
            console.error('Failed to save notification preferences:', e)
        } finally {
            setSaving(false)
        }
    }

    if (isLoading || !preferences) {
        return (
            <PageContainer variant="reading">
                <p className="p-10 text-center font-bold" style={{ color: 'var(--ee-muted)' }}>
                    {error ? 'Could not load notification settings. Please try again.' : 'Loading notification settings…'}
                </p>
            </PageContainer>
        )
    }

    const groups = catalog?.groups ?? Object.keys(preferences.groups)
    const channels = (catalog?.channels ?? ['in_app', 'email', 'push']).filter((c) => c !== 'in_app')
    const categoriesByGroup = new Map<string, string[]>()
    for (const cat of catalog?.categories ?? []) {
        categoriesByGroup.set(cat.group, [...(categoriesByGroup.get(cat.group) ?? []), cat.label])
    }

    return (
        <PageContainer variant="reading">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/dashboard/settings" aria-label="Back to settings">
                    <span className="material-symbols-outlined" style={{ color: 'var(--ee-muted)' }}>arrow_back</span>
                </Link>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    Notifications
                </h1>
                {(saving || savedFlash) && (
                    <span className="text-xs font-bold ml-auto" style={{ color: 'var(--ee-primary)' }}>
                        {saving ? 'Saving…' : 'Saved ✓'}
                    </span>
                )}
            </div>

            <SectionCard title="Notifications" subtitle="One master switch for everything KurimaSense sends you.">
                <Row label="Enable notifications" description="Turn off to pause all channels and categories.">
                    <Toggle checked={preferences.enabled} onChange={(v) => void update({ enabled: v })} />
                </Row>
            </SectionCard>

            <SectionCard title="Channels" subtitle="Where notifications reach you. In-app is always on — it's your notification inbox.">
                {channels.map((ch) => (
                    <Row key={ch} label={CHANNEL_LABELS[ch] ?? ch}
                        description={ch === 'push' ? 'Delivered by the KurimaSense mobile app.' : undefined}>
                        <Toggle
                            checked={preferences.channels[ch] ?? false}
                            disabled={!preferences.enabled}
                            onChange={(v) => void update({ channels: { ...preferences.channels, [ch]: v } })}
                        />
                    </Row>
                ))}
            </SectionCard>

            <SectionCard title="Categories" subtitle="Choose which kinds of updates you want.">
                {groups.map((g) => (
                    <Row key={g} label={GROUP_LABELS[g] ?? g}
                        description={(categoriesByGroup.get(g) ?? []).slice(0, 3).join(' · ')}>
                        <Toggle
                            checked={preferences.groups[g] ?? true}
                            disabled={!preferences.enabled}
                            onChange={(v) => void update({ groups: { ...preferences.groups, [g]: v } })}
                        />
                    </Row>
                ))}
            </SectionCard>

            <SectionCard title="Quiet hours" subtitle="Emails and push wait until morning. Critical alerts (like frost) always come through.">
                <Row label="Enable quiet hours">
                    <Toggle
                        checked={preferences.quiet_hours.enabled}
                        disabled={!preferences.enabled}
                        onChange={(v) => void update({ quiet_hours: { ...preferences.quiet_hours, enabled: v } })}
                    />
                </Row>
                {preferences.quiet_hours.enabled && (
                    <div className="flex items-center gap-3 py-3">
                        {(['start', 'end'] as const).map((edge) => (
                            <label key={edge} className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--ee-text)' }}>
                                {edge === 'start' ? 'From' : 'Until'}
                                <select
                                    value={preferences.quiet_hours[edge]}
                                    onChange={(e) => void update({
                                        quiet_hours: { ...preferences.quiet_hours, [edge]: Number(e.target.value) },
                                    })}
                                    className="px-3 py-2 rounded-[12px] text-sm font-bold"
                                    style={{ background: 'var(--ee-bg)', color: 'var(--ee-text)', boxShadow: 'var(--shadow-neu-inset)', border: 'none' }}
                                >
                                    {Array.from({ length: 24 }, (_, h) => (
                                        <option key={h} value={h}>{formatHour(h)}</option>
                                    ))}
                                </select>
                            </label>
                        ))}
                    </div>
                )}
            </SectionCard>

            <SectionCard title="Farm summaries" subtitle="A recap of completed and upcoming work.">
                <div className="flex gap-2 flex-wrap py-2">
                    {(['weekly', 'monthly', 'both', 'off'] as const).map((freq) => {
                        const active = preferences.summary_frequency === freq
                        return (
                            <button
                                key={freq}
                                onClick={() => void update({ summary_frequency: freq })}
                                disabled={!preferences.enabled}
                                className="px-4 py-2 rounded-full text-sm font-bold capitalize disabled:opacity-40"
                                style={{
                                    background: active ? 'var(--ee-primary)' : 'var(--ee-bg)',
                                    color: active ? '#fff' : 'var(--ee-muted)',
                                    boxShadow: active ? 'var(--shadow-neu)' : 'var(--shadow-neu-inset)',
                                }}
                            >
                                {freq}
                            </button>
                        )
                    })}
                </div>
            </SectionCard>
        </PageContainer>
    )
}
