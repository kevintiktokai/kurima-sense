// Institutional portfolio navigation — the 5 tabs. Shared by the desktop sidebar
// and the mobile bottom nav (and asserted by tests) so they never drift.

export interface PortfolioNavItem {
    id: string
    href: string
    icon: string // Material Symbols ligature name
    label: string
}

export const PORTFOLIO_NAV_ITEMS: PortfolioNavItem[] = [
    { id: 'today', href: '/portfolio/today', icon: 'today', label: 'Today' },
    { id: 'fields', href: '/portfolio/fields', icon: 'grass', label: 'Fields' },
    { id: 'growers', href: '/portfolio/growers', icon: 'groups', label: 'Growers' },
    { id: 'alerts', href: '/portfolio/alerts', icon: 'notifications', label: 'Alerts' },
    { id: 'reports', href: '/portfolio/reports', icon: 'assessment', label: 'Reports' },
]

/** Active-route test mirroring the consumer nav's `startsWith` logic. */
export function isPortfolioNavActive(href: string, pathname: string | null | undefined): boolean {
    if (!pathname) return false
    if (href === '/portfolio/today' && pathname === '/portfolio') return true
    return pathname === href || pathname.startsWith(href + '/') || pathname === href
}
