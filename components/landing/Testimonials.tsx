'use client';

import React from 'react';
import { motion } from 'framer-motion';

const testimonials = [
    {
        name: 'Tendai M.',
        role: 'Maize Farmer, Mashonaland East',
        quote: 'I used to rely on gut feeling and whatever advice I could get from neighbors. With KurimaSense, I can actually see what\'s happening across my fields without walking every row. The AI suggested I check for moisture stress in my north block — sure enough, the irrigation line had a leak.',
        avatar: 'T',
        crop: 'Maize',
    },
    {
        name: 'Rumbi K.',
        role: 'Agricultural Extension Officer, Harare',
        quote: 'I advise smallholder farmers in my district and having satellite data at my fingertips makes a real difference during field visits. Instead of guessing, I can show farmers exactly which parts of their fields need attention. It\'s a tool I wish I had years ago.',
        avatar: 'R',
        crop: 'Extension Services',
    },
    {
        name: 'Tapiwa C.',
        role: 'Vegetable Grower, Manicaland',
        quote: 'I grow tomatoes and leafy greens on a small plot. Honestly, I wasn\'t sure a tech tool would be useful for someone farming at my scale — but the weather alerts alone have saved me twice from spraying right before rain. The AI tips are practical, not textbook.',
        avatar: 'T',
        crop: 'Vegetables',
    },
];

export default function Testimonials() {
    return (
        <section
            className="py-20 md:py-32"
            style={{ backgroundColor: 'var(--ee-bg)' }}
        >
            <div className="container mx-auto px-4 sm:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16 md:mb-20"
                >
                    <span
                        className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6"
                        style={{
                            backgroundColor: 'var(--ee-bg-pressed)',
                            color: 'var(--ee-text)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--ee-primary)' }}>forum</span>
                        Farmer Stories
                    </span>
                    <h2
                        className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        Trusted by Farmers{' '}
                        <span
                            className="italic"
                            style={{
                                background: 'linear-gradient(135deg, var(--ee-text), var(--ee-primary))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Across Africa
                        </span>
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="neu-surface p-6 sm:p-8 md:p-10 flex flex-col"
                        >
                            {/* Stars */}
                            <div className="flex gap-1 mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <span
                                        key={i}
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '20px', color: 'var(--ee-sun)' }}
                                    >
                                        star
                                    </span>
                                ))}
                            </div>

                            <p
                                className="text-base md:text-lg leading-relaxed mb-8 flex-1"
                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                            >
                                &ldquo;{testimonial.quote}&rdquo;
                            </p>

                            <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                                <div
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0"
                                    style={{
                                        backgroundColor: 'var(--ee-text)',
                                        color: 'var(--ee-primary)',
                                        fontFamily: 'var(--font-heading)',
                                    }}
                                >
                                    {testimonial.avatar}
                                </div>
                                <div>
                                    <h4
                                        className="font-bold text-sm"
                                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                    >
                                        {testimonial.name}
                                    </h4>
                                    <p
                                        className="text-xs"
                                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                    >
                                        {testimonial.role}
                                    </p>
                                </div>
                                <span
                                    className="ml-auto text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                                    style={{
                                        backgroundColor: 'rgba(15, 184, 133, 0.08)',
                                        color: 'var(--ee-primary)',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    {testimonial.crop}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
