'use client'

/**
 * GrowerForm — one form for both create and edit, rendered as a centered card
 * overlay (mirrors the consumer field page's modal pattern; tokens only, no
 * dependency). Name required; phone/email/notes optional. Coordinates are
 * deferred (not in this PR). Validation + payload shaping come from
 * lib/portfolio-utils so they're unit-tested.
 */

import { useState } from 'react'
import {
    validateGrowerForm, buildGrowerPayload,
    type Grower, type GrowerFormValues, type GrowerPayload,
} from '@/lib/portfolio-utils'

export interface GrowerFormProps {
    /** Present = edit mode (prefills + "Save"); absent = create mode. */
    grower?: Grower
    onSubmit: (payload: GrowerPayload) => Promise<void>
    onClose: () => void
}

export function GrowerForm({ grower, onSubmit, onClose }: GrowerFormProps) {
    const [values, setValues] = useState<GrowerFormValues>({
        name: grower?.name ?? '',
        phone: grower?.phone ?? '',
        email: grower?.email ?? '',
        notes: grower?.notes ?? '',
    })
    const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [pending, setPending] = useState(false)

    const set = (k: keyof GrowerFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setValues((v) => ({ ...v, [k]: e.target.value }))

    const handleSubmit = async () => {
        const v = validateGrowerForm(values)
        setErrors(v.errors)
        if (!v.valid) return
        setSubmitError(null)
        setPending(true)
        try {
            await onSubmit(buildGrowerPayload(values))
            onClose()
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Something went wrong')
        } finally {
            setPending(false)
        }
    }

    const inputStyle = {
        background: 'var(--ee-bg)', color: 'var(--ee-text)',
        fontFamily: 'var(--font-body)', boxShadow: 'var(--shadow-neu-inset)', border: 'none',
    } as const

    return (
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
            style={{ background: 'rgba(45,58,48,0.4)', backdropFilter: 'blur(8px)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="w-full max-w-md p-7 rounded-[24px]" style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        {grower ? 'Edit grower' : 'Add grower'}
                    </h3>
                    <button onClick={onClose} className="p-1" aria-label="Close">
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-muted)' }}>close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                            Name <span style={{ color: 'var(--ee-primary)' }}>*</span>
                        </label>
                        <input
                            type="text" value={values.name} onChange={set('name')} autoFocus
                            className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                            style={inputStyle} placeholder="Grower name"
                        />
                        {errors.name && <p className="text-xs font-bold mt-1" style={{ color: '#dc2626' }}>{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                            Phone <span style={{ fontWeight: 400, textTransform: 'lowercase' }}>(optional)</span>
                        </label>
                        <input
                            type="text" value={values.phone} onChange={set('phone')}
                            className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                            style={inputStyle} placeholder="+263…"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                            Email <span style={{ fontWeight: 400, textTransform: 'lowercase' }}>(optional)</span>
                        </label>
                        <input
                            type="email" value={values.email} onChange={set('email')}
                            className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                            style={inputStyle} placeholder="name@example.com"
                        />
                        {errors.email && <p className="text-xs font-bold mt-1" style={{ color: '#dc2626' }}>{errors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                            Notes <span style={{ fontWeight: 400, textTransform: 'lowercase' }}>(optional)</span>
                        </label>
                        <textarea
                            value={values.notes} onChange={set('notes')} rows={2}
                            className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                            style={inputStyle} placeholder="Contract details, location notes…"
                        />
                    </div>

                    {submitError && (
                        <div className="p-3 rounded-[12px] text-sm font-bold" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
                            {submitError}
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-[16px] font-bold transition-colors"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={pending}
                            className="flex-1 py-3 rounded-[16px] font-black transition-all disabled:opacity-50"
                            style={{ background: 'var(--ee-primary)', color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}
                        >
                            {pending ? 'Saving…' : grower ? 'Save' : 'Add grower'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default GrowerForm
