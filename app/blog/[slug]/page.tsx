'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { blogPosts } from '@/lib/blog-data';

export default function BlogPostPage() {
    const params = useParams();
    const slug = params.slug as string;
    const post = blogPosts.find(p => p.slug === slug);

    if (!post) {
        return (
            <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--ee-bg)' }}>
                <div className="text-center">
                    <span className="material-symbols-outlined mb-4 block" style={{ fontSize: '48px', color: 'var(--ee-muted)' }}>article</span>
                    <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>Article Not Found</h1>
                    <Link href="/blog" className="font-bold" style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}>
                        Back to Blog
                    </Link>
                </div>
            </main>
        );
    }

    const relatedPosts = blogPosts.filter(p => p.slug !== slug).slice(0, 3);

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
                            href="/blog"
                            className="hidden md:inline-flex items-center gap-1 font-bold text-sm transition-colors"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                            All Articles
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

            {/* Article Header */}
            <section className="pt-32 pb-12 md:pt-40 md:pb-16">
                <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <span
                                className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                style={{
                                    backgroundColor: 'var(--ee-text)',
                                    color: '#FFFFFF',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                {post.category}
                            </span>
                            <span className="text-sm" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                {post.date}
                            </span>
                            <span style={{ color: 'var(--ee-bg-border)' }}>·</span>
                            <span className="text-sm" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                {post.readTime}
                            </span>
                        </div>

                        <h1
                            className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-6 sm:mb-8 leading-tight"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            {post.title}
                        </h1>

                        <div className="flex items-center gap-4 mb-8 pb-8" style={{ borderBottom: '2px solid var(--ee-bg-pressed)' }}>
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                                style={{
                                    backgroundColor: 'var(--ee-text)',
                                    color: 'var(--ee-primary)',
                                    fontFamily: 'var(--font-heading)',
                                }}
                            >
                                {post.author.avatar}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>
                                    {post.author.name}
                                </h4>
                                <p className="text-xs" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                    {post.author.role}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Article Body */}
            <section className="pb-16 md:pb-20">
                <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="prose-custom"
                        style={{ fontFamily: 'var(--font-body)' }}
                    >
                        <ReactMarkdown
                            components={{
                                h2: ({ children }) => (
                                    <h2
                                        className="text-2xl md:text-3xl font-bold mt-12 mb-4"
                                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                    >
                                        {children}
                                    </h2>
                                ),
                                h3: ({ children }) => (
                                    <h3
                                        className="text-xl md:text-2xl font-bold mt-8 mb-3"
                                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                    >
                                        {children}
                                    </h3>
                                ),
                                p: ({ children }) => (
                                    <p
                                        className="text-base md:text-lg leading-relaxed mb-6"
                                        style={{ color: 'var(--ee-muted)' }}
                                    >
                                        {children}
                                    </p>
                                ),
                                ul: ({ children }) => (
                                    <ul className="space-y-2 mb-6 ml-4" style={{ color: 'var(--ee-muted)' }}>
                                        {children}
                                    </ul>
                                ),
                                ol: ({ children }) => (
                                    <ol className="space-y-2 mb-6 ml-4 list-decimal" style={{ color: 'var(--ee-muted)' }}>
                                        {children}
                                    </ol>
                                ),
                                li: ({ children }) => (
                                    <li className="text-base md:text-lg leading-relaxed pl-2">
                                        {children}
                                    </li>
                                ),
                                strong: ({ children }) => (
                                    <strong style={{ color: 'var(--ee-text)', fontWeight: 700 }}>
                                        {children}
                                    </strong>
                                ),
                                table: ({ children }) => (
                                    <div className="overflow-x-auto mb-6 rounded-[16px]" style={{ border: '1px solid var(--ee-bg-border)' }}>
                                        <table className="w-full text-sm">
                                            {children}
                                        </table>
                                    </div>
                                ),
                                thead: ({ children }) => (
                                    <thead style={{ backgroundColor: 'var(--ee-bg-pressed)' }}>
                                        {children}
                                    </thead>
                                ),
                                th: ({ children }) => (
                                    <th
                                        className="px-4 py-3 text-left font-bold text-sm"
                                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                    >
                                        {children}
                                    </th>
                                ),
                                td: ({ children }) => (
                                    <td
                                        className="px-4 py-3 text-sm"
                                        style={{ color: 'var(--ee-muted)', borderTop: '1px solid var(--ee-bg-border)' }}
                                    >
                                        {children}
                                    </td>
                                ),
                            }}
                        >
                            {post.content}
                        </ReactMarkdown>
                    </motion.div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-12 pt-8" style={{ borderTop: '2px solid var(--ee-bg-pressed)' }}>
                        {post.tags.map((tag) => (
                            <span
                                key={tag}
                                className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full"
                                style={{
                                    backgroundColor: 'var(--ee-bg-pressed)',
                                    color: 'var(--ee-muted)',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Share / CTA */}
                    <div
                        className="mt-12 rounded-[20px] sm:rounded-[24px] p-6 sm:p-8 md:p-10 text-center"
                        style={{ backgroundColor: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}
                    >
                        <span
                            className="material-symbols-outlined mb-3 block"
                            style={{ fontSize: '32px', color: 'var(--ee-primary)' }}
                        >
                            agriculture
                        </span>
                        <h3
                            className="text-xl md:text-2xl font-bold mb-3"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            Want these insights for your farm?
                        </h3>
                        <p
                            className="text-sm mb-6 max-w-md mx-auto"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            KurimaSense delivers personalized AI advice tailored to your specific fields, crops, and conditions.
                        </p>
                        <Link href="/auth">
                            <button
                                className="px-8 py-3.5 rounded-full font-bold text-sm hover:scale-105 transition-all"
                                style={{
                                    backgroundColor: 'var(--ee-primary)',
                                    color: '#FFFFFF',
                                    boxShadow: '0 4px 14px rgba(15, 184, 133, 0.25)',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                Start for Free
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Related Posts */}
            <section className="pb-20 md:pb-32" style={{ backgroundColor: 'var(--ee-bg-dim)' }}>
                <div className="container mx-auto px-4 sm:px-6 py-16 md:py-20">
                    <h2
                        className="text-2xl md:text-3xl font-black tracking-tight mb-10"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        More Articles
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        {relatedPosts.map((related) => (
                            <Link key={related.slug} href={`/blog/${related.slug}`} className="group block">
                                <div className="neu-surface overflow-hidden group-hover:scale-[1.02] transition-transform duration-300">
                                    <div
                                        className="relative aspect-[16/10] overflow-hidden"
                                        style={{ backgroundColor: 'var(--ee-bg-pressed)' }}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '48px', color: 'var(--ee-bg-border)' }}
                                            >
                                                {related.icon}
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
                                            {related.category}
                                        </div>
                                    </div>
                                    <div className="p-6 md:p-8">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-xs font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                                {related.date}
                                            </span>
                                            <span style={{ color: 'var(--ee-bg-border)' }}>·</span>
                                            <span className="text-xs font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                                {related.readTime}
                                            </span>
                                        </div>
                                        <h3
                                            className="text-lg font-bold group-hover:text-[var(--ee-primary)] transition-colors line-clamp-2"
                                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                                        >
                                            {related.title}
                                        </h3>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
