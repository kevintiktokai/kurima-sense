'use client';

import React from 'react';
import { motion } from 'framer-motion';

const segments = [
    {
        id: 'farmers',
        title: 'For Commercial Farmers',
        subtitle: 'Optimize Yields at Scale',
        description: 'Monitor crop health with satellite precision, predict yields, and track input costs to maximize profitability.',
        features: ['Satellite NDVI Monitoring', 'Yield Forecasting', 'Input Cost Tracking'],
        icon: 'agriculture',
        illustrationIcon: 'satellite_alt',
        gradientFrom: 'rgba(15, 184, 133, 0.12)',
        gradientTo: 'rgba(45, 58, 48, 0.08)',
    },
    {
        id: 'agronomists',
        title: 'For Agronomists',
        subtitle: 'Data-Driven Advisory',
        description: 'Manage multiple clients, validate advice with real-time data, and generate professional reports instantly.',
        features: ['Multi-Client Dashboard', 'Data Validation', 'Automated Reporting'],
        icon: 'science',
        illustrationIcon: 'dashboard',
        gradientFrom: 'rgba(232, 163, 101, 0.12)',
        gradientTo: 'rgba(92, 158, 173, 0.08)',
    },
    {
        id: 'hobbyists',
        title: 'For Hobbyists',
        subtitle: 'Grow Like a Pro',
        description: 'Turn your backyard into a food forest with AI guidance tailored to small spaces and organic methods.',
        features: ['AI Pest Identification', 'Organic Tips', 'Community Support'],
        icon: 'yard',
        illustrationIcon: 'eco',
        gradientFrom: 'rgba(92, 158, 173, 0.12)',
        gradientTo: 'rgba(15, 184, 133, 0.08)',
    },
];

export default function Segments() {
    return (
        <section
            className="py-16 md:py-24"
            id="for-farmers"
            style={{ backgroundColor: 'var(--ee-bg)' }}
        >
            <div className="container mx-auto px-4 sm:px-6">
                <div className="text-center mb-12 md:mb-20">
                    <span
                        className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6"
                        style={{
                            backgroundColor: 'var(--ee-bg-pressed)',
                            color: 'var(--ee-text)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--ee-primary)' }}>diversity_3</span>
                        Who It&apos;s For
                    </span>
                    <h2
                        className="text-3xl md:text-5xl font-black mb-4 tracking-tight"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        Built for Every Grower
                    </h2>
                    <p
                        className="text-lg md:text-xl max-w-2xl mx-auto"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        Whether you manage thousands of hectares or a single greenhouse, KurimaSense adapts to your needs.
                    </p>
                </div>

                <div className="space-y-20 md:space-y-32">
                    {segments.map((segment, index) => (
                        <motion.div
                            key={segment.id}
                            id={segment.id}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                            className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-10 md:gap-12 lg:gap-20`}
                        >
                            {/* Illustration Side */}
                            <div className="w-full lg:w-1/2 relative group">
                                <div
                                    className="absolute inset-0 rounded-[24px] transform rotate-3 scale-95 group-hover:rotate-6 transition-transform duration-500"
                                    style={{ backgroundColor: segment.gradientFrom }}
                                />
                                <div
                                    className="relative overflow-hidden rounded-[24px] aspect-[4/3] flex items-center justify-center"
                                    style={{
                                        background: `linear-gradient(135deg, ${segment.gradientFrom}, ${segment.gradientTo})`,
                                        boxShadow: 'var(--shadow-ambient)',
                                    }}
                                >
                                    {/* Large background icon */}
                                    <span
                                        className="material-symbols-outlined absolute opacity-[0.06]"
                                        style={{ fontSize: '280px', color: 'var(--ee-text)' }}
                                    >
                                        {segment.illustrationIcon}
                                    </span>

                                    {/* Center icon */}
                                    <div className="relative z-10 flex flex-col items-center gap-4">
                                        <div
                                            className="w-24 h-24 md:w-28 md:h-28 rounded-[24px] flex items-center justify-center group-hover:scale-110 transition-transform duration-500"
                                            style={{
                                                backgroundColor: 'var(--ee-surface)',
                                                boxShadow: 'var(--shadow-ambient)',
                                            }}
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '48px', color: 'var(--ee-primary)' }}
                                            >
                                                {segment.illustrationIcon}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Feature Card Overlay */}
                                    <div
                                        className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 p-4 md:p-6 rounded-[16px] translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500"
                                        style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            backdropFilter: 'blur(20px)',
                                            WebkitBackdropFilter: 'blur(20px)',
                                            boxShadow: 'var(--shadow-ambient)',
                                        }}
                                    >
                                        <div className="flex flex-wrap gap-2 md:gap-3">
                                            {segment.features.map((feat, i) => (
                                                <span
                                                    key={i}
                                                    className="text-[10px] md:text-xs font-bold uppercase tracking-wider px-3 md:px-4 py-1.5 rounded-full"
                                                    style={{
                                                        backgroundColor: 'rgba(15, 184, 133, 0.1)',
                                                        color: 'var(--ee-text)',
                                                        fontFamily: 'var(--font-body)',
                                                    }}
                                                >
                                                    {feat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Text Side */}
                            <div className="w-full lg:w-1/2">
                                <span
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 md:mb-6"
                                    style={{
                                        backgroundColor: 'var(--ee-text)',
                                        color: '#FFFFFF',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                        {segment.icon}
                                    </span>
                                    {segment.title}
                                </span>
                                <h3
                                    className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 leading-none"
                                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                >
                                    {segment.subtitle}
                                </h3>
                                <p
                                    className="text-base md:text-lg mb-6 md:mb-8 leading-relaxed"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    {segment.description}
                                </p>
                                <button
                                    className="font-bold text-base md:text-lg group flex items-center gap-2 transition-colors"
                                    style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ee-text)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ee-primary)')}
                                >
                                    Learn more
                                    <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform" style={{ fontSize: '20px' }}>
                                        arrow_forward
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
