'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarDays, ArrowRight } from 'lucide-react';
import HeroArtifact from './HeroArtifact';

export default function Hero() {
    const reduceMotion = useReducedMotion();

    const fade = (delay: number) => ({
        initial: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: 'easeOut' as const, delay },
    });

    return (
        <section
            className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24"
            style={{ backgroundColor: 'var(--ee-loam)', color: '#F4F1ED' }}
        >
            {/* Contour terrain motif + grain — atmosphere, not decoration */}
            <div className="bg-contour absolute inset-0 opacity-[0.05] pointer-events-none" aria-hidden />
            <div className="bg-grain absolute inset-0 opacity-[0.05] pointer-events-none" aria-hidden />
            <div
                className="absolute top-[-20%] right-[-10%] w-[60%] h-[70%] rounded-full blur-[140px] pointer-events-none"
                style={{ backgroundColor: 'rgba(15,184,133,0.10)' }}
                aria-hidden
            />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
                    {/* Copy */}
                    <div className="max-w-xl">
                        <motion.span
                            {...fade(0)}
                            className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full text-[10px] md:text-xs font-semibold uppercase tracking-[0.22em] mb-7"
                            style={{ color: 'var(--ee-clay)', border: '1px solid var(--ee-loam-line)' }}
                        >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ee-green-bright)' }} />
                            Agricultural intelligence · Southern Africa
                        </motion.span>

                        <motion.h1
                            {...fade(0.08)}
                            className="text-[2.5rem] sm:text-5xl lg:text-[4.2rem] font-medium tracking-tight leading-[1.02] mb-6"
                            style={{ fontFamily: 'var(--font-heading)', color: '#F8F6F1' }}
                        >
                            Yield, risk, and insurance signals you can{' '}
                            <span className="italic" style={{ color: 'var(--ee-green-bright)' }}>
                                actually explain
                            </span>
                            .
                        </motion.h1>

                        <motion.p
                            {...fade(0.16)}
                            className="text-base md:text-lg leading-relaxed mb-9"
                            style={{ color: 'var(--ee-loam-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            KurimaSense turns satellite and ground-truth data into yield forecasts,
                            field-level risk scores, and parametric-insurance triggers — calibrated for
                            Zimbabwe&apos;s Natural Regions and delivered with an explicit confidence
                            score on every number. Built for buyers, lenders, and insurers, validated
                            by the farmers in the field.
                        </motion.p>

                        <motion.div {...fade(0.24)} className="flex flex-col sm:flex-row gap-3.5">
                            <a href="https://calendly.com/kurimasense/demo" target="_blank" rel="noopener noreferrer">
                                <button
                                    className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-sm md:text-base flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                                    style={{ backgroundColor: 'var(--ee-primary)', color: '#06140E', fontFamily: 'var(--font-body)' }}
                                >
                                    <CalendarDays size={18} aria-hidden />
                                    Request a briefing
                                </button>
                            </a>
                            <Link href="#methodology">
                                <button
                                    className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-sm md:text-base flex items-center justify-center gap-2 transition-colors"
                                    style={{ color: '#F4F1ED', border: '1px solid var(--ee-loam-line)', fontFamily: 'var(--font-body)' }}
                                >
                                    See the methodology
                                    <ArrowRight size={17} aria-hidden />
                                </button>
                            </Link>
                        </motion.div>

                        <motion.p {...fade(0.3)} className="mt-5 text-xs" style={{ color: 'var(--ee-loam-muted)' }}>
                            Farmer or agronomist?{' '}
                            <Link href="#farmers" className="font-semibold underline underline-offset-4" style={{ color: 'var(--ee-clay)' }}>
                                Start free on the field tools →
                            </Link>
                        </motion.p>
                    </div>

                    {/* Product artifact */}
                    <div className="flex justify-center lg:justify-end">
                        <HeroArtifact />
                    </div>
                </div>
            </div>
        </section>
    );
}
