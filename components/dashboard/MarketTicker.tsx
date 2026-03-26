"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';

interface PriceData {
    price: number;
    unit: string;
    trend: string;
}

const MarketTicker: React.FC = () => {
    const [prices, setPrices] = useState<{ crop: string; price: string; trend: string }[]>([]);

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const data = await api.getMarketPrices("Zimbabwe");
                const priceArray = Object.entries(data.prices).map(([crop, info]: [string, any]) => ({
                    crop,
                    price: `${info.price}${info.unit}`, // Format: 520$/t
                    trend: info.trend
                }));
                setPrices(priceArray);
            } catch (err) {
                console.error("Market ticker error:", err);
                // Fallback — indicative reference prices
                setPrices([
                    { crop: 'Maize', price: '~$285/t', trend: '+1.8%' },
                    { crop: 'Soybean', price: '~$520/t', trend: '+2.4%' },
                    { crop: 'Tobacco', price: '~$3.45/kg', trend: '+1.2%' },
                ]);
            }
        };

        fetchPrices();
        // Refresh every 10 minutes
        const interval = setInterval(fetchPrices, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (prices.length === 0) {
        return (
            <div className="py-2.5 overflow-hidden whitespace-nowrap" style={{ backgroundColor: 'var(--ee-bg-dim)' }}>
                <div className="text-center text-xs font-semibold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Loading market data...</div>
            </div>
        );
    }

    return (
        <div className="py-2.5 overflow-hidden whitespace-nowrap" style={{ backgroundColor: 'var(--ee-bg-dim)' }}>
            <div className="inline-block animate-marquee">
                <span className="mx-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Indicative Prices</span>
                {prices.map((p, i) => (
                    <span key={i} className="mx-8 text-xs font-bold" style={{ fontFamily: 'var(--font-body)' }}>
                        <span className="mr-2 uppercase" style={{ color: 'var(--ee-muted)' }}>{p.crop}</span>
                        <span className="mr-2" style={{ color: 'var(--ee-text)' }}>{p.price}</span>
                        <span style={{ color: p.trend.startsWith('+') ? 'var(--ee-primary)' : '#e06060' }}>{p.trend}</span>
                    </span>
                ))}
                {/* Duplicate for seamless scroll */}
                <span className="mx-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Indicative Prices</span>
                {prices.map((p, i) => (
                    <span key={`dup-${i}`} className="mx-8 text-xs font-bold" style={{ fontFamily: 'var(--font-body)' }}>
                        <span className="mr-2 uppercase" style={{ color: 'var(--ee-muted)' }}>{p.crop}</span>
                        <span className="mr-2" style={{ color: 'var(--ee-text)' }}>{p.price}</span>
                        <span style={{ color: p.trend.startsWith('+') ? 'var(--ee-primary)' : '#e06060' }}>{p.trend}</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default MarketTicker;
