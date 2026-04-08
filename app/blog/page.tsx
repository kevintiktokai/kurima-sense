'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { blogPosts } from '@/lib/blog-data';

const categories = ['All', ...Array.from(new Set(blogPosts.map(p => p.category)))];

export default function BlogPage() {
    const [activeCategory, setActiveCategory] = useState('All');

    const filteredPosts = activeCategory === 'All'
        ? blogPosts
        : blogPosts.filter(p => p.category === activeCategory);

    return (
        <main className="min-h-screen" style={{ backgroundColor: 'var(--ee-bg)' }}>
            {/* Navbar */}
            <nav
                className="fixed top-0 left-0 right-0 z-50 py-4"
                style={{
                    backgroundColor: 'rgba(244, 241, 237, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: 'var(--shadow-ambient)',
                }}
            >
                <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Image
                            src="/logo-200.png"
                            alt="KurimaSense"
                            width={40}
                            height={40}
                            className="rounded-[12px] shadow-lg group-hover:scale-110 transition-transform duration-300"
                        />
                        <span
                            className="text-2xl font-black tracking-tighter"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            KurimaSense
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="hidden md:inline-block font-bold text-sm transition-colors"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            Back to Home
                        </Link>
                        <Link href="/auth">
                            <button
                                className="px-6 py-2.5 rounded-full font-bold text-sm hover:scale-105 transition-all"
                                style={{
                                    backgroundColor: 'var(--ee-primary)',
                                    color: '#FFFFFF',
                                    boxShadow: '0 4px 14px rgba(15, 184, 133, 0.25)',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                Get Started
                            </button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-32 pb-16 md:pt-40 md:pb-20">
                <div className="container mx-auto px-4 sm:px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span
                            className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6"
                            style={{
                                backgroundColor: 'var(--ee-bg-pressed)',
                                color: 'var(--ee-text)',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--ee-primary)' }}>article</span>
                            KurimaSense Blog
                        </span>
                        <h1
                            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-6"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            Insights From{' '}
                            <span
                                className="italic"
                                style={{
                                    background: 'linear-gradient(135deg, var(--ee-text), var(--ee-primary))',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                the Field
                            </span>
                        </h1>
                        <p
                            className="text-lg md:text-xl max-w-2xl mx-auto"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            Expert agricultural advice, technology insights, and practical farming tips — updated daily to help you grow better.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Category Filter */}
            <section className="pb-12">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex flex-wrap gap-3 justify-center">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className="px-5 py-2 rounded-full text-sm font-bold transition-all"
                                style={{
                                    backgroundColor: activeCategory === cat ? 'var(--ee-text)' : 'var(--ee-surface)',
                                    color: activeCategory === cat ? '#FFFFFF' : 'var(--ee-muted)',
                                    boxShadow: activeCategory === cat ? 'var(--shadow-ambient)' : 'var(--shadow-neu)',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Posts Grid */}
            <section className="pb-20 md:pb-32">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {filteredPosts.map((post, index) => (
                            <motion.div
                                key={post.slug}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                            >
                                <Link href={`/blog/${post.slug}`} className="group block h-full">
                                    <div className="neu-surface overflow-hidden group-hover:scale-[1.02] transition-transform duration-300 h-full flex flex-col">
                                        {/* Image */}
                                        <div
                                            className="relative aspect-[16/10] overflow-hidden"
                                            style={{ backgroundColor: 'var(--ee-bg-pressed)' }}
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '48px', color: 'var(--ee-bg-border)' }}
                                                >
                                                    {post.icon}
                                                </span>
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
                                        <div className="p-6 md:p-8 flex flex-col flex-1">
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
                                                className="text-sm leading-relaxed line-clamp-2 flex-1"
                                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                                            >
                                                {post.excerpt}
                                            </p>

                                            {/* Tags */}
                                            <div className="flex flex-wrap gap-2 mt-4">
                                                {post.tags.slice(0, 3).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                                                        style={{
                                                            backgroundColor: 'rgba(15, 184, 133, 0.06)',
                                                            color: 'var(--ee-muted)',
                                                            fontFamily: 'var(--font-body)',
                                                        }}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Newsletter CTA */}
            <section className="pb-20 md:pb-32">
                <div className="container mx-auto px-4 sm:px-6">
                    <div
                        className="rounded-[20px] sm:rounded-[32px] p-6 sm:p-10 md:p-16 text-center relative overflow-hidden"
                        style={{ backgroundColor: 'var(--ee-text)' }}
                    >
                        <div
                            className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"
                            style={{ backgroundColor: 'rgba(15, 184, 133, 0.1)' }}
                        />
                        <div className="relative z-10">
                            <span
                                className="material-symbols-outlined mb-4 block"
                                style={{ fontSize: '40px', color: 'var(--ee-primary)' }}
                            >
                                mail
                            </span>
                            <h2
                                className="text-2xl md:text-4xl font-black tracking-tight mb-4"
                                style={{ color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}
                            >
                                Never Miss an Update
                            </h2>
                            <p
                                className="text-base md:text-lg max-w-lg mx-auto mb-8"
                                style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'var(--font-body)' }}
                            >
                                Get the latest farming insights, AI tips, and agricultural news delivered straight to your inbox.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="flex-1 px-6 py-3.5 rounded-full text-sm font-medium outline-none"
                                    style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        color: '#FFFFFF',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                />
                                <button
                                    className="px-8 py-3.5 rounded-full font-bold text-sm hover:scale-105 transition-all"
                                    style={{
                                        backgroundColor: 'var(--ee-primary)',
                                        color: '#FFFFFF',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    Subscribe
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
