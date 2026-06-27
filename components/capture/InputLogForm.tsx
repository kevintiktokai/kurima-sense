'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CloudOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VoiceInput } from '@/components/capture/VoiceInput'
import { extractQuantity } from '@/lib/voice/parse'
import { InputLogValidationError, submitInputLog } from '@/services/inputLog'

interface Props {
    fieldId: string
    fieldLabel: string
}

type Outcome = { kind: 'submitted' } | { kind: 'queued' } | { kind: 'error'; message: string }

export function InputLogForm({ fieldId, fieldLabel }: Props) {
    const router = useRouter()
    const [inputType, setInputType] = useState('')
    const [quantity, setQuantity] = useState('')
    const [unit, setUnit] = useState('')
    const [heard, setHeard] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [outcome, setOutcome] = useState<Outcome | null>(null)

    // Voice: "applied 50 kg of compound D" → quantity 50, unit kg, type "compound D".
    function onTranscript(text: string) {
        setHeard(text)
        const { quantity: q, unit: u } = extractQuantity(text)
        if (q != null) setQuantity(String(q))
        if (u) setUnit(u)
        const ofMatch = /\bof\s+(.+)$/i.exec(text)
        if (ofMatch && !inputType) setInputType(ofMatch[1].trim())
    }

    function validate(): string | null {
        if (!inputType.trim()) return 'What input was applied? (e.g. Compound D, Urea)'
        const q = Number(quantity)
        if (!Number.isFinite(q) || q <= 0) return 'Quantity must be greater than 0.'
        if (!unit.trim()) return 'Add a unit (kg, L, bags…).'
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
        try {
            const res = await submitInputLog(fieldLabel, {
                field_id: fieldId,
                input_type: inputType.trim(),
                quantity: Number(quantity),
                unit: unit.trim(),
            })
            setOutcome({ kind: res.status === 'submitted' ? 'submitted' : 'queued' })
            if (res.status === 'submitted') setTimeout(() => router.back(), 1200)
        } catch (err) {
            const message =
                err instanceof InputLogValidationError
                    ? err.message
                    : 'Could not save the input. Please try again.'
            setOutcome({ kind: 'error', message })
        } finally {
            setSubmitting(false)
        }
    }

    if (outcome?.kind === 'submitted') {
        return <Banner tone="ok" icon={<Check className="size-5" />}>Input logged for {fieldLabel}.</Banner>
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
            <div className="flex items-center gap-3 rounded-[16px] px-4 py-3 shadow-[var(--shadow-neu-inset)]" style={{ background: 'var(--ee-bg)' }}>
                <VoiceInput onTranscript={onTranscript} />
                <span className="text-sm" style={{ color: 'var(--ee-muted)' }}>
                    {heard ? `“${heard}”` : 'Tap the mic and say e.g. “applied 50 kg of Compound D”'}
                </span>
            </div>

            <Field label="Input applied">
                <Input value={inputType} onChange={(e) => setInputType(e.target.value)} placeholder="e.g. Compound D, Urea, Glyphosate" required />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity">
                    <Input type="number" inputMode="decimal" step="0.01" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 50" required />
                </Field>
                <Field label="Unit">
                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, L, bags" required />
                </Field>
            </div>

            {outcome?.kind === 'error' && <p className="text-sm" style={{ color: '#c44' }}>{outcome.message}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? 'Saving…' : 'Log input'}
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
