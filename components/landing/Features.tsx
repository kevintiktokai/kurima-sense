'use client';

import React from 'react';
import { motion } from 'framer-motion';

const features = [
    {
        icon: 'satellite_alt',
        title: 'Satellite Crop Monitoring',
        description: 'Track NDVI, soil moisture, and crop health across all your fields with real-time satellite imagery updated every few days.',
        color: 'var(--ee-primary)',
        bgColor: 'rgba(15, 184, 133, 0.08)',
    },
    {
        icon: 'smart_toy',
        title: 'AI Agronomist',
        description: 'Get instant, personalized farming advice from an AI trained on decades of agricultural science — available 24/7 in your pocket.',
        color: 'var(--ee-sun)',
        bgColor: 'rgba(232, 163, 101, 0.08)',
    },
    {
        icon: 'analytics',
        title: 'Yield Forecasting',
        description: 'Predict harvest outcomes with confidence bands powered by machine learning, weather data, and historical performance.',
        color: 'var(--ee-water)',
        bgColor: 'rgba(92, 158, 173, 0.08)',
    },
    {
        icon: 'map',
        title: 'Field Management',
        description: 'Draw field boundaries on satellite maps, track planting dates, manage crops, and monitor every hectare from one dashboard.',
        color: 'var(--ee-primary)',
        bgColor: 'rgba(15, 184, 133, 0.08)',
    },
    {
        icon: 'bug_report',
        title: 'Pest & Disease Alerts',
        description: 'Receive early warnings about pest threats and disease pressure based on weather patterns, location data, and AI risk analysis.',
        color: 'var(--ee-sun)',
        bgColor: 'rgba(232, 163, 101, 0.08)',
    },
    {
        icon: 'cloud',
        title: 'Weather Intelligence',
        description: 'Hyperlocal forecasts, spray windows, frost alerts, and historical comparisons tailored to each of your fields.',
        color: 'var(--ee-water)',
        bgColor: 'rgba(92, 158, 173, 0.08)',
    },
];

export default function Features() {
    return (
        <section
            id="features"
            className="py-20 md:py-32"
            style={{ backgroundColor: 'var(--ee-bg)' }}
        >
            <div className="container mx-auto px-4 sm:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16 md:mb-20"
                >
                    <span
                        className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6"
                        style={{
                            backgroundColor: 'var(--ee-bg-pressed)',
                            color: 'var(--ee-text)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--ee-primary)' }}>auto_awesome</span>
                        Platform Features
                    </span>
                    <h2
                        className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        Everything You Need to{' '}
                        <span
                            className="italic"
                            style={{
                                background: 'linear-gradient(135deg, var(--ee-text), var(--ee-primary))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Farm Smarter
                        </span>
                    </h2>
                    <p
                        className="text-lg md:text-xl max-w-2xl mx-auto"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        From satellite imagery to AI-powered insights, KurimaSense gives you the tools to make data-driven decisions at every stage of your growing season.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: index * 0.08 }}
                            className="neu-surface p-6 sm:p-8 md:p-10 group hover:scale-[1.02] transition-transform duration-300 cursor-default"
                        >
                            <div
                                className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                                style={{ backgroundColor: feature.bgColor }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '28px', color: feature.color }}
                                >
                                    {feature.icon}
                                </span>
                            </div>
                            <h3
                                className="text-xl md:text-2xl font-bold mb-3"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                            >
                                {feature.title}
                            </h3>
                            <p
                                className="text-base leading-relaxed"
                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                            >
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
