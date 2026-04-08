'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const sampleInsights = [
    {
        type: 'risk',
        severity: 'high',
        icon: 'warning',
        title: 'Fall Armyworm Risk Elevated',
        body: 'Based on current humidity (78%) and temperature patterns in Mashonaland East, fall armyworm pressure is likely to increase this week. Consider scouting maize fields and applying preventive measures.',
        time: '2 hours ago',
        color: '#E85D4A',
    },
    {
        type: 'opportunity',
        severity: 'medium',
        icon: 'wb_sunny',
        title: 'Optimal Spray Window Tomorrow',
        body: 'Wind speeds dropping below 10 km/h with no rain forecast for 48 hours. Ideal conditions for foliar application on your wheat fields between 6:00 AM and 10:00 AM.',
        time: '4 hours ago',
        color: 'var(--ee-sun)',
    },
    {
        type: 'insight',
        severity: 'info',
        icon: 'eco',
        title: 'NDVI Improvement Detected',
        body: 'Your Field 3 (Soya beans) shows a 12% NDVI increase over the past 14 days, indicating strong vegetative growth. Current trajectory suggests above-average yield potential.',
        time: '6 hours ago',
        color: 'var(--ee-primary)',
    },
    {
        type: 'action',
        severity: 'medium',
        icon: 'water_drop',
        title: 'Irrigation Recommendation',
        body: 'Soil moisture estimates for your maize field are dropping below optimal levels. With no significant rainfall expected for 5 days, consider scheduling irrigation within the next 48 hours.',
        time: '8 hours ago',
        color: 'var(--ee-water)',
    },
    {
        type: 'market',
        severity: 'info',
        icon: 'show_chart',
        title: 'Seasonal Planting Advisory',
        body: 'Based on 10-year climate data for your region, the optimal planting window for summer crops begins in approximately 3 weeks. Start preparing your seed beds now for best results.',
        time: '12 hours ago',
        color: 'var(--ee-primary)',
    },
];

export default function AIInsights() {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % sampleInsights.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section
            id="ai-insights"
            className="py-20 md:py-32 relative overflow-hidden"
            style={{ backgroundColor: 'var(--ee-text)' }}
        >
            {/* Background glow */}
            <div
                className="absolute top-1/2 left-1/2 w-[800px] h-[800px] rounded-full blur-[150px] pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{ backgroundColor: 'rgba(15, 184, 133, 0.08)' }}
            />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 lg:gap-20 items-center">
                    {/* Text Side */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <span
                            className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6"
                            style={{
                                backgroundColor: 'rgba(15, 184, 133, 0.15)',
                                color: 'var(--ee-primary)',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>psychology</span>
                            AI-Powered Intelligence
                        </span>
                        <h2
                            className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6"
                            style={{ color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}
                        >
                            Your AI Agronomist,{' '}
                            <span
                                className="italic"
                                style={{
                                    background: 'linear-gradient(135deg, var(--ee-primary), var(--ee-sun))',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Always On
                            </span>
                        </h2>
                        <p
                            className="text-lg md:text-xl mb-8 leading-relaxed"
                            style={{ color: 'rgba(255, 255, 255, 0.55)', fontFamily: 'var(--font-body)' }}
                        >
                            KurimaSense continuously analyzes satellite data, weather patterns, and agricultural research to deliver actionable insights specific to your fields, crops, and region. No guesswork — just intelligence.
                        </p>

                        <div className="space-y-4">
                            {[
                                'Proactive risk alerts before problems escalate',
                                'Personalized recommendations for your exact location',
                                'Data-backed advice grounded in agricultural science',
                                'Natural language chat — ask anything, anytime',
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <span
                                        className="material-symbols-outlined flex-shrink-0 mt-0.5"
                                        style={{ fontSize: '20px', color: 'var(--ee-primary)' }}
                                    >
                                        check_circle
                                    </span>
                                    <span
                                        className="text-base font-medium"
                                        style={{ color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'var(--font-body)' }}
                                    >
                                        {item}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Live Insight Cards */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        {/* Mock phone/card frame */}
                        <div
                            className="rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 md:p-8"
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'rgba(15, 184, 133, 0.2)' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--ee-primary)' }}>smart_toy</span>
                                </div>
                                <div>
                                    <h4
                                        className="text-sm font-bold"
                                        style={{ color: '#FFFFFF', fontFamily: 'var(--font-body)' }}
                                    >
                                        KurimaSense AI
                                    </h4>
                                    <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'var(--font-body)' }}>
                                        Live insights feed
                                    </p>
                                </div>
                                <div className="ml-auto flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-[var(--ee-primary)] animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}>Live</span>
                                </div>
                            </div>

                            <div className="space-y-4 min-h-[280px] sm:min-h-[320px]">
                                <AnimatePresence mode="wait">
                                    {sampleInsights.map((insight, i) => (
                                        i === activeIndex && (
                                            <motion.div
                                                key={insight.title}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ duration: 0.4 }}
                                                className="rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 md:p-6"
                                                style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                                }}
                                            >
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div
                                                        className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                                                        style={{ backgroundColor: `${insight.color}20` }}
                                                    >
                                                        <span
                                                            className="material-symbols-outlined"
                                                            style={{ fontSize: '22px', color: insight.color }}
                                                        >
                                                            {insight.icon}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4
                                                            className="text-base font-bold mb-1"
                                                            style={{ color: '#FFFFFF', fontFamily: 'var(--font-body)' }}
                                                        >
                                                            {insight.title}
                                                        </h4>
                                                        <span
                                                            className="text-[10px] font-bold uppercase tracking-wider"
                                                            style={{ color: 'rgba(255, 255, 255, 0.3)', fontFamily: 'var(--font-body)' }}
                                                        >
                                                            {insight.time}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p
                                                    className="text-sm leading-relaxed"
                                                    style={{ color: 'rgba(255, 255, 255, 0.55)', fontFamily: 'var(--font-body)' }}
                                                >
                                                    {insight.body}
                                                </p>
                                            </motion.div>
                                        )
                                    ))}
                                </AnimatePresence>

                                {/* Dots indicator */}
                                <div className="flex justify-center gap-2 pt-4">
                                    {sampleInsights.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setActiveIndex(i)}
                                            className="w-2 h-2 rounded-full transition-all duration-300"
                                            style={{
                                                backgroundColor: i === activeIndex ? 'var(--ee-primary)' : 'rgba(255, 255, 255, 0.15)',
                                                transform: i === activeIndex ? 'scale(1.3)' : 'scale(1)',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
