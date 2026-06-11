'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LineChart, Landmark, ShieldHalf, ArrowRight } from 'lucide-react';

const cards = [
    {
        eyebrow: 'Agricultural buyers',
        heading: 'Pre-harvest yield forecasts',
        description:
            'Growing-zone yield intelligence for contract pricing, procurement planning, and logistics — with confidence bands you can build a position on.',
        href: '/for-buyers',
        icon: LineChart,
    },
    {
        eyebrow: 'Lenders',
        heading: 'Field-level risk scoring',
        description:
            'Default-probability scoring for smallholder agricultural lending, backed by satellite history and ground truth, explainable down to the input.',
        href: '/for-lenders',
        icon: Landmark,
    },
    {
        eyebrow: 'Insurers',
        heading: 'Parametric insurance triggers',
        description:
            'Index-based crop insurance triggers and independent verification for automated payouts and reduced basis risk.',
        href: '/for-insurers',
        icon: ShieldHalf,
    },
];

export default function ForOrganizations() {
    const reduceMotion = useReducedMotion();
    return (
        <section className="py-20 md:py-28" id="for-organizations" style={{ backgroundColor: 'var(--ee-bg-dim)' }}>
            <div className="container mx-auto px-4 sm:px-6">
                <div className="md:flex md:items-end md:justify-between gap-10 mb-14 md:mb-16">
                    <div className="max-w-2xl">
                        <span className="block text-xs font-bold uppercase tracking-[0.22em] mb-5" style={{ color: 'var(--ee-primary)' }}>
                            What we provide institutions
                        </span>
                        <h2 className="text-3xl md:text-5xl font-medium tracking-tight leading-[1.05]" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                            Portfolio-grade agricultural intelligence
                        </h2>
                    </div>
                    <p className="mt-5 md:mt-0 md:max-w-sm text-base leading-relaxed" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                        Three deliverables, one calibrated engine and the same explainable confidence
                        scoring underneath each — across Southern Africa.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                    {cards.map((card, index) => (
                        <motion.div
                            key={card.eyebrow}
                            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 26 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ duration: 0.55, delay: index * 0.1 }}
                        >
                            <Link
                                href={card.href}
                                className="group flex h-full flex-col rounded-2xl p-7 md:p-8 transition-all duration-300 hover:-translate-y-1"
                                style={{ backgroundColor: 'var(--ee-surface)', border: '1px solid var(--ee-bg-border)' }}
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-7 transition-transform duration-300 group-hover:scale-105"
                                    style={{ backgroundColor: 'rgba(15,184,133,0.10)' }}
                                >
                                    <card.icon size={24} style={{ color: 'var(--ee-primary)' }} aria-hidden />
                                </div>
                                <span className="block text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--ee-primary)' }}>
                                    {card.eyebrow}
                                </span>
                                <h3 className="text-xl md:text-2xl font-semibold mb-3 leading-snug" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                    {card.heading}
                                </h3>
                                <p className="text-sm md:text-base mb-7 leading-relaxed flex-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                    {card.description}
                                </p>
                                <span className="inline-flex items-center gap-2 font-semibold text-sm" style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}>
                                    Explore
                                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
                                </span>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
