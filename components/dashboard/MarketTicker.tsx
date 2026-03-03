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
                // Fallback to static data
                setPrices([
                    { crop: 'Maize', price: '$285/t', trend: '+1.8%' },
                    { crop: 'Wheat', price: '$340/t', trend: '-0.3%' },
                    { crop: 'Soybean', price: '$520/t', trend: '+2.4%' },
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
            <div className="bg-brand-dark py-2 overflow-hidden whitespace-nowrap border-b border-brand-lime/10">
                <div className="text-center text-slate-400 text-xs font-bold">Loading market data...</div>
            </div>
        );
    }

    return (
        <div className="bg-brand-dark py-2 overflow-hidden whitespace-nowrap border-b border-brand-lime/10">
            <div className="inline-block animate-marquee">
                {prices.map((p, i) => (
                    <span key={i} className="mx-8 text-xs font-bold">
                        <span className="text-slate-400 mr-2 uppercase">{p.crop}</span>
                        <span className="text-white mr-2">{p.price}</span>
                        <span className={p.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}>{p.trend}</span>
                    </span>
                ))}
                {/* Duplicate for seamless scroll */}
                {prices.map((p, i) => (
                    <span key={`dup-${i}`} className="mx-8 text-xs font-bold">
                        <span className="text-slate-400 mr-2 uppercase">{p.crop}</span>
                        <span className="text-white mr-2">{p.price}</span>
                        <span className={p.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}>{p.trend}</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default MarketTicker;
