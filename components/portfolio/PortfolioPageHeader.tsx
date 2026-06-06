'use client'

/** Section header for portfolio pages — Fraunces title + muted subtitle. */
export interface PortfolioPageHeaderProps {
    title: string
    subtitle: string
}

export function PortfolioPageHeader({ title, subtitle }: PortfolioPageHeaderProps) {
    return (
        <div className="mb-6 lg:mb-8">
            <h1
                className="text-3xl lg:text-4xl font-black tracking-tight"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                {title}
            </h1>
            <p className="mt-1 font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                {subtitle}
            </p>
        </div>
    )
}

export default PortfolioPageHeader
