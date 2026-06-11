'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PORTFOLIO_NAV_ITEMS, isPortfolioNavActive } from './nav'

/** Mobile bottom navigation for the institutional portfolio shell. Mirrors the
 * consumer MobileNav layout/tokens. */
export function PortfolioMobileNav() {
    const pathname = usePathname()

    return (
        <nav
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
            style={{ background: 'var(--ee-surface)', boxShadow: '0 -4px 24px rgba(47,47,44,0.08)' }}
        >
            {PORTFOLIO_NAV_ITEMS.map((item) => {
                const active = isPortfolioNavActive(item.href, pathname)
                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full"
                        style={{ color: active ? 'var(--ee-primary)' : 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0", fontSize: 24 }}
                        >
                            {item.icon}
                        </span>
                        <span className="text-[10px] font-bold">{item.label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}

export default PortfolioMobileNav
