'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const cards = [
    {
        eyebrow: 'AGRICULTURAL BUYERS',
        heading: 'Pre-harvest yield forecasts',
        description:
            'District-level yield intelligence for contract pricing, procurement planning, and logistics.',
        href: '/for-buyers',
        icon: 'business',
    },
    {
        eyebrow: 'LENDERS',
        heading: 'Field-level risk scoring',
        description:
            'Default probability scoring for smallholder agricultural lending, backed by satellite history and ground truth.',
        href: '/for-lenders',
        icon: 'account_balance',
    },
    {
        eyebrow: 'INSURERS',
        heading: 'Parametric crop insurance',
        description:
            'Index-based crop insurance triggers and verification for automated payouts and reduced basis risk.',
        href: '/for-insurers',
        icon: 'security',
    },
];

export default function ForOrganizations() {
    return (
        <section
            className="py-16 md:py-24"
            id="for-organizations"
            style={{ backgroundColor: 'var(--ee-bg)' }}
        >
            <div className="container mx-auto px-4 sm:px-6">
                <div className="text-center mb-12 md:mb-16">
                    <span
                        className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6"
                        style={{
                            backgroundColor: 'var(--ee-bg-pressed)',
                            color: 'var(--ee-text)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '16px', color: 'var(--ee-primary)' }}
                        >
                            account_tree
                        </span>
                        For Organizations
                    </span>
                    <h2
                        className="text-3xl md:text-5xl font-black mb-4 tracking-tight"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        Agricultural intelligence at scale
                    </h2>
                    <p
                        className="text-lg md:text-xl max-w-2xl mx-auto"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        Beyond individual farmers, KurimaSense provides portfolio-level yield
                        forecasting, risk scoring, and crop monitoring for agricultural buyers,
                        lenders, and insurers across Southern Africa.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {cards.map((card, index) => (
                        <motion.div
                            key={card.eyebrow}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                        >
                            <Link
                                href={card.href}
                                className="group block h-full rounded-[24px] p-6 md:p-8 transition-transform duration-300 hover:-translate-y-1"
                                style={{
                                    backgroundColor: 'var(--ee-surface)',
                                    boxShadow: 'var(--shadow-ambient)',
                                }}
                            >
                                <div
                                    className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                                    style={{
                                        backgroundColor: 'rgba(15, 184, 133, 0.12)',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '28px', color: 'var(--ee-primary)' }}
                                    >
                                        {card.icon}
                                    </span>
                                </div>

                                <span
                                    className="block text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3"
                                    style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                                >
                                    {card.eyebrow}
                                </span>

                                <h3
                                    className="text-xl md:text-2xl font-black mb-3 leading-tight"
                                    style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                >
                                    {card.heading}
                                </h3>

                                <p
                                    className="text-sm md:text-base mb-6 leading-relaxed"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    {card.description}
                                </p>

                                <span
                                    className="inline-flex items-center gap-2 font-bold text-sm md:text-base transition-colors"
                                    style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                                >
                                    Learn more
                                    <span
                                        className="material-symbols-outlined transition-transform group-hover:translate-x-1"
                                        style={{ fontSize: '18px' }}
                                    >
                                        arrow_forward
                                    </span>
                                </span>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
