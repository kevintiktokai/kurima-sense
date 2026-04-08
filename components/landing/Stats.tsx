'use client';

import React from 'react';
import { motion } from 'framer-motion';

const stats = [
    { value: '95%', label: 'Yield Prediction Accuracy', icon: 'trending_up' },
    { value: '24/7', label: 'AI Advisory Available', icon: 'smart_toy' },
    { value: '<5 min', label: 'Setup Time', icon: 'timer' },
    { value: '6+', label: 'Crop Types Supported', icon: 'eco' },
];

export default function Stats() {
    return (
        <section className="py-16 md:py-20" style={{ backgroundColor: 'var(--ee-text)' }}>
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="text-center"
                        >
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ backgroundColor: 'rgba(15, 184, 133, 0.15)' }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '24px', color: 'var(--ee-primary)' }}
                                >
                                    {stat.icon}
                                </span>
                            </div>
                            <h3
                                className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-2"
                                style={{ color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}
                            >
                                {stat.value}
                            </h3>
                            <p
                                className="text-xs sm:text-sm md:text-base font-medium"
                                style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'var(--font-body)' }}
                            >
                                {stat.label}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
