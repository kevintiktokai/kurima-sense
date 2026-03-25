'use client';

import React from 'react';
import { motion } from 'framer-motion';

const segments = [
    {
        id: 'farmers',
        title: 'For Commercial Farmers',
        subtitle: 'Optimize Yields at Scale',
        description: 'Monitor crop health with satellite precision, predict yields, and track input costs to maximize profitability.',
        features: ['Satellite NDVI Monitoring', 'Yield Forecasting', 'Input Cost Tracking'],
        color: 'bg-[#2D3A26]',
        textColor: 'text-[#D7F26C]',
        image: 'https://images.unsplash.com/photo-1625246333195-bf8f7e7a831d?auto=format&fit=crop&q=80',
    },
    {
        id: 'agronomists',
        title: 'For Agronomists',
        subtitle: 'Data-Driven Advisory',
        description: 'Manage multiple clients, validate advice with real-time data, and generate professional reports instantly.',
        features: ['Multi-Client Dashboard', 'Data Validation', 'Automated Reporting'],
        color: 'bg-[#D7F26C]',
        textColor: 'text-[#2D3A26]',
        image: 'https://images.unsplash.com/photo-1592982537447-6f2a6a0e625a?auto=format&fit=crop&q=80',
    },
    {
        id: 'hobbyists',
        title: 'For Hobbyists',
        subtitle: 'Grow Like a Pro',
        description: 'Turn your backyard into a food forest with AI guidance tailored to small spaces and organic methods.',
        features: ['AI Pest Identification', 'Organic Tips', 'Community support'],
        color: 'bg-[#EBEBE3]',
        textColor: 'text-[#2D3A26]',
        image: 'https://images.unsplash.com/photo-1585320806297-c79366624921?auto=format&fit=crop&q=80',
    },
];

export default function Segments() {
    return (
        <section className="py-16 md:py-24 bg-white" id="features">
            <div className="container mx-auto px-6">
                <div className="text-center mb-12 md:mb-20">
                    <h2 className="text-3xl md:text-5xl font-black text-[#2D3A26] mb-4 tracking-tight">
                        Built for Every Grower
                    </h2>
                    <p className="text-lg md:text-xl text-[#2D3A26]/70 max-w-2xl mx-auto">
                        Whether you manage thousands of hectares or a single greenhouse, KurimaSense adapts to your needs.
                    </p>
                </div>

                <div className="space-y-20 md:space-y-32">
                    {segments.map((segment, index) => (
                        <motion.div
                            key={segment.id}
                            id={segment.id}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                            className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-10 md:gap-12 lg:gap-20`}
                        >
                            {/* Image Side */}
                            <div className="w-full lg:w-1/2 relative group">
                                <div className="absolute inset-0 bg-[#2D3A26] rounded-[2rem] transform rotate-3 scale-95 group-hover:rotate-6 transition-transform duration-500 opacity-10" />
                                <div className="relative overflow-hidden rounded-[2rem] shadow-2xl aspect-[4/3]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={segment.image}
                                        alt={segment.title}
                                        className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-700 ease-out"
                                    />

                                    {/* Glass Card Overlay */}
                                    <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 bg-white/90 backdrop-blur-md p-4 md:p-6 rounded-2xl border border-white/50 shadow-lg translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                        <div className="flex flex-wrap gap-2 md:gap-4">
                                            {segment.features.map((feat, i) => (
                                                <span key={i} className="text-[10px] md:text-xs font-bold text-[#2D3A26] uppercase tracking-wider bg-[#D7F26C]/30 px-2 md:px-3 py-1 rounded-full">
                                                    {feat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Text Side */}
                            <div className="w-full lg:w-1/2">
                                <span className="text-[#D7F26C] bg-[#2D3A26] px-4 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 md:mb-6 inline-block">
                                    {segment.title}
                                </span>
                                <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#2D3A26] mb-4 md:mb-6 leading-none">
                                    {segment.subtitle}
                                </h3>
                                <p className="text-base md:text-lg text-[#2D3A26]/70 mb-6 md:mb-8 leading-relaxed">
                                    {segment.description}
                                </p>
                                <button className="text-[#2D3A26] font-bold text-base md:text-lg group flex items-center gap-2 hover:text-[#4A5D3B] transition-colors">
                                    Learn more about {segment.id}
                                    <span className="group-hover:translate-x-2 transition-transform">→</span>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
