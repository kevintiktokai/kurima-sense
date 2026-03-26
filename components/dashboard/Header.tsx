"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/services/api';

const Header: React.FC = () => {
    const pathname = usePathname();
    const [yieldValue, setYieldValue] = useState<string>("$0");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const calculateYieldValue = async () => {
            try {
                const [fields, marketData] = await Promise.all([
                    api.getFields(),
                    api.getMarketPrices("Zimbabwe")
                ]);

                let totalValue = 0;

                for (const field of fields) {
                    const crop = field.crop;
                    const projectedYield = field.projected_yield || (field.area * 5); // tonnes
                    const priceData = marketData.prices[crop];

                    if (priceData) {
                        // Handle different units
                        let pricePerTonne = priceData.price;
                        if (priceData.unit === "$/kg") {
                            pricePerTonne = priceData.price * 1000; // Convert to $/t
                        } else if (priceData.unit === "$/lb") {
                            pricePerTonne = priceData.price * 2204.62; // Convert to $/t
                        }

                        totalValue += projectedYield * pricePerTonne;
                    }
                }

                setYieldValue(`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            } catch (err) {
                console.error("Yield value calculation error:", err);
                setYieldValue("$14,820.00"); // Fallback
            } finally {
                setLoading(false);
            }
        };

        calculateYieldValue();
        // Refresh every 5 minutes
        const interval = setInterval(calculateYieldValue, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

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
