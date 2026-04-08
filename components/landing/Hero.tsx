'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function Hero() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <div
            ref={containerRef}
            className="relative min-h-[100svh] flex items-center justify-center overflow-hidden pt-24 pb-16 md:py-0"
            style={{ backgroundColor: 'var(--ee-bg)' }}
        >

            {/* Background Parallax Elements */}
            <motion.div style={{ y, opacity }} className="absolute inset-0 pointer-events-none">
                {/* Abstract Organic Shapes — muted botanical tones */}
                <div
                    className="absolute top-[-10%] right-[-5%] w-[300px] md:w-[800px] h-[300px] md:h-[800px] rounded-full blur-[60px] md:blur-[120px]"
                    style={{ backgroundColor: 'rgba(15, 184, 133, 0.08)' }}
                />
                <div
                    className="absolute bottom-[-10%] left-[-10%] w-[250px] md:w-[600px] h-[250px] md:h-[600px] rounded-full blur-[50px] md:blur-[100px]"
                    style={{ backgroundColor: 'rgba(232, 163, 101, 0.08)' }}
                />

                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </motion.div>

            <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <span
                        className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6"
                        style={{
                            backgroundColor: 'var(--ee-bg-pressed)',
                            color: 'var(--ee-text)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--ee-primary)' }}>eco</span>
                        The Future of African Agriculture
                    </span>

                    <h1
                        className="text-[2.25rem] sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] md:leading-[0.9] mb-5 md:mb-8"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        Cultivating{' '}
                        <span
                            className="italic"
                            style={{
                                background: 'linear-gradient(135deg, var(--ee-text), var(--ee-primary))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontFamily: 'var(--font-heading)',
                            }}
                        >
                            Intelligence
                        </span>
                        <br />
                        Harvesting{' '}
                        <span className="relative inline-block">
                            Success
                            <motion.svg
                                viewBox="0 0 200 9"
                                className="absolute -bottom-2 left-0 w-full h-3"
                                style={{ color: 'var(--ee-primary)' }}
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ delay: 0.5, duration: 1 }}
                            >
                                <path d="M2.00025 6.99996C18.5295 4.09503 62.4572 2.76677 101.5 2.76677C140.543 2.76677 181.47 5.05926 198 6.99996" fill="transparent" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                            </motion.svg>
                        </span>
                    </h1>

                    <p
                        className="text-base sm:text-lg md:text-2xl max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed font-medium"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        Empowering farmers with satellite precision and an AI agronomist that fits in your pocket.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link href="/auth">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 md:px-10 md:py-5 rounded-full font-bold text-base md:text-lg flex items-center gap-2 group"
                                style={{
                                    backgroundColor: 'var(--ee-text)',
                                    color: '#FFFFFF',
                                    boxShadow: 'var(--shadow-ambient)',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_forward</span>
                                Start for Free
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </motion.button>
                        </Link>

                        <Link href="#features">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="neu-surface px-8 py-4 md:px-10 md:py-5 rounded-full font-bold text-base md:text-lg transition-colors"
                                style={{
                                    color: 'var(--ee-text)',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                See How It Works
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                className="absolute bottom-10 left-1/2 -translate-x-1/2"
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
            >
                <div
                    className="w-10 h-10 rounded-full flex justify-center items-center"
                    style={{ backgroundColor: 'var(--ee-bg-pressed)' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--ee-muted)' }}>
                        expand_more
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
