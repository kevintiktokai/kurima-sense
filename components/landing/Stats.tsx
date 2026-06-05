'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { GaugeCircle, MapPinned, Timer, Wheat } from 'lucide-react';

const stats = [
    { value: 'Confidence-scored', label: 'Predictions with explicit uncertainty', icon: GaugeCircle },
    { value: 'Zimbabwe-trained', label: 'Calibrated for local crops & Natural Regions', icon: MapPinned },
    { value: '<5 min', label: 'Farmer setup time', icon: Timer },
    { value: 'Local crops', label: 'Tobacco, maize, cotton, soya & more', icon: Wheat },
];

export default function Stats() {
    const reduceMotion = useReducedMotion();
    return (
        <section className="py-12 md:py-14" style={{ backgroundColor: 'var(--ee-loam)', borderTop: '1px solid var(--ee-loam-line)' }}>
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.08 }}
                            className="flex flex-col items-start"
                        >
                            <stat.icon size={22} style={{ color: 'var(--ee-green-bright)' }} aria-hidden />
                            <h3 className="text-lg sm:text-xl font-semibold mt-3 mb-1.5 leading-tight" style={{ color: '#F8F6F1', fontFamily: 'var(--font-heading)' }}>
                                {stat.value}
                            </h3>
                            <p className="text-xs sm:text-[13px] leading-snug" style={{ color: 'var(--ee-loam-muted)', fontFamily: 'var(--font-body)' }}>
                                {stat.label}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
