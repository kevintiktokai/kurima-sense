'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Newspaper, ArrowRight } from 'lucide-react';
import { blogPosts } from '@/lib/blog-data';

export default function BlogPreview() {
    const latestPosts = blogPosts.slice(0, 3);

    return (
        <section
            id="blog"
            className="py-20 md:py-32"
            style={{ backgroundColor: 'var(--ee-bg-dim)' }}
        >
            <div className="container mx-auto px-4 sm:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 md:mb-20 gap-6"
                >
                    <div>
                        <span
                            className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6"
                            style={{
                                backgroundColor: 'var(--ee-bg-pressed)',
                                color: 'var(--ee-text)',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            <Newspaper size={14} style={{ color: 'var(--ee-primary)' }} aria-hidden />
                            From the Field
                        </span>
                        <h2
                            className="text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-4"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            Latest from Our{' '}
                            <span
                                className="italic"
                                style={{
                                    background: 'linear-gradient(135deg, var(--ee-text), var(--ee-primary))',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Blog
                            </span>
                        </h2>
                        <p
                            className="text-lg md:text-xl max-w-xl"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            Practical agronomy notes, field observations, and how our intelligence works — written by our team to help you grow better.
                        </p>
                    </div>
                    <Link
                        href="/blog"
                        className="flex items-center gap-2 font-bold text-base group flex-shrink-0"
                        style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                    >
                        View all articles
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" aria-hidden />
                    </Link>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {latestPosts.map((post, index) => (
                        <motion.div
                            key={post.slug}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Link href={`/blog/${post.slug}`} className="group block">
                                <div className="neu-surface overflow-hidden group-hover:scale-[1.02] transition-transform duration-300">
                                    {/* Image */}
                                    <div
                                        className="relative aspect-[16/10] overflow-hidden"
                                        style={{ backgroundColor: 'var(--ee-bg-pressed)' }}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Newspaper size={44} style={{ color: 'var(--ee-bg-border)' }} aria-hidden />
                                        </div>
                                        <div
                                            className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                            style={{
                                                backgroundColor: 'var(--ee-text)',
                                                color: '#FFFFFF',
                                                fontFamily: 'var(--font-body)',
                                            }}
                                        >
                                            {post.category}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 sm:p-6 md:p-8">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span
                                                className="text-xs font-medium"
                                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                            >
                                                {post.date}
                                            </span>
                                            <span style={{ color: 'var(--ee-bg-border)' }}>·</span>
                                            <span
                                                className="text-xs font-medium"
                                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                            >
                                                {post.readTime}
                                            </span>
                                        </div>
                                        <h3
                                            className="text-lg md:text-xl font-bold mb-3 group-hover:text-[var(--ee-primary)] transition-colors line-clamp-2"
                                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                        >
                                            {post.title}
                                        </h3>
                                        <p
                                            className="text-sm leading-relaxed line-clamp-2"
                                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                        >
                                            {post.excerpt}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
