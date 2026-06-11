'use client'

/**
 * Institutional portfolio shell layout.
 *
 * Role boundary: only `institutional` users may see `/portfolio/*`; everyone else
 * is redirected to `/dashboard` by RoleGuard. Visual language is identical to the
 * consumer app (cream background, Fraunces headings, sage accents) — only the
 * navigation set and information density differ. Actual portfolio content arrives
 * in Workstream 4; this PR ships the shell + labelled empty states.
 */

import { RoleGuard } from '@/components/auth/RoleGuard'
import { useAuth } from '@/components/providers/AuthProvider'
import { useUserRole } from '@/hooks/useUserRole'
import { PortfolioSidebar } from '@/components/portfolio/PortfolioSidebar'
import { PortfolioMobileNav } from '@/components/portfolio/PortfolioMobileNav'

function PortfolioContent({ children }: { children: React.ReactNode }) {
    const { signOut } = useAuth()
    const { tenantName } = useUserRole()

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--ee-bg)', fontFamily: 'var(--font-body)' }}>
            <PortfolioSidebar className="hidden lg:flex" />

            <main className="flex-1 min-w-0 pb-24 lg:pb-0">
                {/* Top header — mobile shows the brand/tenant; user menu on all sizes. */}
                <header className="flex items-center justify-between px-5 lg:px-8 py-4">
                    <div className="lg:hidden">
                        <p className="text-lg font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                            KurimaSense
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ee-muted)' }}>
                            {tenantName || 'Institutional'}
                        </p>
                    </div>
                    <div className="ml-auto">
                        <button
                            onClick={() => signOut()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold"
                            style={{ background: 'var(--ee-surface)', color: 'var(--ee-muted)', boxShadow: 'var(--shadow-neu)' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                            <span className="hidden sm:inline">Sign out</span>
                        </button>
                    </div>
                </header>

                <div className="px-5 lg:px-8 py-2 lg:py-4 max-w-6xl">{children}</div>
            </main>

            <PortfolioMobileNav />
        </div>
    )
}

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={['institutional']} redirectTo="/dashboard">
            <PortfolioContent>{children}</PortfolioContent>
        </RoleGuard>
    )
}
