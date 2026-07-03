// Institutional portfolio navigation — the 6 tabs. Shared by the desktop sidebar
// and the mobile bottom nav (and asserted by tests) so they never drift.

import { isTabActive } from '@/lib/nav-links'

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
    { id: 'team', href: '/portfolio/team', icon: 'badge', label: 'Team' },
    { id: 'alerts', href: '/portfolio/alerts', icon: 'notifications', label: 'Alerts' },
    { id: 'reports', href: '/portfolio/reports', icon: 'assessment', label: 'Reports' },
]

/** Active-route test: exact or sub-route prefix (so detail pages light up their
 * parent tab), via the shared isTabActive helper, plus the `/portfolio` → Today
 * root alias. */
export function isPortfolioNavActive(href: string, pathname: string | null | undefined): boolean {
    if (!pathname) return false
    if (href === '/portfolio/today' && pathname === '/portfolio') return true
    return isTabActive(pathname, href)
}
