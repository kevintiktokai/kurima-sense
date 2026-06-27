'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CloudOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VoiceInput } from '@/components/capture/VoiceInput'
import {
    submitTask,
    TaskValidationError,
    type ActivityType,
    type Priority,
} from '@/services/taskCapture'

interface Props {
    fieldId: string
    fieldLabel: string
}

type Outcome = { kind: 'submitted' } | { kind: 'queued' } | { kind: 'error'; message: string }

const ACTIVITIES: ActivityType[] = ['irrigation', 'spraying', 'scouting', 'harvest', 'fertilize', 'custom']
const PRIORITIES: Priority[] = ['urgent', 'high', 'normal', 'low']

const selectClass =
    'h-10 w-full rounded-[16px] bg-[var(--ee-bg)] px-3 text-sm shadow-[var(--shadow-neu-inset)] outline-none'

export function TaskForm({ fieldId, fieldLabel }: Props) {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [activity, setActivity] = useState<ActivityType>('custom')
    const [priority, setPriority] = useState<Priority>('normal')
    const [taskDate, setTaskDate] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [outcome, setOutcome] = useState<Outcome | null>(null)

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!title.trim()) {
            setOutcome({ kind: 'error', message: 'Give the task a title.' })
            return
        }
        setSubmitting(true)
        setOutcome(null)
        try {
            const res = await submitTask(fieldLabel, {
                title: title.trim(),
                activity_type: activity,
                priority,
                field_id: fieldId,
                task_date: taskDate || null,
            })
            setOutcome({ kind: res.status === 'submitted' ? 'submitted' : 'queued' })
            if (res.status === 'submitted') setTimeout(() => router.back(), 1200)
        } catch (err) {
            const message =
                err instanceof TaskValidationError ? err.message : 'Could not save the task. Please try again.'
            setOutcome({ kind: 'error', message })
        } finally {
            setSubmitting(false)
        }
    }

    if (outcome?.kind === 'submitted') {
        return <Banner tone="ok" icon={<Check className="size-5" />}>Task added for {fieldLabel}.</Banner>
    }
    if (outcome?.kind === 'queued') {
        return (
            <Banner tone="warn" icon={<CloudOff className="size-5" />}>
                Saved offline. It will upload automatically when you’re back online.
            </Banner>
        )
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Task">
                <div className="flex items-center gap-2">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Spray for armyworm" required />
                    <VoiceInput onTranscript={(t) => setTitle(t)} />
                </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Activity">
                    <select className={selectClass} style={{ color: 'var(--ee-text)' }} value={activity} onChange={(e) => setActivity(e.target.value as ActivityType)}>
                        {ACTIVITIES.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Priority">
                    <select className={selectClass} style={{ color: 'var(--ee-text)' }} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                        {PRIORITIES.map((p) => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </Field>
            </div>

            <Field label="Due date (optional)">
                <Input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
            </Field>

            {outcome?.kind === 'error' && <p className="text-sm" style={{ color: '#c44' }}>{outcome.message}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? 'Saving…' : 'Add task'}
            </Button>
        </form>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--ee-muted)' }}>{label}</span>
            {children}
        </label>
    )
}

function Banner({ tone, icon, children }: { tone: 'ok' | 'warn'; icon: React.ReactNode; children: React.ReactNode }) {
    const color = tone === 'ok' ? 'var(--ee-primary)' : '#b8860b'
    return (
        <div className="flex items-center gap-3 rounded-[16px] px-4 py-4 text-sm shadow-[var(--shadow-neu)]" style={{ color, background: 'var(--ee-bg)' }}>
            {icon}
            <span style={{ color: 'var(--ee-text)' }}>{children}</span>
        </div>
    )
}
