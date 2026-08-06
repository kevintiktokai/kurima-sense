'use client'

/**
 * /portfolio/growers/[id] — grower detail with their fields inline (MVP PR 6).
 *
 * Cold deep-link safe: the grower is fetched directly by id (useGrower) rather
 * than depending on the roster having been visited. Their fields come from the
 * portfolio aggregate filtered by grower_id and rendered with the shared
 * FieldRowCard (roster variant), worst-first. Edit reuses GrowerForm; Remove is
 * a calm soft-delete confirm at the bottom of the page.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useGrower, updateGrower, deleteGrower, refreshGrowerData } from '@/hooks/useGrowers'
import { usePortfolioAggregate } from '@/hooks/usePortfolioAggregate'
import { mergeGrowerStats, sortFields, type GrowerPayload } from '@/lib/portfolio-utils'
import { parseFrom, routeForGrower, BACK_DEFAULTS, type FromContext } from '@/lib/nav-links'
import { FieldRowCard } from '@/components/portfolio/FieldRowCard'
import { GrowerForm } from '@/components/portfolio/GrowerForm'
import { PageContainer } from '@/components/layout/PageContainer'

function BackLink({ back }: { back: FromContext }) {
    return (
        <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm font-bold mb-5 rounded-full" style={{ color: 'var(--ee-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Back to {back.label}
        </Link>
    )
}

export default function GrowerDetailPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const growerId = params.id as string
    const back = parseFrom(searchParams, BACK_DEFAULTS.grower)

    const { grower, isLoading, error, refresh } = useGrower(growerId)
    const { data: aggregate } = usePortfolioAggregate()

    const [editing, setEditing] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    // Stats for THIS grower, and their fields, from the aggregate join.
    const stats = useMemo(() => {
        if (!grower) return null
        return mergeGrowerStats([grower], aggregate?.priorities ?? [])[0]
    }, [grower, aggregate])

    const fields = useMemo(() => {
        const mine = (aggregate?.priorities ?? []).filter((p) => p.grower_id === growerId)
        return sortFields(mine, 'score_asc')
    }, [aggregate, growerId])

    const handleEdit = async (payload: GrowerPayload) => {
        await updateGrower(growerId, payload)
        refreshGrowerData()
        refresh()
    }

    const handleDelete = async () => {
        setDeleting(true)
        setDeleteError(null)
        try {
            await deleteGrower(growerId)
            refreshGrowerData()
            router.push('/portfolio/growers')
        } catch (e) {
            setDeleteError(e instanceof Error ? e.message : 'Failed to remove grower')
            setDeleting(false)
        }
    }

    if (isLoading || (!grower && !error)) {
        return (
            <div className="max-w-[800px] mx-auto" aria-busy="true">
                <BackLink back={back} />
                <div className="space-y-4">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="animate-pulse h-28"
                            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }} />
                    ))}
                </div>
            </div>
        )
    }

    if (error || !grower) {
        return (
            <div className="max-w-[800px] mx-auto">
                <BackLink back={back} />
                <div className="p-8 text-center" style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
                    <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-muted)' }}>person_off</span>
                    <p className="font-black text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        {error?.message === 'Grower not found' ? 'Grower not found' : "Couldn't load this grower"}
                    </p>
                    <p className="text-sm mt-1 mb-5" style={{ color: 'var(--ee-muted)' }}>
                        It may have been removed from your roster.
                    </p>
                    <button onClick={() => refresh()}
                        className="px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                        style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)' }}>Retry</button>
                </div>
            </div>
        )
    }

    return (
        <PageContainer variant="reading" className="pb-8">
            <BackLink back={back} />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-2xl lg:text-3xl font-black tracking-tight" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        {grower.name}
                    </h1>
                    {(grower.phone || grower.email) && (
                        <p className="mt-1 font-medium text-sm" style={{ color: 'var(--ee-muted)' }}>
                            {[grower.phone, grower.email].filter(Boolean).join(' · ')}
                        </p>
                    )}
                    {/*
                      * Shown as a chip rather than folded into the contact line,
                      * because it is the value someone is looking for when they
                      * open this page to check a grower against a register — and
                      * absent, it is the reason this grower is missing from an
                      * evidence pack. Silent absence is right for a card that
                      * has no data; this one earns a nudge.
                      */}
                    {grower.timb_grower_number ? (
                        <p
                            className="mt-2 inline-block px-2.5 py-1 rounded-full text-xs font-bold tracking-wide"
                            style={{ background: 'var(--ee-bg-dim)', color: 'var(--ee-text)' }}
                        >
                            TIMB {grower.timb_grower_number}
                        </p>
                    ) : (
                        <p className="mt-2 text-xs font-medium" style={{ color: 'var(--ee-muted)' }}>
                            No TIMB number — this grower won&apos;t appear in traceability records.
                        </p>
                    )}
                    {grower.notes && (
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ee-muted)' }}>{grower.notes}</p>
                    )}
                </div>
                <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-sm flex-shrink-0"
                    style={{ background: 'var(--ee-surface)', color: 'var(--ee-text)', boxShadow: 'var(--shadow-neu)' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                    <span className="hidden sm:inline">Edit</span>
                </button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-4 rounded-[16px]" style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ee-muted)' }}>Fields</p>
                    <p className="text-2xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{stats?.field_count ?? 0}</p>
                </div>
                <div className="p-4 rounded-[16px]" style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ee-muted)' }}>Hectares</p>
                    <p className="text-2xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{stats?.total_hectares ?? 0}</p>
                </div>
                <div className="p-4 rounded-[16px]" style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ee-muted)' }}>Worst field</p>
                    {stats && stats.field_count > 0 ? (
                        stats.worst_score != null ? (
                            <p className="text-2xl font-black" style={{ color: stats.worst_color || 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                {stats.worst_score}
                            </p>
                        ) : (
                            <p className="text-sm font-black mt-1.5 uppercase tracking-wider" style={{ color: 'var(--ee-muted)' }}>Awaiting</p>
                        )
                    ) : (
                        <p className="text-2xl font-black" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-heading)' }}>—</p>
                    )}
                </div>
            </div>

            {/* Their fields */}
            <h2 className="text-xl font-black mb-3" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>Fields</h2>
            {fields.length === 0 ? (
                <div className="p-6 text-center" style={{ background: 'var(--ee-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-neu)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--ee-muted)' }}>No fields linked to this grower yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {fields.map((p) => (
                        <FieldRowCard
                            key={p.field_id}
                            priority={p}
                            variant="roster"
                            from={{ label: grower.name, href: routeForGrower(growerId) }}
                        />
                    ))}
                </div>
            )}

            {/* Remove (soft delete) — tucked at the bottom, not the header */}
            <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--ee-bg-border)' }}>
                <button
                    onClick={() => { setDeleteError(null); setConfirmDelete(true) }}
                    className="text-sm font-bold inline-flex items-center gap-1.5 rounded-full"
                    style={{ color: '#dc2626' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_remove</span>
                    Remove grower
                </button>
            </div>

            {/* Edit modal */}
            {editing && <GrowerForm grower={grower} onSubmit={handleEdit} onClose={() => setEditing(false)} />}

            {/* Delete confirm */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
                    style={{ background: 'rgba(45,58,48,0.4)', backdropFilter: 'blur(8px)' }}
                    onMouseDown={(e) => { if (e.target === e.currentTarget && !deleting) setConfirmDelete(false) }}>
                    <div className="w-full max-w-sm p-7 rounded-[24px]" style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
                        <h3 className="text-lg font-black mb-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                            Remove {grower.name}?
                        </h3>
                        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--ee-muted)' }}>
                            Remove {grower.name} from your grower roster? Their fields remain in your portfolio but will no longer show a grower name.
                        </p>
                        {deleteError && (
                            <div className="p-3 rounded-[12px] text-sm font-bold mb-4" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
                                {deleteError}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                                className="flex-1 py-3 rounded-[16px] font-bold disabled:opacity-50" style={{ color: 'var(--ee-muted)' }}>
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="flex-1 py-3 rounded-[16px] font-black disabled:opacity-50"
                                style={{ background: '#dc2626', color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}>
                                {deleting ? 'Removing…' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    )
}
