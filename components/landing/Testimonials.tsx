'use client';

import React from 'react';
import { motion } from 'framer-motion';

/*
 * HONEST PROOF SECTION (replaces fabricated single-initial testimonials).
 * KurimaSense is early-stage. We do NOT claim named users or 5-star reviews
 * we cannot verify. When real, attributable pilot quotes exist, drop them into
 * the `pilotQuotes` array below — each needs a real name, role, and consent.
 * Until then this section honestly frames the product as onboarding pilots.
 *
 * {{PLACEHOLDER: real, consented pilot quotes needed — name, role, location}}
 */
const pilotQuotes: { quote: string; name: string; role: string }[] = [];

export default function Testimonials() {
    return (
        <section
            className="py-20 md:py-32"
            style={{ backgroundColor: 'var(--ee-bg)' }}
        >
            <div className="container mx-auto px-4 sm:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="max-w-3xl mx-auto text-center"
                >
                    <span
                        className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6"
                        style={{
                            backgroundColor: 'var(--ee-bg-pressed)',
                            color: 'var(--ee-text)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--ee-primary)' }}>flag</span>
                        Early Access
                    </span>
                    <h2
                        className="text-3xl md:text-5xl font-black tracking-tight mb-6"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        Now onboarding pilot farms and partners in Zimbabwe
                    </h2>
                    <p
                        className="text-lg md:text-xl leading-relaxed"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        We&apos;re building KurimaSense in the open with a small group of farmers,
                        agronomists, and institutional partners. We don&apos;t publish reviews we
                        can&apos;t stand behind — what we can show you is the methodology, the
                        confidence scores, and exactly how the intelligence is calibrated for
                        Zimbabwe&apos;s Natural Regions.
                    </p>
                </motion.div>

                {pilotQuotes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-16">
                        {pilotQuotes.map((t, index) => (
                            <motion.div
                                key={t.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-50px' }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="neu-surface p-6 sm:p-8 md:p-10 flex flex-col"
                            >
                                <p
                                    className="text-base md:text-lg leading-relaxed mb-8 flex-1"
                                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    &ldquo;{t.quote}&rdquo;
                                </p>
                                <div>
                                    <h4 className="font-bold text-sm" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>{t.name}</h4>
                                    <p className="text-xs" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{t.role}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
