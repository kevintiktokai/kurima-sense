'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PORTFOLIO_NAV_ITEMS, isPortfolioNavActive } from './nav'
import { useUserRole } from '@/hooks/useUserRole'

/** Desktop side navigation for the institutional portfolio shell. Mirrors the
 * consumer Sidebar's tokens and active-state pattern. */
export function PortfolioSidebar({ className = '' }: { className?: string }) {
    const pathname = usePathname()
    const { tenantName } = useUserRole()

    return (
        <aside
            className={`w-64 flex-col p-4 ${className}`}
            style={{ background: 'var(--ee-bg-dim)' }}
        >
            <div className="px-3 py-4 mb-2">
                <p className="text-xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                    KurimaSense
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--ee-muted)' }}>
                    {tenantName || 'Institutional'}
                </p>
            </div>

            <nav className="flex flex-col gap-1">
                {PORTFOLIO_NAV_ITEMS.map((item) => {
                    const active = isPortfolioNavActive(item.href, pathname)
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                            style={{
                                backgroundColor: active ? 'var(--ee-surface)' : 'transparent',
                                boxShadow: active ? 'var(--shadow-neu)' : 'none',
                                color: active ? 'var(--ee-text)' : 'var(--ee-muted)',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0", color: active ? 'var(--ee-primary)' : 'var(--ee-muted)' }}
                            >
                                {item.icon}
                            </span>
                            <span className="text-sm font-bold">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}

export default PortfolioSidebar
