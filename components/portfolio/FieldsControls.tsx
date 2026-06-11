'use client'

/**
 * FieldsControls — the search / filter / sort row for the Fields roster.
 * Stateless: it renders the current FieldsFilter + FieldsSort and emits changes
 * upward. Search is debounced by the parent. Multi-select dropdowns are
 * populated from deriveFilterOptions, so a chip is never offered for a value
 * absent from the payload. Active filters appear as removable chips with
 * "Clear all".
 */

import { useEffect, useRef, useState } from 'react'
import {
    humanizeCrop, AWAITING_BAND,
    type FieldsFilter, type FieldsSort, type FieldsFilterOptions,
} from '@/lib/portfolio-utils'

const SORT_OPTIONS: { value: FieldsSort; label: string }[] = [
    { value: 'score_asc', label: 'Worst first' },
    { value: 'score_desc', label: 'Best first' },
    { value: 'size_desc', label: 'Largest' },
    { value: 'grower_az', label: 'Grower A–Z' },
    { value: 'district_az', label: 'District A–Z' },
]

function bandDisplay(band: string): string {
    return band === AWAITING_BAND ? 'Awaiting' : band
}

// ─── Multi-select dropdown ───────────────────────────────────────────────────

function MultiSelectDropdown({
    label, options, selected, display, onToggle,
}: {
    label: string
    options: string[]
    selected: string[]
    display: (v: string) => string
    onToggle: (value: string) => void
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [open])

    if (options.length === 0) return null

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold whitespace-nowrap"
                style={{
                    background: selected.length ? 'var(--ee-primary)' : 'var(--ee-surface)',
                    color: selected.length ? '#FFFFFF' : 'var(--ee-text)',
                    boxShadow: 'var(--shadow-neu)',
                }}
            >
                {label}
                {selected.length > 0 && (
                    <span className="text-[11px] font-black px-1.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.25)' }}>
                        {selected.length}
                    </span>
                )}
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {open ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {open && (
                <div
                    className="absolute z-50 mt-2 left-0 min-w-[200px] max-h-72 overflow-y-auto p-1.5"
                    style={{ background: 'var(--ee-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-neu)' }}
                >
                    {options.map((opt) => {
                        const checked = selected.includes(opt)
                        return (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => onToggle(opt)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-left text-sm font-bold transition-colors hover:bg-black/5"
                                style={{ color: 'var(--ee-text)' }}
                            >
                                <span
                                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: checked ? 'var(--ee-primary)' : 'var(--ee-bg)',
                                        boxShadow: checked ? 'none' : 'var(--shadow-neu-inset)',
                                    }}
                                >
                                    {checked && (
                                        <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#FFFFFF' }}>check</span>
                                    )}
                                </span>
                                {display(opt)}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─── Controls ────────────────────────────────────────────────────────────────

export interface FieldsControlsProps {
    options: FieldsFilterOptions
    filter: FieldsFilter
    sort: FieldsSort
    /** Raw (un-debounced) search text for the input value. */
    searchInput: string
    onSearchInput: (value: string) => void
    onClearSearch: () => void
    onToggleDistrict: (v: string) => void
    onToggleCrop: (v: string) => void
    onToggleBand: (v: string) => void
    onSortChange: (s: FieldsSort) => void
    onClearAll: () => void
    anyActive: boolean
}

export function FieldsControls(props: FieldsControlsProps) {
    const { options, filter, sort, searchInput } = props

    const activeChips: { key: string; label: string; onRemove: () => void }[] = [
        ...filter.districts.map((d) => ({ key: `d:${d}`, label: d, onRemove: () => props.onToggleDistrict(d) })),
        ...filter.crops.map((c) => ({ key: `c:${c}`, label: humanizeCrop(c), onRemove: () => props.onToggleCrop(c) })),
        ...filter.bands.map((b) => ({ key: `b:${b}`, label: bandDisplay(b), onRemove: () => props.onToggleBand(b) })),
    ]

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ fontSize: 18, color: 'var(--ee-muted)' }}>search</span>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => props.onSearchInput(e.target.value)}
                        placeholder="Search grower or field…"
                        className="w-full pl-10 pr-9 py-2.5 rounded-full text-sm font-bold focus:outline-none"
                        style={{ background: 'var(--ee-surface)', color: 'var(--ee-text)', boxShadow: 'var(--shadow-neu-inset)' }}
                    />
                    {searchInput && (
                        <button
                            type="button"
                            onClick={props.onClearSearch}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2"
                            aria-label="Clear search"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--ee-muted)' }}>close</span>
                        </button>
                    )}
                </div>

                {/* Filter dropdowns */}
                <MultiSelectDropdown label="District" options={options.districts} selected={filter.districts}
                    display={(v) => v} onToggle={props.onToggleDistrict} />
                <MultiSelectDropdown label="Crop" options={options.crops} selected={filter.crops}
                    display={humanizeCrop} onToggle={props.onToggleCrop} />
                <MultiSelectDropdown label="Health" options={options.bands} selected={filter.bands}
                    display={bandDisplay} onToggle={props.onToggleBand} />

                {/* Sort */}
                <div className="relative">
                    <select
                        value={sort}
                        onChange={(e) => props.onSortChange(e.target.value as FieldsSort)}
                        className="appearance-none pl-3.5 pr-9 py-2 rounded-full text-sm font-bold focus:outline-none cursor-pointer"
                        style={{ background: 'var(--ee-surface)', color: 'var(--ee-text)', boxShadow: 'var(--shadow-neu)' }}
                        aria-label="Sort fields"
                    >
                        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ fontSize: 16, color: 'var(--ee-muted)' }}>unfold_more</span>
                </div>
            </div>

            {/* Active filter chips */}
            {activeChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {activeChips.map((chip) => (
                        <button
                            key={chip.key}
                            type="button"
                            onClick={chip.onRemove}
                            className="flex items-center gap-1 pl-3 pr-2 py-1 rounded-full text-xs font-bold"
                            style={{ background: 'var(--ee-bg-pressed)', color: 'var(--ee-text)' }}
                        >
                            {chip.label}
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={props.onClearAll}
                        className="text-xs font-bold underline"
                        style={{ color: 'var(--ee-muted)' }}
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    )
}

export default FieldsControls
