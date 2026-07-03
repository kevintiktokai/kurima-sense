'use client'

/**
 * FieldActivityTimeline — the permanent professional activity record for a
 * field: agronomist visits, inspections, recommendations, observations and
 * consultations, newest first, plus an inline "Log activity" form.
 *
 * Data + mutations come from hooks/useTeam (institutional operations backend).
 * The card renders nothing while loading and an inviting empty state once
 * loaded, so mounting it on any field page is purely additive.
 */

import { useState } from 'react'
import {
    useFieldActivities, createActivity, deleteActivity, refreshFieldActivities,
    ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS,
    type ActivityType, type FieldActivity, type CreateActivityPayload,
} from '@/hooks/useTeam'

const inputStyle = {
    background: 'var(--ee-bg)', color: 'var(--ee-text)',
    fontFamily: 'var(--font-body)', boxShadow: 'var(--shadow-neu-inset)', border: 'none',
} as const

function LogForm({ fieldId, onDone, onCancel }: { fieldId: string; onDone: () => void; onCancel: () => void }) {
    const [type, setType] = useState<ActivityType>('visit')
    const [title, setTitle] = useState('')
    const [notes, setNotes] = useState('')
    const [recommendation, setRecommendation] = useState('')
    const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [attachGps, setAttachGps] = useState(false)
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submit = async () => {
        if (!title.trim()) { setError('A short title is required'); return }
        setPending(true)
        setError(null)
        try {
            const payload: CreateActivityPayload = {
                activity_type: type,
                title: title.trim(),
                notes: notes.trim() || undefined,
                recommendation: recommendation.trim() || undefined,
                visit_date: visitDate || undefined,
            }
            if (attachGps && typeof navigator !== 'undefined' && navigator.geolocation) {
                try {
                    const pos = await new Promise<GeolocationPosition>((res, rej) =>
                        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }))
                    payload.lat = pos.coords.latitude
                    payload.lon = pos.coords.longitude
                } catch { /* GPS optional — proceed without it */ }
            }
            await createActivity(fieldId, payload)
            refreshFieldActivities(fieldId)
            onDone()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to log activity')
            setPending(false)
        }
    }

    return (
        <div className="p-5 rounded-[20px] space-y-3.5" style={{ background: 'var(--ee-bg)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                        Activity type
                    </label>
                    <select value={type} onChange={(e) => setType(e.target.value as ActivityType)}
                        className="w-full px-3.5 py-2.5 rounded-[12px] text-sm font-bold"
                        style={{ ...inputStyle, background: 'var(--ee-surface)' }}>
                        {(Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]).map((t) => (
                            <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                        Date
                    </label>
                    <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                        className="w-full px-3.5 py-2.5 rounded-[12px] text-sm font-bold"
                        style={{ ...inputStyle, background: 'var(--ee-surface)' }} />
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                    Title <span style={{ color: 'var(--ee-primary)' }}>*</span>
                </label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
                    placeholder="e.g. Week 6 inspection — armyworm pressure on west edge"
                    className="w-full px-3.5 py-2.5 rounded-[12px] text-sm"
                    style={{ ...inputStyle, background: 'var(--ee-surface)' }} />
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                    Observations / notes
                </label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={4000}
                    placeholder="What you saw in the field…"
                    className="w-full px-3.5 py-2.5 rounded-[12px] text-sm resize-none"
                    style={{ ...inputStyle, background: 'var(--ee-surface)' }} />
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                    Recommendation to the farmer
                </label>
                <textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} rows={2} maxLength={4000}
                    placeholder="e.g. Apply Belt 480SC at 0.1 L/ha within 3 days; re-scout after 7 days"
                    className="w-full px-3.5 py-2.5 rounded-[12px] text-sm resize-none"
                    style={{ ...inputStyle, background: 'var(--ee-surface)' }} />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer" style={{ color: 'var(--ee-muted)' }}>
                <input type="checkbox" checked={attachGps} onChange={(e) => setAttachGps(e.target.checked)} />
                Attach my GPS location
            </label>

            {error && <p className="text-sm font-bold" style={{ color: '#dc2626' }}>{error}</p>}

            <div className="flex gap-2 pt-1">
                <button onClick={onCancel} disabled={pending}
                    className="flex-1 py-2.5 rounded-full text-sm font-bold"
                    style={{ color: 'var(--ee-muted)' }}>
                    Cancel
                </button>
                <button onClick={submit} disabled={pending}
                    className="flex-1 py-2.5 rounded-full text-sm font-black disabled:opacity-50"
                    style={{ background: 'var(--ee-primary)', color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}>
                    {pending ? 'Saving…' : 'Save to field record'}
                </button>
            </div>
        </div>
    )
}

function ActivityRow({ activity, canDelete, onDelete }: {
    activity: FieldActivity; canDelete: boolean; onDelete: () => void
}) {
    const [confirming, setConfirming] = useState(false)
    const icon = ACTIVITY_TYPE_ICONS[activity.activity_type] ?? 'more_horiz'
    const dateLabel = activity.visit_date
        ? new Date(activity.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : ''

    return (
        <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'var(--ee-bg)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--ee-primary)' }}>{icon}</span>
            </div>
            <div className="min-w-0 flex-1 pb-4">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold text-sm leading-snug" style={{ color: 'var(--ee-text)' }}>{activity.title}</p>
                    {canDelete && (
                        confirming ? (
                            <span className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={onDelete} className="text-[10px] font-black uppercase" style={{ color: '#dc2626' }}>Delete</button>
                                <button onClick={() => setConfirming(false)} className="text-[10px] font-bold" style={{ color: 'var(--ee-muted)' }}>Keep</button>
                            </span>
                        ) : (
                            <button onClick={() => setConfirming(true)} className="flex-shrink-0 p-0.5" aria-label="Delete record">
                                <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--ee-muted)' }}>delete</span>
                            </button>
                        )
                    )}
                </div>
                <p className="text-[11px] font-bold mt-0.5" style={{ color: 'var(--ee-muted)' }}>
                    {ACTIVITY_TYPE_LABELS[activity.activity_type] ?? activity.activity_type}
                    {dateLabel ? ` · ${dateLabel}` : ''}
                    {activity.author_name ? ` · ${activity.author_name}` : ''}
                    {activity.lat != null ? ' · 📍' : ''}
                </p>
                {activity.notes && (
                    <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--ee-text)' }}>{activity.notes}</p>
                )}
                {activity.recommendation && (
                    <p className="text-sm mt-1.5 flex items-start gap-1.5 leading-snug font-bold" style={{ color: 'var(--ee-text)' }}>
                        <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 15, color: 'var(--ee-primary)', marginTop: 2 }}>
                            tips_and_updates
                        </span>
                        {activity.recommendation}
                    </p>
                )}
            </div>
        </div>
    )
}

