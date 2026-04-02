"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';

const Header: React.FC = () => {
    const pathname = usePathname();
    const { fields, marketData } = useDashboardData();

    // Compute yield value from shared data (no independent fetch)
    const yieldValue = useMemo(() => {
        if (!fields.length || !marketData?.prices) return "—";

        let totalValue = 0;
        for (const field of fields) {
            const crop = field.crop;
            const projectedYield = (field as any).projected_yield || (field.area * 5);
            const priceData = marketData.prices[crop];

            if (priceData) {
                let pricePerTonne = priceData.price;
                if (priceData.unit === "$/kg") {
                    pricePerTonne = priceData.price * 1000;
                } else if (priceData.unit === "$/lb") {
                    pricePerTonne = priceData.price * 2204.62;
                }
                totalValue += projectedYield * pricePerTonne;
            }
        }

        return `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [fields, marketData]);

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
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                    Africa · Farmer
                </h2>
                <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                    {getHeaderTitle()}
                </h1>
            </div>

            <div className="flex items-center gap-4">
                {/* Neumorphic circular button — notification */}
                <button
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:shadow-[var(--shadow-neu-inset)]"
                    style={{
                        backgroundColor: 'var(--ee-bg)',
                        boxShadow: 'var(--shadow-neu)',
                    }}
                >
                    <span className="relative">
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-text)', fontSize: '22px' }}>notifications</span>
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--ee-sun)' }}></span>
                    </span>
                </button>
                {/* Neumorphic circular button — settings */}
                <Link href="/dashboard/settings">
                    <button
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:shadow-[var(--shadow-neu-inset)]"
                        style={{
                            backgroundColor: 'var(--ee-bg)',
                            boxShadow: 'var(--shadow-neu)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-text)', fontSize: '22px' }}>settings</span>
                    </button>
                </Link>
            </div>
        </header>
    );
};

export default Header;
