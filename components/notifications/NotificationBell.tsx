'use client'

// Notification bell + dropdown inbox for the dashboard header. Replaces the
// previous decorative bell with the live centralized notification service.

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import {
    badgeLabel,
    categoryIcon,
    severityAccent,
    timeAgo,
    type AppNotification,
} from '@/lib/notification-utils'

function NotificationRow({ item, onOpen }: { item: AppNotification; onOpen: (n: AppNotification) => void }) {
    const unread = !item.read_at
    return (
        <button
            onClick={() => onOpen(item)}
            className="w-full text-left flex gap-3 p-3 rounded-[14px] transition-colors hover:opacity-90"
            style={{ background: unread ? 'var(--ee-bg)' : 'transparent' }}
        >
            <span
                className="material-symbols-outlined flex-shrink-0 mt-0.5"
                style={{ color: severityAccent(item.severity), fontSize: '20px' }}
            >
                {categoryIcon(item.category)}
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                    <span
                        className={`text-sm truncate ${unread ? 'font-black' : 'font-bold'}`}
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                    >
                        {item.title}
                    </span>
                    <span className="text-[11px] font-bold flex-shrink-0" style={{ color: 'var(--ee-muted)' }}>
                        {timeAgo(item.created_at)}
                    </span>
                </span>
                <span
                    className="block text-xs mt-0.5 line-clamp-2"
                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                >
                    {item.body}
                </span>
            </span>
            {unread && (
                <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                    style={{ background: severityAccent(item.severity) }}
                />
            )}
        </button>
    )
}

export default function NotificationBell() {
    const router = useRouter()
    const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications()
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on outside click / Escape.
    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('mousedown', onClick)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onClick)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    const openNotification = (n: AppNotification) => {
        if (!n.read_at) void markRead(n.id)
        setOpen(false)
        if (n.action_url && n.action_url.startsWith('/')) router.push(n.action_url)
    }

    const badge = badgeLabel(unreadCount)

    return (
        <div ref={containerRef} className="relative">
            <button
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                onClick={() => setOpen((v) => !v)}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 active:shadow-[var(--shadow-neu-inset)]"
                style={{ backgroundColor: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu)' }}
            >
                <span className="relative">
                    <span className="material-symbols-outlined" style={{ color: 'var(--ee-text)', fontSize: '20px' }}>
                        notifications
                    </span>
                    {badge && (
                        <span
                            className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                            style={{ backgroundColor: '#dc2626' }}
                        >
                            {badge}
                        </span>
                    )}
                </span>
            </button>

            {open && (
                <div
                    className="absolute right-0 mt-3 w-[min(92vw,380px)] rounded-[20px] p-3 z-50"
                    style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}
                >
                    <div className="flex items-center justify-between px-2 pb-2">
                        <p className="font-black text-sm" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                            Notifications
                        </p>
                        <div className="flex items-center gap-3">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => void markAllRead()}
                                    className="text-xs font-bold"
                                    style={{ color: 'var(--ee-primary)' }}
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => { setOpen(false); router.push('/dashboard/settings/notifications') }}
                                aria-label="Notification settings"
                                className="material-symbols-outlined"
                                style={{ color: 'var(--ee-muted)', fontSize: '18px' }}
                            >
                                tune
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-1">
                        {isLoading && notifications.length === 0 && (
                            <p className="text-sm p-4 text-center" style={{ color: 'var(--ee-muted)' }}>Loading…</p>
                        )}
                        {!isLoading && notifications.length === 0 && (
                            <div className="p-6 text-center">
                                <span className="material-symbols-outlined mb-2" style={{ color: 'var(--ee-muted)', fontSize: '28px' }}>
                                    notifications_off
                                </span>
                                <p className="text-sm font-bold" style={{ color: 'var(--ee-muted)' }}>
                                    You&apos;re all caught up
                                </p>
                            </div>
                        )}
                        {notifications.map((n) => (
                            <NotificationRow key={n.id} item={n} onOpen={openNotification} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
