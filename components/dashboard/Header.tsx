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
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Africa • Farmer
                </h2>
                <h1 className="text-4xl lg:text-5xl font-black text-brand-dark tracking-tight">
                    {getHeaderTitle()}
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <button className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm relative group hover:bg-brand-lime transition-colors">
                    <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-white"></span>
                    <span className="group-hover:text-brand-dark transition-colors">🔔</span>
                </button>
                <Link href="/dashboard/settings">
                    <button className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm relative group hover:bg-brand-lime transition-colors">
                        <span className="group-hover:text-brand-dark transition-colors">⚙️</span>
                    </button>
                </Link>
            </div>
        </header>
    );
};

export default Header;
