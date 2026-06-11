import { PortfolioPageHeader } from '@/components/portfolio/PortfolioPageHeader'
import { EmptyStateCard } from '@/components/portfolio/EmptyStateCard'

export default function PortfolioFieldsPage() {
    return (
        <>
            <PortfolioPageHeader title="Fields" subtitle="Every field across your contracted portfolio" />
            <div className="grid gap-6">
                <EmptyStateCard
                    title="Field Portfolio List"
                    description="Full list of your contracted fields with filters and search."
                    icon="grass"
                />
                <EmptyStateCard
                    title="Regional Distribution"
                    description="Map view of fields by Natural Region."
                    icon="map"
                />
                <EmptyStateCard
                    title="Crop Mix"
                    description="Breakdown of contracted crops across the portfolio."
                    icon="pie_chart"
                />
            </div>
        </>
    )
}
