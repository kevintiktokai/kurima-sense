'use client'

/**
 * PortfolioPulse — the summary strip: average KurimaScore as the hero number
 * (with its band label/colour) and a pure-CSS stacked distribution bar with a
 * legend. Band colours come from the client's existing band mirror via
 * `distributionToSegments`; the only saturated colour on the strip.
 */

import { scoreToLabel } from '@/lib/field-state-types'
import {
    distributionToSegments,
    type PortfolioSummary,
} from '@/lib/portfolio-utils'

export function PortfolioPulse({ summary }: { summary: PortfolioSummary }) {
    const segments = distributionToSegments(summary.score_distribution)
    const avg = summary.average_kurima_score
    const band = avg != null ? scoreToLabel(avg) : null

    return (
        <div
            className="p-6 lg:p-8"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}
        >
            <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ee-muted)' }}>
                        Average KurimaScore
                    </p>
                    <div className="flex items-baseline gap-3">
                        <span
                            className="text-5xl font-black leading-none"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            {avg != null ? Math.round(avg) : '—'}
                        </span>
                        {band && (
                            <span
                                className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                                style={{ background: `${band.color}1A`, color: band.color }}
                            >
                                {band.label}
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-xs font-bold text-right" style={{ color: 'var(--ee-muted)' }}>
                    {summary.fields_with_data} of {summary.total_fields} fields scored
                </p>
            </div>

            {/* Stacked distribution bar — proportional flexbox widths, no chart lib. */}
            {segments.length > 0 && (
                <>
                    <div
                        className="flex w-full h-3 rounded-full overflow-hidden"
                        role="img"
                        aria-label="Portfolio score distribution"
                        style={{ background: 'var(--ee-bg)' }}
                    >
                        {segments.map((s) => (
                            <div key={s.key} style={{ width: `${s.pct}%`, background: s.color }} />
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                        {segments.map((s) => (
                            <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--ee-muted)' }}>
                                <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                                {s.label}
                            </span>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default PortfolioPulse
