'use client'

/**
 * PriorityList — the "Where to focus" list, grouped by urgency with subtle
 * dividers. Renders the backend's worst-first order untouched. "Stable" and
 * "Awaiting first observations" start collapsed (a count + "show" affordance)
 * so attention stays on actionable rows — except in the all-awaiting screen
 * state, where the awaiting group is all there is and renders expanded.
 */

import { useState } from 'react'
import { groupPriorities, type PortfolioPriority, type Urgency } from '@/lib/portfolio-utils'
import { PriorityCard } from '@/components/portfolio/PriorityCard'

export interface PriorityListProps {
    priorities: PortfolioPriority[]
    /** All-awaiting screen state: expand the awaiting group by default. */
    expandAwaiting?: boolean
}

export function PriorityList({ priorities, expandAwaiting = false }: PriorityListProps) {
    const groups = groupPriorities(priorities)
    const [expanded, setExpanded] = useState<Partial<Record<Urgency, boolean>>>({})

    return (
        <div className="space-y-5">
            {groups.map((group) => {
                const defaultExpanded = !group.collapsedByDefault ||
                    (group.urgency === 'awaiting_data' && expandAwaiting)
                const isExpanded = expanded[group.urgency] ?? defaultExpanded

                return (
                    <section key={group.urgency}>
                        <div className="flex items-center gap-3 mb-2.5 px-1">
                            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--ee-muted)' }}>
                                {group.label}
                            </h3>
                            <div className="flex-1 h-px" style={{ background: 'var(--ee-bg-border)' }} />
                            <span className="text-xs font-bold" style={{ color: 'var(--ee-muted)' }}>{group.items.length}</span>
                        </div>

                        {isExpanded ? (
                            <div className="space-y-3">
                                {group.items.map((p) => <PriorityCard key={p.field_id} priority={p} />)}
                                {group.collapsedByDefault && !defaultExpanded && (
                                    <button
                                        onClick={() => setExpanded((e) => ({ ...e, [group.urgency]: false }))}
                                        className="w-full py-2 text-xs font-bold rounded-full"
                                        style={{ color: 'var(--ee-muted)' }}
                                    >
                                        Hide {group.label.toLowerCase()}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => setExpanded((e) => ({ ...e, [group.urgency]: true }))}
                                className="w-full p-4 text-sm font-bold text-left flex items-center justify-between transition-transform hover:scale-[1.01]"
                                style={{ background: 'var(--ee-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-neu)', color: 'var(--ee-muted)' }}
                            >
                                <span>
                                    {group.items.length} {group.urgency === 'awaiting_data' ? 'awaiting' : 'stable'} field{group.items.length === 1 ? '' : 's'} — show
                                </span>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
                            </button>
                        )}
                    </section>
                )
            })}
        </div>
    )
}

export default PriorityList
