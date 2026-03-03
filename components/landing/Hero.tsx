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
        <div ref={containerRef} className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-[#EBEBE3] py-20 md:py-0">

            {/* Background Parallax Elements */}
            <motion.div style={{ y, opacity }} className="absolute inset-0 pointer-events-none">
                {/* Abstract Organic Shapes */}
                <div className="absolute top-[-10%] right-[-5%] w-[300px] md:w-[800px] h-[300px] md:h-[800px] bg-[#D7F26C]/20 rounded-full blur-[60px] md:blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[250px] md:w-[600px] h-[250px] md:h-[600px] bg-[#2D3A26]/10 rounded-full blur-[50px] md:blur-[100px]" />

                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </motion.div>

            <div className="container mx-auto px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <span className="inline-block py-2 px-4 rounded-full bg-[#2D3A26]/5 border border-[#2D3A26]/10 text-[#2D3A26] text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6 backdrop-blur-sm">
                        The Future of African Agriculture
                    </span>

                    <h1 className="text-4xl md:text-7xl lg:text-8xl font-black text-[#2D3A26] tracking-tighter leading-[0.95] md:leading-[0.9] mb-6 md:mb-8">
                        Cultivating <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2D3A26] to-[#4A5D3B] italic font-serif">Intelligence</span>
                        <br />
                        Harvesting <span className="relative inline-block">
                            Success
                            <motion.svg
                                viewBox="0 0 200 9"
                                className="absolute -bottom-2 left-0 w-full h-3 text-[#D7F26C]"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ delay: 0.5, duration: 1 }}
                            >
                                <path d="M2.00025 6.99996C18.5295 4.09503 62.4572 2.76677 101.5 2.76677C140.543 2.76677 181.47 5.05926 198 6.99996" fill="transparent" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                            </motion.svg>
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-[#2D3A26]/70 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                        Empowering farmers with satellite precision and an AI agronomist that fits in your pocket.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link href="/auth">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-[#2D3A26] text-[#D7F26C] px-10 py-5 rounded-full font-bold text-lg shadow-2xl shadow-[#2D3A26]/20 flex items-center gap-2 group"
                            >
                                Start for Free
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </motion.button>
                        </Link>

                        <Link href="#features">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-white/50 backdrop-blur-md text-[#2D3A26] px-10 py-5 rounded-full font-bold text-lg border border-[#2D3A26]/10 hover:bg-white/80 transition-colors"
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
                <div className="w-6 h-10 rounded-full border-2 border-[#2D3A26]/20 flex justify-center p-1">
                    <div className="w-1.5 h-1.5 bg-[#2D3A26] rounded-full" />
                </div>
            </motion.div>
        </div>
    );
}
