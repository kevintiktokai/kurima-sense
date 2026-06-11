import { cn } from '@/lib/utils'

/**
 * PageContainer — the shared responsive width primitive (Depth Sprint PR A).
 *
 * Centres screen content and caps its width at tablet/desktop so layouts don't
 * sprawl edge-to-edge, while staying **pixel-identical on mobile**: it adds NO
 * base mobile padding (each screen keeps the padding its layout already
 * provides) and NO mobile max-width — only `safe-x` horizontal safe-area insets,
 * which are `0` in portrait / on non-notched devices.
 *
 * Variants:
 *  - `reading` (default) — single-column reading screens: `md:max-w-2xl
 *    lg:max-w-3xl`.
 *  - `wide` — multi-column screens (dashboard, rosters, weather): `lg:max-w-5xl`.
 *
 * Purely presentational: no state, no data, no behaviour.
 */

export type PageContainerVariant = 'reading' | 'wide'

const WIDTH: Record<PageContainerVariant, string> = {
    reading: 'md:max-w-2xl lg:max-w-3xl',
    wide: 'lg:max-w-5xl',
}

export interface PageContainerProps {
    children: React.ReactNode
    variant?: PageContainerVariant
    /** Extra classes (e.g. vertical spacing) merged after the width classes. */
    className?: string
    /** Render element. Defaults to a div. */
    as?: React.ElementType
}

export function PageContainer({ children, variant = 'reading', className, as: Tag = 'div' }: PageContainerProps) {
    return (
        <Tag className={cn('w-full mx-auto safe-x', WIDTH[variant], className)}>
            {children}
        </Tag>
    )
}

export default PageContainer
