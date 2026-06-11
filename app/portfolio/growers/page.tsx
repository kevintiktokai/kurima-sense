'use client'

import { PortfolioPageHeader } from '@/components/portfolio/PortfolioPageHeader'
import { EmptyStateCard } from '@/components/portfolio/EmptyStateCard'

export default function PortfolioGrowersPage() {
    return (
        <>
            <PortfolioPageHeader title="Growers" subtitle="The growers you contract with" />
            <div className="grid gap-6">
                <EmptyStateCard
                    title="Grower Roster"
                    description="Your contracted growers will appear here once you add them — Workstream 3 enables this."
                    icon="groups"
                />
                <div>
                    <button
                        type="button"
                        disabled
                        title="Available in next release"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm uppercase tracking-wider opacity-50 cursor-not-allowed"
                        style={{ background: 'var(--ee-surface)', color: 'var(--ee-muted)', boxShadow: 'var(--shadow-neu)', fontFamily: 'var(--font-body)' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
                        Add Grower
                    </button>
                </div>
            </div>
        </>
    )
}
