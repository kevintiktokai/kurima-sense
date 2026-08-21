"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import InstallButton from '@/components/InstallButton';
import NotificationBell from '@/components/notifications/NotificationBell';

const Header: React.FC = () => {
    const pathname = usePathname();

    const getHeaderTitle = () => {
        if (pathname === '/dashboard') return 'Agro-Feed';
        if (pathname?.startsWith('/dashboard/fields')) return 'My Fields';
        if (pathname?.startsWith('/dashboard/plan')) return 'My Plan';
        if (pathname?.startsWith('/dashboard/chat')) return 'AI Advisory';
        if (pathname?.startsWith('/dashboard/weather')) return 'Climatology';
        if (pathname?.startsWith('/dashboard/settings')) return 'Settings';
        return 'Dashboard';
    };

    return (
        <header className="flex flex-row justify-between items-center mb-6 sm:mb-8 lg:mb-10 gap-3">
            <div className="min-w-0">
                <h2 className="text-[10px] sm:text-sm font-semibold uppercase tracking-widest mb-0.5 sm:mb-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                    Africa · Farmer
                </h2>
                {/* leading-tight + pb-1 give the heading font's descenders (e.g. the "g" in
                    "Agro-Feed") room inside the overflow-hidden truncate box, which otherwise
                    clips them on tight line-height sizes like text-5xl. */}
                <h1 className="text-2xl sm:text-3xl lg:text-5xl font-semibold tracking-tight truncate leading-tight pb-1" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                    {getHeaderTitle()}
                </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <InstallButton />
                {/* Live notification center (centralized notification service) */}
                <NotificationBell />
                {/* Neumorphic circular button — settings */}
                <Link href="/dashboard/settings">
                    <button
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 active:shadow-[var(--shadow-neu-inset)]"
                        style={{
                            backgroundColor: 'var(--ee-bg)',
                            boxShadow: 'var(--shadow-neu)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-text)', fontSize: '20px' }}>settings</span>
                    </button>
                </Link>
            </div>
        </header>
    );
};

export default Header;
