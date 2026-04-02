"use client";

import React from 'react';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';

const MarketTicker: React.FC = () => {
    const { marketData } = useDashboardData();

    // Derive price array from shared market data
    const prices = marketData?.prices
        ? Object.entries(marketData.prices).map(([crop, info]: [string, any]) => ({
            crop,
            price: `${info.price}${info.unit}`,
            trend: info.trend,
        }))
        : [];

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
