'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CloudOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HarvestValidationError, submitHarvest, type HarvestInput } from '@/services/harvest'

interface Props {
    fieldId: string
    fieldLabel: string
    /** Optional pre-fill (e.g. crop/season known from field state). */
    defaultSeasonYear?: number
}

type Outcome = { kind: 'submitted' } | { kind: 'queued' } | { kind: 'error'; message: string }

export function HarvestForm({ fieldId, fieldLabel, defaultSeasonYear }: Props) {
    const router = useRouter()
    const [seasonYear, setSeasonYear] = useState(String(defaultSeasonYear ?? new Date().getFullYear()))
    const [area, setArea] = useState('')
    const [yieldTonnes, setYieldTonnes] = useState('')
    const [harvestDate, setHarvestDate] = useState('')
    const [grade, setGrade] = useState('')
    const [delivered, setDelivered] = useState(false)
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [outcome, setOutcome] = useState<Outcome | null>(null)

    function validate(): string | null {
        const a = Number(area)
        const y = Number(yieldTonnes)
        if (!Number.isFinite(a) || a <= 0) return 'Area harvested must be greater than 0.'
        if (!Number.isFinite(y) || y <= 0) return 'Actual yield must be greater than 0.'
        const yr = Number(seasonYear)
        if (!Number.isInteger(yr) || yr < 2000 || yr > 2100) return 'Enter a valid season year.'
        return null
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        const localError = validate()
        if (localError) {
            setOutcome({ kind: 'error', message: localError })
            return
        }
        setSubmitting(true)
        setOutcome(null)

        const input: HarvestInput = {
            season_year: Number(seasonYear),
            area_harvested_ha: Number(area),
            actual_yield_tonnes: Number(yieldTonnes),
            harvest_date: harvestDate || null,
            quality_grade: grade.trim() || null,
            delivered_to_tenant: delivered,
            notes: notes.trim() || null,
        }

        try {
            const res = await submitHarvest(fieldId, fieldLabel, input)
            setOutcome({ kind: res.status === 'submitted' ? 'submitted' : 'queued' })
            if (res.status === 'submitted') {
                setTimeout(() => router.back(), 1200)
            }
        } catch (err) {
            const message =
                err instanceof HarvestValidationError
                    ? err.message
                    : 'Could not save the harvest. Please try again.'
            setOutcome({ kind: 'error', message })
        } finally {
            setSubmitting(false)
        }
    }

    if (outcome?.kind === 'submitted') {
        return (
            <Banner tone="ok" icon={<Check className="size-5" />}>
                Harvest recorded for {fieldLabel}.
            </Banner>
        )
    }
    if (outcome?.kind === 'queued') {
        return (
            <Banner tone="warn" icon={<CloudOff className="size-5" />}>
                Saved offline. This harvest will upload automatically when you’re back online.
            </Banner>
        )
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Season year">
                <Input
                    type="number"
                    inputMode="numeric"
                    value={seasonYear}
                    onChange={(e) => setSeasonYear(e.target.value)}
                    required
                />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Area harvested (ha)">
                    <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="e.g. 5.0"
                        required
                    />
                </Field>
                <Field label="Actual yield (tonnes)">
                    <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={yieldTonnes}
                        onChange={(e) => setYieldTonnes(e.target.value)}
                        placeholder="e.g. 12.5"
                        required
                    />
                </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Harvest date (optional)">
                    <Input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
                </Field>
                <Field label="Quality grade (optional)">
                    <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. A1" />
                </Field>
            </div>

            <label className="flex items-center gap-3 text-sm" style={{ color: 'var(--ee-text)' }}>
                <input
                    type="checkbox"
                    checked={delivered}
                    onChange={(e) => setDelivered(e.target.checked)}
                    className="size-4 accent-[var(--ee-primary)]"
                />
                Delivered to the contracting buyer
            </label>

            <Field label="Notes (optional)">
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-[16px] bg-[var(--ee-bg)] px-4 py-2 text-sm shadow-[var(--shadow-neu-inset)] outline-none"
                    style={{ color: 'var(--ee-text)' }}
                    placeholder="Anything notable about this harvest…"
                />
            </Field>

            {outcome?.kind === 'error' && (
                <p className="text-sm" style={{ color: '#c44' }}>
                    {outcome.message}
                </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? 'Saving…' : 'Record harvest'}
            </Button>
        </form>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--ee-muted)' }}>
                {label}
            </span>
            {children}
        </label>
    )
}

function Banner({
    tone,
    icon,
    children,
}: {
    tone: 'ok' | 'warn'
    icon: React.ReactNode
    children: React.ReactNode
}) {
    const color = tone === 'ok' ? 'var(--ee-primary)' : '#b8860b'
    return (
        <div
            className="flex items-center gap-3 rounded-[16px] px-4 py-4 text-sm shadow-[var(--shadow-neu)]"
            style={{ color, background: 'var(--ee-bg)' }}
        >
            {icon}
            <span style={{ color: 'var(--ee-text)' }}>{children}</span>
        </div>
    )
}
