'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CloudOff } from 'lucide-react'

import { initOutboxAutoSync, subscribeOutbox } from '@/lib/offline/outbox'

/**
 * Mounts the offline-capture auto-sync (drains the outbox on reconnect / focus /
 * interval) and shows an unobtrusive badge while captures are waiting to upload.
 * Renders nothing when the outbox is empty.
 */
export function OutboxSyncProvider() {
    const [count, setCount] = useState(0)

    useEffect(() => {
        const stop = initOutboxAutoSync()
        const unsub = subscribeOutbox(setCount)
        return () => {
            stop()
            unsub()
        }
    }, [])

    if (count <= 0) return null

    return (
        <Link
            href="/dashboard/captures"
            role="status"
            aria-live="polite"
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium shadow-[var(--shadow-neu)] transition-all hover:opacity-90"
            style={{ background: 'var(--ee-bg)', color: 'var(--ee-text)' }}
        >
            <CloudOff className="size-3.5" style={{ color: '#b8860b' }} />
            {count} {count === 1 ? 'entry' : 'entries'} waiting to sync
        </Link>
    )
}
