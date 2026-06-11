'use client'

/**
 * /portfolio/growers — the contracted-grower roster (MVP PR 6).
 *
 * Offtakers think in people, not field IDs. This screen lists every grower with
 * derived stats (field count, hectares, worst-field score) from a client-side
 * join of useGrowers() against the portfolio aggregate's priority rows, and is
 * the entry point for adding a grower. No backend change.
 */

import { useEffect, useMemo, useState } from 'react'
import { useGrowers, createGrower, refreshGrowerData } from '@/hooks/useGrowers'
import { usePortfolioAggregate } from '@/hooks/usePortfolioAggregate'
import {
    mergeGrowerStats, searchGrowers, sortGrowersDefault, debounce,
    type GrowerPayload,
} from '@/lib/portfolio-utils'
import { GrowerCard } from '@/components/portfolio/GrowerCard'
import { GrowerForm } from '@/components/portfolio/GrowerForm'

function SkeletonCard() {
    return (
        <div className="animate-pulse h-[68px]"
            style={{ background: 'var(--ee-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-neu)' }}>
            <div className="p-5 space-y-3">
                <div className="h-3.5 rounded-full w-1/2" style={{ background: 'var(--ee-bg)' }} />
                <div className="h-3 rounded-full w-1/3" style={{ background: 'var(--ee-bg)' }} />
            </div>
        </div>
    )
}

function StateCard({ icon, title, body, action }: { icon: string; title: string; body: string; action?: React.ReactNode }) {
    return (
        <div className="p-8 text-center" style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-muted)' }}>{icon}</span>
            <p className="font-black text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{title}</p>
            <p className="text-sm mt-1 mb-5 max-w-sm mx-auto" style={{ color: 'var(--ee-muted)' }}>{body}</p>
            {action}
        </div>
    )
}

export default function PortfolioGrowersPage() {
    const { growers, isLoading, error, refresh } = useGrowers()
    const { data: aggregate } = usePortfolioAggregate()

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [showForm, setShowForm] = useState(false)

    const debouncedSetSearch = useMemo(() => debounce(setSearch, 250), [])
    useEffect(() => () => debouncedSetSearch.cancel(), [debouncedSetSearch])
    const onSearch = (v: string) => { setSearchInput(v); debouncedSetSearch(v) }
    const clearSearch = () => { debouncedSetSearch.cancel(); setSearchInput(''); setSearch('') }

    const withStats = useMemo(
        () => mergeGrowerStats(growers ?? [], aggregate?.priorities ?? []),
        [growers, aggregate],
    )
    const visible = useMemo(
        () => sortGrowersDefault(searchGrowers(withStats, search)),
        [withStats, search],
    )
    const totalFields = useMemo(() => withStats.reduce((s, g) => s + g.field_count, 0), [withStats])

    const handleCreate = async (payload: GrowerPayload) => {
        await createGrower(payload)
        refreshGrowerData()
    }

    return (
        <div className="max-w-[800px] mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5 lg:mb-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        Growers
                    </h1>
                    <p className="mt-1 font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                        {growers
                            ? `${growers.length} grower${growers.length === 1 ? '' : 's'} · ${totalFields} field${totalFields === 1 ? '' : 's'}`
                            : 'The growers you contract with'}
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-sm flex-shrink-0 hover:scale-105 transition-transform"
                    style={{ background: 'var(--ee-primary)', color: '#FFFFFF' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
                    <span className="hidden sm:inline">Add grower</span>
                </button>
            </div>

            {isLoading && !growers && (
                <div className="space-y-3" aria-busy="true">{[0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}</div>
            )}

            {error && !growers && (
                <StateCard icon="cloud_off" title="Couldn't load your growers" body="Check your connection and try again."
                    action={
                        <button onClick={refresh}
                            className="px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                            style={{ background: 'var(--ee-primary)', color: '#FFFFFF' }}>Retry</button>
                    } />
            )}

            {growers && growers.length === 0 && (
                <StateCard icon="groups" title="No growers yet" body="Add your first contracted grower to start building your roster."
                    action={
                        <button onClick={() => setShowForm(true)}
                            className="px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                            style={{ background: 'var(--ee-primary)', color: '#FFFFFF' }}>Add grower</button>
                    } />
            )}

            {growers && growers.length > 0 && (
                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
                            style={{ fontSize: 18, color: 'var(--ee-muted)' }}>search</span>
                        <input
                            type="text" value={searchInput} onChange={(e) => onSearch(e.target.value)}
                            placeholder="Search growers…"
                            className="w-full pl-10 pr-9 py-2.5 rounded-full text-sm font-bold focus:outline-none"
                            style={{ background: 'var(--ee-surface)', color: 'var(--ee-text)', boxShadow: 'var(--shadow-neu-inset)' }}
                        />
                        {searchInput && (
                            <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2" aria-label="Clear search">
                                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--ee-muted)' }}>close</span>
                            </button>
                        )}
                    </div>

                    {visible.length === 0 ? (
                        <StateCard icon="search_off" title="No growers match your search" body="Try a different name."
                            action={
                                <button onClick={clearSearch}
                                    className="px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                                    style={{ background: 'var(--ee-primary)', color: '#FFFFFF' }}>Clear search</button>
                            } />
                    ) : (
                        <div className="space-y-3">
                            {visible.map((g) => <GrowerCard key={g.id} grower={g} />)}
                        </div>
                    )}
                </div>
            )}

            {showForm && <GrowerForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
        </div>
    )
}
