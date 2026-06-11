import { PortfolioPageHeader } from '@/components/portfolio/PortfolioPageHeader'
import { EmptyStateCard } from '@/components/portfolio/EmptyStateCard'

export default function PortfolioAlertsPage() {
    return (
        <>
            <PortfolioPageHeader title="Alerts" subtitle="Aggregated events across your portfolio" />
            <div className="grid gap-6">
                <EmptyStateCard
                    title="Critical Alerts"
                    description="High-severity events across your contracted fields, ranked by urgency."
                    icon="warning"
                />
                <EmptyStateCard
                    title="Active Anomalies"
                    description="Fields whose KurimaScore or indices are trending against expectation."
                    icon="trending_down"
                />
                <EmptyStateCard
                    title="Resolved This Week"
                    description="Alerts that have cleared in the last seven days."
                    icon="task_alt"
                />
            </div>
        </>
    )
}
