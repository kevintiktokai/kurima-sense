'use client'

/**
 * GrowerCard — one row of the growers roster. Shows the grower's name, phone,
 * derived field stats, and a "worst field" chip (band colour from the existing
 * score mirror; grey "Awaiting" when their fields lack data; no chip when they
 * have no fields). Links to /portfolio/growers/{id}.
 */

import Link from 'next/link'
import type { GrowerWithStats } from '@/lib/portfolio-utils'

export function GrowerCard({ grower }: { grower: GrowerWithStats }) {
    const g = grower
    const hasFields = g.field_count > 0
    const meta = hasFields ? `${g.field_count} field${g.field_count === 1 ? '' : 's'} · ${g.total_hectares} ha` : 'No fields yet'

    return (
        <Link
            href={`/portfolio/growers/${g.id}`}
            className="block transition-transform hover:scale-[1.01]"
            style={{ background: 'var(--ee-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-neu)' }}
        >
            <div className="flex items-center gap-3 p-4 lg:p-5">
                <div className="min-w-0 flex-1">
                    <p className="text-sm lg:text-base font-black truncate" style={{ color: 'var(--ee-text)' }}>
                        {g.name}
                    </p>
                    <p className="text-xs font-bold mt-0.5 truncate" style={{ color: 'var(--ee-muted)' }}>
                        {meta}{g.phone ? ` · ${g.phone}` : ''}
                    </p>
                </div>

                {hasFields && (
                    <div className="text-right flex-shrink-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ee-muted)' }}>
                            Worst field
                        </p>
                        {g.worst_score != null ? (
                            <span
                                className="px-2.5 py-1 rounded-full text-xs font-black whitespace-nowrap"
                                style={{ background: `${g.worst_color}1A`, color: g.worst_color || 'var(--ee-text)' }}
                                title={g.worst_label || undefined}
                            >
                                {g.worst_score}
                                {g.worst_label && <span className="ml-1 uppercase tracking-wider text-[10px]">{g.worst_label}</span>}
                            </span>
                        ) : (
                            <span
                                className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                                style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)' }}
                            >
                                Awaiting data
                            </span>
                        )}
                    </div>
                )}

                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 20, color: 'var(--ee-muted)' }}>
                    chevron_right
                </span>
            </div>
        </Link>
    )
}

export default GrowerCard
