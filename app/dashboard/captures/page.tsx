'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, CloudOff, Loader2, RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'
import { discard, getItems, retryNow, runSync, subscribeOutbox } from '@/lib/offline/outbox'
import type { OutboxItem } from '@/lib/offline/types'

const KIND_LABEL: Record<string, string> = {
    harvest: 'Harvest',
    field_boundary: 'New field',
    crop_planting: 'Crop / planting',
    input_log: 'Input',
    scouting: 'Scouting',
    task: 'Task',
}

export default function CapturesPage() {
    const [items, setItems] = useState<OutboxItem[]>([])
    const [busy, setBusy] = useState(false)

    const refresh = useCallback(async () => {
        setItems(await getItems())
    }, [])

    useEffect(() => {
        void refresh()
        // Re-pull whenever the pending count changes (enqueue / sync / discard).
        const unsub = subscribeOutbox(() => void refresh())
        return () => unsub()
    }, [refresh])

    async function onSyncAll() {
        setBusy(true)
        try {
            await runSync()
            await refresh()
        } finally {
            setBusy(false)
        }
    }

    const pending = items.filter((i) => i.status === 'pending')
    const failed = items.filter((i) => i.status === 'failed')

    return (
        <PageContainer className="px-4 py-6 space-y-6">
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-display)' }}>
                        Pending uploads
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--ee-muted)' }}>
                        Captures waiting to reach the server. They upload automatically on reconnect.
                    </p>
                </div>
                {items.length > 0 && (
                    <Button variant="outline" size="sm" onClick={onSyncAll} disabled={busy}>
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        Sync now
                    </Button>
                )}
            </header>

            {items.length === 0 && (
                <div className="flex flex-col items-center gap-3 rounded-[20px] px-6 py-16 text-center shadow-[var(--shadow-neu)]" style={{ background: 'var(--ee-bg)' }}>
                    <CheckCircle2 className="size-8" style={{ color: 'var(--ee-primary)' }} />
                    <p className="text-sm" style={{ color: 'var(--ee-muted)' }}>Everything’s synced — nothing waiting to upload.</p>
                </div>
            )}

            {pending.length > 0 && (
                <Section title={`Waiting (${pending.length})`}>
                    {pending.map((it) => (
                        <Row key={it.id} item={it} onRetry={() => retryNow(it.id)} onDiscard={() => discard(it.id)} />
                    ))}
                </Section>
            )}

            {failed.length > 0 && (
                <Section title={`Needs attention (${failed.length})`}>
                    {failed.map((it) => (
                        <Row key={it.id} item={it} onRetry={() => retryNow(it.id)} onDiscard={() => discard(it.id)} failed />
                    ))}
                </Section>
            )}
        </PageContainer>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ee-muted)' }}>{title}</h2>
            <div className="space-y-3">{children}</div>
        </section>
    )
}

function Row({
    item,
    onRetry,
    onDiscard,
    failed,
}: {
    item: OutboxItem
    onRetry: () => void
    onDiscard: () => void
    failed?: boolean
}) {
    return (
        <div className="flex items-start justify-between gap-3 rounded-[16px] px-4 py-3 shadow-[var(--shadow-neu)]" style={{ background: 'var(--ee-bg)' }}>
            <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                    <CloudOff className="size-3.5 shrink-0" style={{ color: failed ? '#c44' : '#b8860b' }} />
                    <span className="truncate text-sm font-medium" style={{ color: 'var(--ee-text)' }}>{item.label}</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--ee-muted)' }}>
                    {KIND_LABEL[item.kind] ?? item.kind}
                    {item.attempts > 0 && ` · ${item.attempts} attempt${item.attempts > 1 ? 's' : ''}`}
                </div>
                {failed && item.lastError && (
                    <div className="text-xs" style={{ color: '#c44' }}>{item.lastError}</div>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="Retry now" onClick={onRetry}>
                    <RefreshCw className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Discard" onClick={onDiscard}>
                    <Trash2 className="size-4" style={{ color: '#c44' }} />
                </Button>
            </div>
        </div>
    )
}
