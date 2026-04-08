'use client';

import React from 'react';
import { motion } from 'framer-motion';

const steps = [
    {
        number: '01',
        title: 'Sign Up & Add Your Fields',
        description: 'Create your free account, then draw your field boundaries on our satellite map or drop a pin. Tell us what you\'re growing and when you planted.',
        icon: 'add_location_alt',
    },
    {
        number: '02',
        title: 'Get AI-Powered Insights',
        description: 'Our AI analyzes satellite imagery, weather data, and agricultural science to deliver personalized recommendations for your specific fields and crops.',
        icon: 'insights',
    },
    {
        number: '03',
        title: 'Monitor & Take Action',
        description: 'Track crop health, receive timely alerts for pests, weather risks, and optimal spray windows. Log your activities and watch your yields improve season over season.',
        icon: 'monitoring',
    },
    {
        number: '04',
        title: 'Harvest Better Results',
        description: 'Make data-driven decisions that reduce input waste, increase yields, and build a track record of what works best for your land and climate.',
        icon: 'emoji_events',
    },
];

export default function HowItWorks() {
    return (
        <section
            id="how-it-works"
            className="py-20 md:py-32 relative overflow-hidden"
            style={{ backgroundColor: 'var(--ee-bg-dim)' }}
        >
            {/* Background decoration */}
            <div
                className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{ backgroundColor: 'rgba(15, 184, 133, 0.05)' }}
            />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
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
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--ee-primary)' }}>route</span>
                        How It Works
                    </span>
                    <h2
                        className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        From Signup to{' '}
                        <span
                            className="italic"
                            style={{
                                background: 'linear-gradient(135deg, var(--ee-text), var(--ee-sun))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Smarter Harvests
                        </span>
                    </h2>
                    <p
                        className="text-lg md:text-xl max-w-2xl mx-auto"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        Getting started takes less than 5 minutes. Here&apos;s how KurimaSense transforms the way you farm.
                    </p>
                </motion.div>

                <div className="max-w-4xl mx-auto">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.number}
                            initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="relative flex gap-6 md:gap-10 mb-12 md:mb-16 last:mb-0"
                        >
                            {/* Step number & line */}
                            <div className="flex flex-col items-center">
                                <div
                                    className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{
                                        backgroundColor: 'var(--ee-text)',
                                        boxShadow: 'var(--shadow-ambient)',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '28px', color: 'var(--ee-primary)' }}
                                    >
                                        {step.icon}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className="w-[2px] flex-1 mt-4"
                                        style={{ backgroundColor: 'var(--ee-bg-border)' }}
                                    />
                                )}
                            </div>

                            {/* Content */}
                            <div className="pb-8">
                                <span
                                    className="text-xs font-bold uppercase tracking-widest mb-2 block"
                                    style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                                >
                                    Step {step.number}
                                </span>
                                <h3
                                    className="text-2xl md:text-3xl font-bold mb-3"
                                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                >
                                    {step.title}
                                </h3>
                                <p
                                    className="text-base md:text-lg leading-relaxed max-w-lg"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    {step.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
