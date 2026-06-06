import { PortfolioPageHeader } from '@/components/portfolio/PortfolioPageHeader'
import { EmptyStateCard } from '@/components/portfolio/EmptyStateCard'

export default function PortfolioTodayPage() {
    return (
        <>
            <PortfolioPageHeader title="Today" subtitle="Fields requiring your attention this week" />
            <div className="grid gap-6">
                <EmptyStateCard
                    title="Priority Fields"
                    description="A ranked list of fields requiring intervention will appear here as your portfolio data syncs."
                    icon="priority_high"
                />
                <EmptyStateCard
                    title="Portfolio Summary"
                    description="Aggregated KurimaScore distribution across your contracted growers."
                    icon="dashboard"
                />
                <EmptyStateCard
                    title="High-Severity Alerts"
                    description="Critical events flagged in the last 24 hours across your portfolio."
                    icon="warning"
                />
            </div>
        </>
    )
}
