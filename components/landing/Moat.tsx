'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Map, GaugeCircle, ShieldCheck } from 'lucide-react';

const pillars = [
    {
        icon: Map,
        title: 'Calibrated for Zimbabwe',
        body: 'Models tuned to the Natural Regions and to local crops — tobacco, maize, cotton, soya — not retrofitted from American maize or Brazilian soya datasets that have never seen Compound D or Region II.',
    },
    {
        icon: GaugeCircle,
        title: 'A confidence score on every number',
        body: 'Each forecast ships with an explicit uncertainty band. You see how sure the model is and why — so you can price, lend, and underwrite against a number you can defend.',
    },
    {
        icon: ShieldCheck,
        title: 'Explainable, not a black box',
        body: 'Every signal traces back to its inputs: NDVI trend, rainfall against the 10-year normal, growth stage. Determinism over probabilistic hand-waving.',
    },
];

export default function Moat() {
    const reduceMotion = useReducedMotion();
    return (
        <section className="py-20 md:py-28" style={{ backgroundColor: 'var(--ee-bg)' }} id="moat">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="max-w-3xl mb-14 md:mb-20">
                    <motion.span
                        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="block text-xs font-bold uppercase tracking-[0.22em] mb-5"
                        style={{ color: 'var(--ee-primary)' }}
                    >
                        The moat
                    </motion.span>
                    <motion.h2
                        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.05 }}
                        className="text-3xl md:text-5xl font-medium tracking-tight leading-[1.05]"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        Local calibration and explainable confidence — the part competitors can&apos;t copy.
                    </motion.h2>
                </div>

                <div className="grid md:grid-cols-3 gap-px rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--ee-bg-border)' }}>
                    {pillars.map((p, i) => (
                        <motion.div
                            key={p.title}
                            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.55, delay: i * 0.1 }}
                            className="p-8 md:p-10"
                            style={{ backgroundColor: 'var(--ee-surface)' }}
                        >
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                                style={{ backgroundColor: 'rgba(15,184,133,0.10)' }}
                            >
                                <p.icon size={24} style={{ color: 'var(--ee-primary)' }} aria-hidden />
                            </div>
                            <h3 className="text-xl md:text-2xl font-semibold mb-3" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                {p.title}
                            </h3>
                            <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                {p.body}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