export function FieldActivityTimeline({ fieldId, canLog = true }: { fieldId: string; canLog?: boolean }) {
    const { activities, isLoading, refresh } = useFieldActivities(fieldId)
    const [showForm, setShowForm] = useState(false)
    const [banner, setBanner] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        try {
            await deleteActivity(id)
            refresh()
        } catch (e) {
            setBanner(e instanceof Error ? e.message : 'Failed to delete record')
        }
    }

    return (
        <div className="p-6 lg:p-8"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
            <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    Field Activity Record
                </h2>
                {canLog && !showForm && (
                    <button onClick={() => setShowForm(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black hover:scale-105 transition-transform"
                        style={{ background: 'var(--ee-primary)', color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                        Log activity
                    </button>
                )}
            </div>

            {banner && (
                <div className="flex items-center justify-between gap-2 p-3 rounded-[14px] mb-3"
                    style={{ background: 'rgba(220,38,38,0.08)' }}>
                    <p className="text-xs font-bold" style={{ color: '#dc2626' }}>{banner}</p>
                    <button onClick={() => setBanner(null)} aria-label="Dismiss">
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#dc2626' }}>close</span>
                    </button>
                </div>
            )}

            {showForm && (
                <div className="mb-5">
                    <LogForm fieldId={fieldId} onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
                </div>
            )}

            {isLoading && !activities && (
                <div className="space-y-3" aria-busy="true">
                    {[0, 1].map((i) => (
                        <div key={i} className="animate-pulse h-14 rounded-[16px]" style={{ background: 'var(--ee-bg)' }} />
                    ))}
                </div>
            )}

            {activities && activities.length === 0 && !showForm && (
                <p className="text-sm py-2" style={{ color: 'var(--ee-muted)' }}>
                    No professional activities recorded yet. Visits, inspections and recommendations
                    logged here become the field&apos;s permanent record.
                </p>
            )}

            {activities && activities.length > 0 && (
                <div>
                    {activities.map((a) => (
                        <ActivityRow key={a.id} activity={a} canDelete={canLog} onDelete={() => handleDelete(a.id)} />
                    ))}
                </div>
            )}
        </div>
    )
}
