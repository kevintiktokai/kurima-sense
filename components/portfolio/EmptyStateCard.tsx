'use client'

/**
 * EmptyStateCard — a labelled placeholder that frames what will populate a
 * portfolio section in a later workstream. Uses the consumer app's visual
 * language (cream/surface, neumorphic shadow, Fraunces heading). Deliberately
 * NOT "Coming soon" — it reads as the feature coming online progressively.
 */

export interface EmptyStateCardProps {
    title: string
    description: string
    icon: string // Material Symbols ligature name
    /** Small status chip, e.g. "Building". */
    pendingLabel?: string
}

export function EmptyStateCard({ title, description, icon, pendingLabel = 'Building' }: EmptyStateCardProps) {
    return (
        <div
            className="p-6 lg:p-8"
            style={{ background: 'var(--ee-surface)', borderRadius: 'var(--radius-ee-lg, 24px)', boxShadow: 'var(--shadow-neu)' }}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--ee-bg)', color: 'var(--ee-primary)' }}
                    >
                        <span className="material-symbols-outlined">{icon}</span>
                    </div>
                    <h3 className="text-lg font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        {title}
                    </h3>
                </div>
                {pendingLabel && (
                    <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0"
                        style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)' }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ee-sun)' }} />
                        {pendingLabel}
                    </span>
                )}
            </div>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                {description}
            </p>
            {/* Skeleton lines that frame the eventual content. */}
            <div className="mt-5 space-y-2.5" aria-hidden="true">
                <div className="h-3 rounded-full" style={{ background: 'var(--ee-bg)', width: '92%' }} />
                <div className="h-3 rounded-full" style={{ background: 'var(--ee-bg)', width: '78%' }} />
                <div className="h-3 rounded-full" style={{ background: 'var(--ee-bg)', width: '60%' }} />
            </div>
        </div>
    )
}

export default EmptyStateCard
