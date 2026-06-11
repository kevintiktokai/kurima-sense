'use client'

/**
 * FieldRowCard — the shared tappable field row used by both portfolio lists.
 * Links to the institutional field detail at /portfolio/fields/{id}. The accent
 * bar and the score chip are the only saturated colour; the band colour comes
 * straight from the API payload (`kurima_color`).
 *
 * variant:
 *  - 'priority' (Today / "Where to focus"): meta `district · crop · ha`, then
 *    primary_concern, recommended_action (arrow), and the days footer. This is
 *    the exact row Today rendered before extraction — pixel-identical.
 *  - 'roster' (Fields): meta `district · crop · variety · ha`, then
 *    primary_concern only (no action, no footer — a roster, not an action list).
 */

import Link from 'next/link'
import { humanizeCrop, type PortfolioPriority } from '@/lib/portfolio-utils'

const AWAITING_ACCENT = 'var(--ee-bg-pressed)'

export type FieldRowVariant = 'priority' | 'roster'

export function FieldRowCard({ priority, variant = 'priority' }: { priority: PortfolioPriority; variant?: FieldRowVariant }) {
    const p = priority
    const awaiting = p.urgency === 'awaiting_data' || p.kurima_score == null
    const accent = awaiting ? AWAITING_ACCENT : (p.kurima_color || 'var(--ee-muted)')

    const metaLine = [
        p.district,
        humanizeCrop(p.crop_type),
        variant === 'roster' ? p.variety : null,
        p.size_hectares ? `${p.size_hectares} ha` : null,
    ].filter(Boolean).join(' · ')

    const footerParts: string[] = []
    if (variant === 'priority') {
        if (p.days_since_planting != null) footerParts.push(`Day ${p.days_since_planting} since planting`)
        if (p.days_since_observation != null) footerParts.push(`observed ${p.days_since_observation}d ago`)
    }

    return (
        <Link
            href={`/portfolio/fields/${p.field_id}`}
            className="block transition-transform hover:scale-[1.01]"
            style={{ background: 'var(--ee-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-neu)' }}
        >
            <div className="flex">
                {/* Accent bar */}
                <div className="w-1.5 rounded-l-[20px] flex-shrink-0" style={{ background: accent }} aria-hidden="true" />

                <div className="flex-1 min-w-0 p-4 lg:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm lg:text-base leading-snug truncate" style={{ color: 'var(--ee-text)' }}>
                                {p.grower_name && <span className="font-black">{p.grower_name}</span>}
                                {p.grower_name && p.field_name && <span style={{ color: 'var(--ee-muted)' }}> — </span>}
                                <span className="font-medium">{p.field_name}</span>
                            </p>
                            {metaLine && (
                                <p className="text-xs font-bold mt-0.5 truncate" style={{ color: 'var(--ee-muted)' }}>
                                    {metaLine}
                                </p>
                            )}
                        </div>

                        {/* Score chip */}
                        {awaiting ? (
                            <span
                                className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap flex-shrink-0"
                                style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)' }}
                            >
                                Awaiting data
                            </span>
                        ) : (
                            <span
                                className="px-2.5 py-1 rounded-full text-xs font-black whitespace-nowrap flex-shrink-0"
                                style={{ background: `${p.kurima_color}1A`, color: p.kurima_color || 'var(--ee-text)' }}
                                title={p.kurima_label || undefined}
                            >
                                {p.kurima_score}
                                {p.kurima_label && <span className="ml-1 uppercase tracking-wider text-[10px]">{p.kurima_label}</span>}
                            </span>
                        )}
                    </div>

                    <p className="text-sm mt-2.5 leading-snug" style={{ color: 'var(--ee-text)' }}>
                        {p.primary_concern}
                    </p>

                    {variant === 'priority' && (
                        <p className="text-sm font-bold mt-1 flex items-start gap-1 leading-snug" style={{ color: 'var(--ee-text)' }}>
                            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 16, color: 'var(--ee-primary)', marginTop: 1 }}>
                                arrow_forward
                            </span>
                            {p.recommended_action}
                        </p>
                    )}

                    {footerParts.length > 0 && (
                        <p className="text-[11px] font-bold mt-2" style={{ color: 'var(--ee-muted)' }}>
                            {footerParts.join(' · ')}
                        </p>
                    )}
                </div>
            </div>
        </Link>
    )
}

export default FieldRowCard
