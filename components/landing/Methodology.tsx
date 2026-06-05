'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Satellite, Sprout, SlidersHorizontal, CalendarDays, FileText, Database, Lock, GitCompareArrows } from 'lucide-react';

const steps = [
    {
        icon: Database,
        step: '01',
        title: 'Ingest',
        body: 'Multi-source satellite imagery (optical + radar), weather reanalysis, and historical yield records are pulled per field and per growing zone.',
    },
    {
        icon: GitCompareArrows,
        step: '02',
        title: 'Calibrate',
        body: 'Signals are tuned against Zimbabwe-specific ground truth — Natural Region, crop variety, and management practice — not a generic global baseline.',
    },
    {
        icon: SlidersHorizontal,
        step: '03',
        title: 'Score',
        body: 'Each output carries an explicit confidence band derived from input agreement and data coverage. Thin or conflicting data widens the band, visibly.',
    },
];

const provenance = [
    {
        icon: Satellite,
        title: 'Satellite sources',
        body: 'Open Sentinel-2 / Landsat optical and Sentinel-1 radar for cloud-resilient NDVI and moisture proxies.',
    },
    {
        icon: Sprout,
        title: 'Ground truth',
        body: 'Field boundaries, planting dates, crop and variety logged by farmers and agronomists on the platform.',
    },
    {
        icon: SlidersHorizontal,
        title: 'Calibration approach',
        body: 'Region- and crop-specific adjustment against local agronomic constants and prior-season outcomes.',
    },
];

export default function Methodology() {
    const reduceMotion = useReducedMotion();
    const reveal = (i = 0) => ({
        initial: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-60px' },
        transition: { duration: 0.55, delay: i * 0.08 },
    });

    return (
        <section
            id="methodology"
            className="relative py-22 md:py-32 overflow-hidden"
            style={{ backgroundColor: 'var(--ee-loam)', color: '#F4F1ED' }}
        >
            <div className="bg-contour absolute inset-0 opacity-[0.04] pointer-events-none" aria-hidden />
            <div className="bg-grain absolute inset-0 opacity-[0.05] pointer-events-none" aria-hidden />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                {/* Header */}
                <div className="max-w-3xl mb-16 md:mb-20">
                    <motion.span {...reveal()} className="block text-xs font-bold uppercase tracking-[0.22em] mb-5" style={{ color: 'var(--ee-green-bright)' }}>
                        How the intelligence works
                    </motion.span>
                    <motion.h2 {...reveal(1)} className="text-3xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-6" style={{ fontFamily: 'var(--font-heading)', color: '#F8F6F1' }}>
                        Explainability, made visible
                    </motion.h2>
                    <motion.p {...reveal(2)} className="text-base md:text-lg leading-relaxed" style={{ color: 'var(--ee-loam-muted)', fontFamily: 'var(--font-body)' }}>
                        We&apos;d rather show our work than ask for your trust. Here is how a number
                        becomes a forecast you can underwrite — and how its confidence score is earned.
                    </motion.p>
                </div>

                {/* Confidence steps */}
                <div className="grid md:grid-cols-3 gap-5 md:gap-6 mb-16 md:mb-20">
                    {steps.map((s, i) => (
                        <motion.div key={s.step} {...reveal(i)} className="loam-panel p-7 md:p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(45,212,167,0.12)' }}>
                                    <s.icon size={22} style={{ color: 'var(--ee-green-bright)' }} aria-hidden />
                                </div>
                                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--ee-loam-muted)', fontFamily: 'var(--font-heading)' }}>{s.step}</span>
                            </div>
                            <h3 className="text-xl font-semibold mb-2.5" style={{ color: '#F8F6F1', fontFamily: 'var(--font-heading)' }}>{s.title}</h3>
                            <p className="text-sm md:text-[15px] leading-relaxed" style={{ color: 'var(--ee-loam-muted)', fontFamily: 'var(--font-body)' }}>{s.body}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Data provenance */}
                <motion.h3 {...reveal()} className="text-lg font-bold uppercase tracking-[0.18em] mb-7" style={{ color: 'var(--ee-clay)' }}>
                    Data provenance
                </motion.h3>
                <div className="grid md:grid-cols-3 gap-px rounded-2xl overflow-hidden mb-16 md:mb-20" style={{ backgroundColor: 'var(--ee-loam-line)' }}>
                    {provenance.map((p, i) => (
                        <motion.div key={p.title} {...reveal(i)} className="p-7 md:p-8" style={{ backgroundColor: 'var(--ee-loam-soft)' }}>
                            <p.icon size={22} style={{ color: 'var(--ee-green-bright)' }} aria-hidden />
                            <h4 className="text-base font-semibold mt-4 mb-2" style={{ color: '#F8F6F1', fontFamily: 'var(--font-heading)' }}>{p.title}</h4>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--ee-loam-muted)', fontFamily: 'var(--font-body)' }}>{p.body}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Reliability strip — honest about maturity */}
                <motion.div {...reveal()} className="rounded-2xl p-7 md:p-9 mb-14" style={{ border: '1px solid var(--ee-loam-line)' }}>
                    <div className="flex items-center gap-2.5 mb-5">
                        <Lock size={18} style={{ color: 'var(--ee-green-bright)' }} aria-hidden />
                        <h3 className="text-base font-bold uppercase tracking-[0.16em]" style={{ color: '#F8F6F1' }}>Reliability &amp; data handling</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-x-10 gap-y-3 text-sm leading-relaxed" style={{ color: 'var(--ee-loam-muted)', fontFamily: 'var(--font-body)' }}>
                        <p>· Field and account data is access-controlled and never sold to third parties.</p>
                        <p>· Forecasts are versioned, so a number can always be traced to the inputs and model behind it.</p>
                        <p>· Outputs are labelled estimates with confidence bands — not guarantees.</p>
                        <p>· We&apos;re early-stage and say so: where ground-truth coverage is thin, the confidence score reflects it.</p>
                    </div>
                </motion.div>

                {/* CTA */}
                <motion.div {...reveal()} className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <a href="https://calendly.com/kurimasense/demo" target="_blank" rel="noopener noreferrer">
                        <button
                            className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-sm md:text-base flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                            style={{ backgroundColor: 'var(--ee-primary)', color: '#06140E', fontFamily: 'var(--font-body)' }}
                        >
                            <CalendarDays size={18} aria-hidden />
                            Request a briefing
                        </button>
                    </a>
                    <a href="/methodology/buyers-methodology.pdf" target="_blank" rel="noopener noreferrer">
                        <button
                            className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-sm md:text-base flex items-center justify-center gap-2 transition-colors"
                            style={{ color: '#F4F1ED', border: '1px solid var(--ee-loam-line)', fontFamily: 'var(--font-body)' }}
                        >
                            <FileText size={17} aria-hidden />
                            Read the methodology brief
                        </button>
                    </a>
                </motion.div>
            </div>
        </section>
    );
}
