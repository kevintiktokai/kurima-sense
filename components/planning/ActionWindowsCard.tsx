'use client'

// The operations that are closing on this field.
//
// This replaces the mental model of "a list of tasks" with "a set of windows,
// some of which shut". Two things are rendered differently from everything else
// in the app on purpose:
//
//   * Irreversible windows that are live get a full card each, above the fold.
//     A task you can do next week and one you cannot look identical in a list,
//     and that is the distinction a farmer is most likely to misjudge.
//   * The deadline is a countdown, not a date. "Closes in 3 days" is a
//     decision; "closes 18 Dec" is arithmetic to do while standing in a field.
//
// Everything else stays grouped and collapsed below, still in the backend's
// cost-per-remaining-day order, so the screen doesn't become the flat list it
// was meant to replace.

import React, { useState } from 'react'

import { useActionWindows } from '@/hooks/useSeasons'
import {
    categoryLabel,
    costLabel,
    deadlineLabel,
    groupByCategory,
    remainingWindows,
    urgentWindows,
    windowIcon,
    windowStateStyle,
} from '@/lib/action-window-utils'
import type { ActionWindow } from '@/lib/planning-types'

interface Props {
    fieldId: string
    soilTexture?: string
}

function UrgentCard({ window: w }: { window: ActionWindow }) {
    const [open, setOpen] = useState(false)
    const style = windowStateStyle(w.state)

    return (
        <div
            className="rounded-[20px] p-5"
            style={{
                background: style.urgent ? style.color : 'var(--ee-surface)',
                color: style.urgent ? '#fff' : 'var(--ee-text)',
                boxShadow: 'var(--shadow-neu)',
            }}
        >
            <div className="flex items-start gap-3">
                <span
                    className="material-symbols-outlined shrink-0"
                    style={{
                        fontSize: '1.5rem',
                        color: style.urgent ? '#fff' : style.color,
                    }}
                >
                    {windowIcon(w.category)}
                </span>
                <div className="min-w-0 flex-1">
                    <p
                        className="text-base font-black leading-tight"
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        {w.title}
                    </p>
                    <p
                        className="text-sm font-bold mt-0.5"
                        style={{
                            fontFamily: 'var(--font-body)',
                            color: style.urgent ? 'rgba(255,255,255,0.9)' : style.color,
                        }}
                    >
                        {deadlineLabel(w)}
                    </p>
                    <p
                        className="text-sm leading-relaxed mt-2"
                        style={{
                            fontFamily: 'var(--font-body)',
                            color: style.urgent ? 'rgba(255,255,255,0.92)' : 'var(--ee-muted)',
                        }}
                    >
                        {costLabel(w)}
                    </p>

                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="text-[11px] font-bold uppercase mt-2.5"
                        style={{
                            fontFamily: 'var(--font-body)',
                            color: style.urgent ? '#fff' : 'var(--ee-primary)',
                            opacity: style.urgent ? 0.85 : 1,
                        }}
                        aria-expanded={open}
                    >
                        {open ? 'Hide why' : 'Why this matters'}
                    </button>
                    {open && (
                        <p
                            className="text-xs leading-relaxed mt-2"
                            style={{
                                fontFamily: 'var(--font-body)',
                                color: style.urgent ? 'rgba(255,255,255,0.88)' : 'var(--ee-muted)',
                            }}
                        >
                            {w.why}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

function WindowRow({ window: w }: { window: ActionWindow }) {
    const style = windowStateStyle(w.state)
    return (
        <li
            className="flex items-start justify-between gap-3 rounded-[14px] p-3"
            style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
        >
            <div className="min-w-0">
                <p
                    className="text-sm font-bold"
                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                >
                    {w.title}
                </p>
                <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                >
                    {costLabel(w)}
                </p>
            </div>
            <span
                className="text-[11px] font-bold whitespace-nowrap px-2 py-1 rounded-full"
                style={{ color: style.color, background: `${style.color}1a`, fontFamily: 'var(--font-body)' }}
            >
                {deadlineLabel(w)}
            </span>
        </li>
    )
}

export function ActionWindowsCard({ fieldId, soilTexture }: Props) {
    const { data, isLoading, error } = useActionWindows(fieldId, soilTexture)
    const [showAll, setShowAll] = useState(false)

    // Silent absence beats a broken card on the farmer's main surface.
    if (isLoading || error) return null
    if (!data?.windows?.length) return null

    const urgent = urgentWindows(data.windows)
    const rest = remainingWindows(data.windows, urgent)
    const groups = groupByCategory(rest)

    return (
        <div
            className="lg:col-span-12 p-6 lg:p-8"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}
        >
            <h2
                className="text-lg font-black flex items-center gap-2 mb-1"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 22, color: 'var(--ee-primary)' }}
                >
                    hourglass_top
                </span>
                What&apos;s closing
            </h2>
            <p
                className="text-[11px] font-bold mb-5"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                Ordered by what it costs to miss, not by date
            </p>

            {urgent.length > 0 && (
                <div className="space-y-3 mb-5">
                    {urgent.map((w) => (
                        <UrgentCard key={w.key} window={w} />
                    ))}
                </div>
            )}

            {groups.length > 0 && (
                <>
                    <button
                        onClick={() => setShowAll((v) => !v)}
                        className="text-xs font-bold uppercase flex items-center gap-1"
                        style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                        aria-expanded={showAll}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                            {showAll ? 'expand_less' : 'expand_more'}
                        </span>
                        {showAll
                            ? 'Hide the rest'
                            : `${rest.length} more coming up`}
                    </button>

                    {showAll && (
                        <div className="mt-4 space-y-4">
                            {groups.map((g) => (
                                <div key={g.category}>
                                    <p
                                        className="text-[10px] font-bold uppercase mb-2"
                                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                    >
                                        {categoryLabel(g.category)}
                                    </p>
                                    <ul className="space-y-2">
                                        {g.windows.map((w) => (
                                            <WindowRow key={w.key} window={w} />
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default ActionWindowsCard
