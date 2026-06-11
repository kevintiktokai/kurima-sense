'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Tractor, FlaskConical, ArrowRight, Check } from 'lucide-react';

const tracks = [
    {
        id: 'farmers',
        icon: Tractor,
        eyebrow: 'For farmers',
        title: 'Monitor every hectare from your pocket',
        body: 'Satellite crop health, weather and spray windows, pest alerts, and an AI agronomist — free to start. The fields you manage become the validated ground truth the whole platform is built on.',
        features: ['Satellite NDVI monitoring', 'AI agronomist & alerts', 'Field & input tracking'],
    },
    {
        id: 'agronomists',
        icon: FlaskConical,
        eyebrow: 'For agronomists',
        title: 'Advise with data, not guesswork',
        body: 'Manage multiple growers, validate advice against real-time satellite and weather data, and turn field visits into evidence-backed recommendations.',
        features: ['Multi-client dashboard', 'Data-backed advisory', 'Shareable field reports'],
    },
];

export default function Segments() {
    const reduceMotion = useReducedMotion();
    return (
        <section className="py-20 md:py-28" id="farmers" style={{ backgroundColor: 'var(--ee-bg)' }}>
            <div className="container mx-auto px-4 sm:px-6">
                <div className="max-w-2xl mb-14 md:mb-16">
                    <span className="block text-xs font-bold uppercase tracking-[0.22em] mb-5" style={{ color: 'var(--ee-primary)' }}>
                        The data layer
                    </span>
                    <h2 className="text-3xl md:text-5xl font-medium tracking-tight leading-[1.05] mb-5" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        For farmers &amp; agronomists
                    </h2>
                    <p className="text-base md:text-lg leading-relaxed" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                        The same intelligence institutions rely on, in the hands of the people closest
                        to the crop — free to start, and the foundation our calibration is built on.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-5 md:gap-6">
                    {tracks.map((t, i) => (
                        <motion.div
                            key={t.id}
                            id={t.id}
                            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 26 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.55, delay: i * 0.1 }}
                            className="flex flex-col rounded-2xl p-8 md:p-10 scroll-mt-24"
                            style={{ backgroundColor: 'var(--ee-surface)', border: '1px solid var(--ee-bg-border)' }}
                        >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-7" style={{ backgroundColor: 'rgba(15,184,133,0.10)' }}>
                                <t.icon size={24} style={{ color: 'var(--ee-primary)' }} aria-hidden />
                            </div>
                            <span className="block text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--ee-primary)' }}>{t.eyebrow}</span>
                            <h3 className="text-2xl md:text-3xl font-semibold mb-4 leading-tight" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{t.title}</h3>
                            <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{t.body}</p>
                            <ul className="space-y-2.5 mb-8">
                                {t.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2.5 text-sm font-medium" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>
                                        <Check size={16} style={{ color: 'var(--ee-primary)' }} aria-hidden />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/auth" className="mt-auto inline-flex items-center gap-2 font-semibold text-sm group" style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}>
                                Start free
                                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
