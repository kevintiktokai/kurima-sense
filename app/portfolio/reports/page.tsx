import { PortfolioPageHeader } from '@/components/portfolio/PortfolioPageHeader'
import { EmptyStateCard } from '@/components/portfolio/EmptyStateCard'
import { PageContainer } from '@/components/layout/PageContainer'

export default function PortfolioReportsPage() {
    return (
        <PageContainer variant="reading">
            <PortfolioPageHeader title="Reports" subtitle="Portfolio-level reporting and exports" />
            <div className="grid gap-6">
                <EmptyStateCard
                    title="Yield Forecast Reports"
                    description="Season yield projections aggregated across your contracted growers."
                    icon="analytics"
                />
                <EmptyStateCard
                    title="Contract Performance"
                    description="Delivery versus projection, by grower and by season."
                    icon="assessment"
                />
                <EmptyStateCard
                    title="Sustainability Reports"
                    description="Input use, water balance and stewardship metrics for reporting."
                    icon="eco"
                />
            </div>
        </PageContainer>
    )
}
