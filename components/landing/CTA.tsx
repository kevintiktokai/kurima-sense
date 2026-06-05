'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tractor, CalendarDays } from 'lucide-react';

export default function CTA() {
    return (
        <section className="py-20 md:py-32" style={{ backgroundColor: 'var(--ee-bg)' }}>
            <div className="container mx-auto px-4 sm:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="relative rounded-[20px] sm:rounded-[32px] overflow-hidden p-6 sm:p-10 md:p-16 lg:p-20 text-center"
                    style={{
                        backgroundColor: 'var(--ee-text)',
                    }}
                >
                    {/* Background decorations */}
                    <div
                        className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"
                        style={{ backgroundColor: 'rgba(15, 184, 133, 0.12)' }}
                    />
                    <div
                        className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none -translate-x-1/2 translate-y-1/2"
                        style={{ backgroundColor: 'rgba(232, 163, 101, 0.08)' }}
                    />

                    <div className="relative z-10">
                        <Tractor size={44} className="mb-6 mx-auto" style={{ color: 'var(--ee-primary)' }} aria-hidden />
                        <h2
                            className="text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-6"
                            style={{ color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}
                        >
                            See the methodology.{' '}
                            <span
                                className="italic"
                                style={{
                                    background: 'linear-gradient(135deg, var(--ee-primary), var(--ee-sun))',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Then decide.
                            </span>
                        </h2>
                        <p
                            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
                            style={{ color: 'rgba(255, 255, 255, 0.55)', fontFamily: 'var(--font-body)' }}
                        >
                            Institutions: request a briefing and we&apos;ll walk you through the data
                            provenance, confidence scoring, and Zimbabwe calibration behind every
                            forecast. Farmers: start monitoring your fields today.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <a href="https://calendly.com/kurimasense/demo" target="_blank" rel="noopener noreferrer">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-8 py-4 sm:px-10 sm:py-5 rounded-full font-bold text-base sm:text-lg flex items-center gap-2"
                                    style={{
                                        backgroundColor: 'var(--ee-primary)',
                                        color: '#FFFFFF',
                                        boxShadow: '0 4px 30px rgba(15, 184, 133, 0.3)',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    <CalendarDays size={19} aria-hidden />
                                    Request a briefing
                                </motion.button>
                            </a>
                            <Link href="/auth">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-8 py-4 sm:px-10 sm:py-5 rounded-full font-bold text-base sm:text-lg transition-colors"
                                    style={{
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        border: '2px solid rgba(255, 255, 255, 0.15)',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    Start free as a farmer
                                </motion.button>
                            </Link>
                        </div>

                        <p
                            className="mt-6 sm:mt-8 text-xs sm:text-sm"
                            style={{ color: 'rgba(255, 255, 255, 0.3)', fontFamily: 'var(--font-body)' }}
                        >
                            Farmer free tier — no credit card required.
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
