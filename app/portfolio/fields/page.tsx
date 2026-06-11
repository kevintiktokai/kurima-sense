'use client'

/**
 * /portfolio/fields — the institutional roster / browse surface (MVP PR 5).
 *
 * Where Today answers "where do I focus", Fields answers "show me my whole
 * portfolio, sliced how I want": every field in the tenant, searchable,
 * filterable, and sortable. Client-side filtering is correct at 40 fields, and
 * it shares Today's `GET /portfolio/aggregate` request via SWR dedupe.
 *
 * Flat, user-ordered list (no urgency dividers — the sort control owns order).
 * Renders calmly in the same data states as Today, plus a distinct
 * empty-filter-result state.
 */

import { useEffect, useMemo, useState } from 'react'
import { usePortfolioAggregate } from '@/hooks/usePortfolioAggregate'
import {
    filterFields, sortFields, deriveFilterOptions, isFilterActive, debounce,
    selectScreenState,
    DEFAULT_FIELDS_FILTER, DEFAULT_FIELDS_SORT,
    type FieldsFilter, type FieldsSort,
} from '@/lib/portfolio-utils'
import { PageContainer } from '@/components/layout/PageContainer'
import { FieldsControls } from '@/components/portfolio/FieldsControls'
import { FieldRowCard } from '@/components/portfolio/FieldRowCard'

// ─── Shared state cards (same patterns as Today; kept self-contained) ─────────

function SkeletonCard() {
    return (
        <div className="animate-pulse h-24"
            style={{ background: 'var(--ee-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-neu)' }}>
            <div className="p-5 space-y-3">
                <div className="h-3.5 rounded-full w-2/3" style={{ background: 'var(--ee-bg)' }} />
                <div className="h-3 rounded-full w-1/3" style={{ background: 'var(--ee-bg)' }} />
            </div>
        </div>
    )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="p-8 text-center"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-muted)' }}>cloud_off</span>
            <p className="font-black text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                Couldn&apos;t load your fields
            </p>
            <p className="text-sm mt-1 mb-5" style={{ color: 'var(--ee-muted)' }}>Check your connection and try again.</p>
            <button onClick={onRetry}
                className="px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                style={{ background: 'var(--ee-primary)', color: '#FFFFFF' }}>
                Retry
            </button>
        </div>
    )
}

function EmptyTenantState() {
    return (
        <div className="p-8 text-center"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-primary)' }}>grass</span>
            <p className="font-black text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>No fields yet</p>
            <p className="text-sm mt-1 max-w-sm mx-auto" style={{ color: 'var(--ee-muted)' }}>
                Fields will appear here once they are added to your portfolio.
            </p>
        </div>
    )
}

function EmptyFilterState({ onClear }: { onClear: () => void }) {
    return (
        <div className="p-8 text-center"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-muted)' }}>filter_alt_off</span>
            <p className="font-black text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                No fields match your filters
            </p>
            <p className="text-sm mt-1 mb-5" style={{ color: 'var(--ee-muted)' }}>Try widening your search or filters.</p>
            <button onClick={onClear}
                className="px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                style={{ background: 'var(--ee-primary)', color: '#FFFFFF' }}>
                Clear all filters
            </button>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioFieldsPage() {
    const { data, isLoading, error, refresh } = usePortfolioAggregate()

    const [searchInput, setSearchInput] = useState('')
    const [filter, setFilter] = useState<FieldsFilter>(DEFAULT_FIELDS_FILTER)
    const [sort, setSort] = useState<FieldsSort>(DEFAULT_FIELDS_SORT)

    // Debounce the search text into the filter (~250ms) using the shared util.
    const debouncedSetSearch = useMemo(
        () => debounce((v: string) => setFilter((f) => ({ ...f, search: v })), 250),
        [],
    )
    useEffect(() => () => debouncedSetSearch.cancel(), [debouncedSetSearch])

    const onSearchInput = (v: string) => { setSearchInput(v); debouncedSetSearch(v) }
    const onClearSearch = () => { debouncedSetSearch.cancel(); setSearchInput(''); setFilter((f) => ({ ...f, search: '' })) }

    const toggle = (key: 'districts' | 'crops' | 'bands') => (value: string) =>
        setFilter((f) => ({
            ...f,
            [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
        }))

    const clearAll = () => { debouncedSetSearch.cancel(); setSearchInput(''); setFilter(DEFAULT_FIELDS_FILTER) }

    const priorities = data?.priorities ?? []
    const options = useMemo(() => deriveFilterOptions(priorities), [priorities])
    const visible = useMemo(
        () => sortFields(filterFields(priorities, filter), sort),
        [priorities, filter, sort],
    )

    const state = data ? selectScreenState(data.summary) : null
    const districtCount = data ? options.districts.length : 0
    const anyActive = isFilterActive(filter)

    return (
        <PageContainer variant="reading">
            {/* Header */}
            <div className="mb-5 lg:mb-6">
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    Fields
                </h1>
                <p className="mt-1 font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                    {data
                        ? `${data.summary.total_fields} fields · ${data.summary.total_hectares} ha across ${districtCount} district${districtCount === 1 ? '' : 's'}`
                        : 'Every field across your contracted portfolio'}
                </p>
            </div>

            {isLoading && !data && (
                <div className="space-y-3" aria-busy="true">
                    {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
                </div>
            )}
            {error && !data && <ErrorState onRetry={refresh} />}
            {data && state === 'empty' && <EmptyTenantState />}

            {data && state !== 'empty' && (
                <div className="space-y-4">
                    <FieldsControls
                        options={options}
                        filter={filter}
                        sort={sort}
                        searchInput={searchInput}
                        onSearchInput={onSearchInput}
                        onClearSearch={onClearSearch}
                        onToggleDistrict={toggle('districts')}
                        onToggleCrop={toggle('crops')}
                        onToggleBand={toggle('bands')}
                        onSortChange={setSort}
                        onClearAll={clearAll}
                        anyActive={anyActive}
                    />

                    <p className="text-xs font-bold px-1" style={{ color: 'var(--ee-muted)' }}>
                        Showing {visible.length} of {data.summary.total_fields} fields
                    </p>

                    {visible.length === 0 ? (
                        <EmptyFilterState onClear={clearAll} />
                    ) : (
                        <div className="space-y-3">
                            {visible.map((p) => (
                                <FieldRowCard key={p.field_id} priority={p} variant="roster" />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </PageContainer>
    )
}
