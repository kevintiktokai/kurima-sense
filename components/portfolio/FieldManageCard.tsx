'use client'

/**
 * FieldManageCard — institutional field management: assignment, editing, and
 * safeguarded deletion, in one card on the institutional field detail page.
 *
 *  - Assign: pick any active team member (backend enforces the manager tier and
 *    membership; reassignment preserves history server-side).
 *  - Edit: name / crop / variety / planting date / fertilizer plan via the same
 *    tenant-scoped PATCH the consumer app uses (shared api.updateField). Crop
 *    picking reuses the consumer CropSearchSelect so the two surfaces stay
 *    consistent; the variety list comes from the shared catalogue endpoint.
 *  - Delete: two-step confirmation requiring the field name to be typed —
 *    deletion cascades to satellite logs and input records, so it is loud.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CropSearchSelect from '@/components/dashboard/CropSearchSelect'
import { api } from '@/services/api'
import {
    useTeamMembers, useFieldAssignments, assignField, refreshAssignments, memberName,
} from '@/hooks/useTeam'

const inputStyle = {
    background: 'var(--ee-bg)', color: 'var(--ee-text)',
    fontFamily: 'var(--font-body)', boxShadow: 'var(--shadow-neu-inset)', border: 'none',
} as const

export interface FieldManageCardProps {
    fieldId: string
    fieldName: string
    crop?: string | null
    variety?: string | null
    plantingDate?: string | null
    /** Called after a successful edit so the host page can refresh its data. */
    onChanged: () => void
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({ fieldId, initial, onClose, onSaved }: {
    fieldId: string
    initial: { name: string; crop: string; variety: string; plantingDate: string }
    onClose: () => void
    onSaved: () => void
}) {
    const [name, setName] = useState(initial.name)
    const [crop, setCrop] = useState(initial.crop)
    const [variety, setVariety] = useState(initial.variety)
    const [plantingDate, setPlantingDate] = useState(initial.plantingDate)
    const [varieties, setVarieties] = useState<Array<{ variety_name: string }>>([])
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Variety catalogue for the selected crop (shared endpoint; empty = free text).
    useEffect(() => {
        let cancelled = false
        void (async () => {
            const list = await api.getCropVarieties(crop)
            if (!cancelled) setVarieties(Array.isArray(list) ? list : [])
        })()
        return () => { cancelled = true }
    }, [crop])

    const submit = async () => {
        if (!name.trim()) { setError('Field name is required'); return }
        setPending(true)
        setError(null)
        try {
            await api.updateField(fieldId, {
                name: name.trim(),
                crop,
                variety: variety.trim() || undefined,
                plantingDate: plantingDate || undefined,
            })
            onSaved()
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save changes')
            setPending(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
            style={{ background: 'rgba(45,58,48,0.4)', backdropFilter: 'blur(8px)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="w-full max-w-md p-7 rounded-[24px] max-h-[90vh] overflow-y-auto"
                style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        Edit field
                    </h3>
                    <button onClick={onClose} className="p-1" aria-label="Close">
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-muted)' }}>close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                            Field name <span style={{ color: 'var(--ee-primary)' }}>*</span>
                        </label>
                        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200}
                            className="w-full px-4 py-3 rounded-[14px] text-sm" style={inputStyle} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                            Crop
                        </label>
                        <CropSearchSelect value={crop} onChange={(c) => { setCrop(c); setVariety('') }} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                            Variety
                        </label>
                        {varieties.length > 0 ? (
                            <select value={variety} onChange={(e) => setVariety(e.target.value)}
                                className="w-full px-4 py-3 rounded-[14px] text-sm" style={inputStyle}>
                                <option value="">— Not specified —</option>
                                {/* Preserve a custom variety not in the catalogue */}
                                {variety && !varieties.some((v) => v.variety_name === variety) && (
                                    <option value={variety}>{variety}</option>
                                )}
                                {varieties.map((v) => (
                                    <option key={v.variety_name} value={v.variety_name}>{v.variety_name}</option>
                                ))}
                            </select>
                        ) : (
                            <input value={variety} onChange={(e) => setVariety(e.target.value)} maxLength={100}
                                placeholder="e.g. SC 727"
                                className="w-full px-4 py-3 rounded-[14px] text-sm" style={inputStyle} />
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                            Planting date
                        </label>
                        <input type="date" value={plantingDate} onChange={(e) => setPlantingDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-[14px] text-sm" style={inputStyle} />
                    </div>

                    <p className="text-[11px]" style={{ color: 'var(--ee-muted)' }}>
                        Field boundaries and size are edited from the map capture flow — changing
                        geometry re-runs satellite sampling.
                    </p>

                    {error && <p className="text-sm font-bold" style={{ color: '#dc2626' }}>{error}</p>}

                    <button onClick={submit} disabled={pending}
                        className="w-full py-3.5 rounded-full font-black text-sm disabled:opacity-50"
                        style={{ background: 'var(--ee-primary)', color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}>
                        {pending ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function FieldManageCard({ fieldId, fieldName, crop, variety, plantingDate, onChanged }: FieldManageCardProps) {
    const router = useRouter()
    const { members } = useTeamMembers()
    const { active, refresh: refreshFieldAssignment } = useFieldAssignments(fieldId)

    const [editing, setEditing] = useState(false)
    const [assignPending, setAssignPending] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleteText, setDeleteText] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [banner, setBanner] = useState<string | null>(null)

    const activeMembers = (members ?? []).filter((m) => m.status === 'active')

    const handleAssign = async (userId: string) => {
        setAssignPending(true)
        setBanner(null)
        try {
            await assignField(fieldId, userId || null)
            refreshAssignments(fieldId)
            refreshFieldAssignment()
        } catch (e) {
            setBanner(e instanceof Error ? e.message : 'Failed to update assignment')
        } finally {
            setAssignPending(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        setBanner(null)
        try {
            const res = await api.deleteField(fieldId)
            if (!res || (res as { status?: string }).status !== 'success') {
                throw new Error('Delete failed — check your permission and try again')
            }
            router.push('/portfolio/fields')
        } catch (e) {
            setBanner(e instanceof Error ? e.message : 'Failed to delete field')
            setDeleting(false)
        }
    }

    return (
        <div className="p-6 lg:p-8"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
            <h2 className="text-lg font-black mb-4" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                Manage
            </h2>

            {banner && (
                <div className="flex items-center justify-between gap-2 p-3 rounded-[14px] mb-4"
                    style={{ background: 'rgba(220,38,38,0.08)' }}>
                    <p className="text-xs font-bold" style={{ color: '#dc2626' }}>{banner}</p>
                    <button onClick={() => setBanner(null)} aria-label="Dismiss">
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#dc2626' }}>close</span>
                    </button>
                </div>
            )}

            {/* Assignment */}
            <div className="mb-5">
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                    Assigned to
                </label>
                <select
                    value={active?.assignee_user_id ?? ''}
                    onChange={(e) => handleAssign(e.target.value)}
                    disabled={assignPending || activeMembers.length === 0}
                    className="w-full px-4 py-3 rounded-[14px] text-sm font-bold disabled:opacity-60"
                    style={inputStyle}
                >
                    <option value="">— Unassigned —</option>
                    {activeMembers.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                            {memberName(m)} ({m.assigned_fields} field{m.assigned_fields === 1 ? '' : 's'})
                        </option>
                    ))}
                </select>
                {active?.assignee_name && (
                    <p className="text-[11px] font-bold mt-1" style={{ color: 'var(--ee-muted)' }}>
                        Currently with {active.assignee_name}
                        {active.assigned_at ? ` since ${new Date(active.assigned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                    </p>
                )}
            </div>

            {/* Edit */}
            <button onClick={() => setEditing(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-black mb-3 hover:opacity-90"
                style={{ background: 'var(--ee-bg)', color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                Edit field details
            </button>

            {/* Delete — two-step, name-confirmed */}
            {confirmDelete ? (
                <div className="p-4 rounded-[16px] space-y-3" style={{ background: 'rgba(220,38,38,0.06)' }}>
                    <p className="text-xs leading-relaxed font-bold" style={{ color: '#dc2626' }}>
                        This permanently deletes the field, its satellite history and input records.
                        Type <span className="font-black">{fieldName}</span> to confirm.
                    </p>
                    <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)}
                        placeholder={fieldName}
                        className="w-full px-4 py-2.5 rounded-[12px] text-sm"
                        style={{ ...inputStyle, background: 'var(--ee-surface)' }} />
                    <div className="flex gap-2">
                        <button onClick={() => { setConfirmDelete(false); setDeleteText('') }}
                            className="flex-1 py-2.5 rounded-full text-sm font-bold" style={{ color: 'var(--ee-muted)' }}>
                            Cancel
                        </button>
                        <button onClick={handleDelete}
                            disabled={deleting || deleteText.trim() !== fieldName}
                            className="flex-1 py-2.5 rounded-full text-sm font-black disabled:opacity-40"
                            style={{ background: '#dc2626', color: '#FFFFFF' }}>
                            {deleting ? 'Deleting…' : 'Delete field'}
                        </button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold hover:opacity-90"
                    style={{ background: 'rgba(220,38,38,0.06)', color: '#dc2626' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                    Delete field…
                </button>
            )}

            {editing && (
                <EditModal
                    fieldId={fieldId}
                    initial={{
                        name: fieldName,
                        crop: crop || 'Maize',
                        variety: variety || '',
                        plantingDate: plantingDate ? plantingDate.slice(0, 10) : '',
                    }}
                    onClose={() => setEditing(false)}
                    onSaved={onChanged}
                />
            )}
        </div>
    )
}
