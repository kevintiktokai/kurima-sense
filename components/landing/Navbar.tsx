'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
    { name: 'For Institutions', href: '/for-buyers' },
    { name: 'Methodology', href: '#methodology' },
    { name: 'For Farmers', href: '#farmers' },
    { name: 'Blog', href: '/blog' },
];

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, 'change', (latest) => {
        setIsScrolled(latest > 50);
    });

    // Light text over the dark loam hero; dark text once the oat bar appears.
    const linkColor = isScrolled ? 'var(--ee-muted)' : 'rgba(244,241,237,0.78)';
    const brandColor = isScrolled ? 'var(--ee-text)' : '#F4F1ED';

    return (
        <motion.nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'py-3' : 'py-5'}`}
            style={
                isScrolled
                    ? {
                          backgroundColor: 'rgba(244, 241, 237, 0.85)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          borderBottom: '1px solid var(--ee-bg-border)',
                      }
                    : { backgroundColor: 'transparent' }
            }
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <Image src="/logo-200.png" alt="KurimaSense" width={36} height={36} className="rounded-[10px]" />
                    <span className="text-xl font-bold tracking-tight" style={{ color: brandColor, fontFamily: 'var(--font-heading)' }}>
                        KurimaSense
                    </span>
                </Link>

                <div className="hidden lg:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="font-semibold text-[13px] uppercase tracking-widest transition-colors"
                            style={{ color: linkColor, fontFamily: 'var(--font-body)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = isScrolled ? 'var(--ee-text)' : '#FFFFFF')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                <div className="hidden lg:flex items-center gap-5">
                    <Link
                        href="/auth?mode=login"
                        className="font-semibold text-sm transition-colors"
                        style={{ color: brandColor, fontFamily: 'var(--font-body)' }}
                    >
                        Farmer login
                    </Link>
                    <a href="https://calendly.com/kurimasense/demo" target="_blank" rel="noopener noreferrer">
                        <button
                            className="px-5 py-2.5 rounded-full font-semibold text-sm transition-transform hover:-translate-y-0.5"
                            style={{ backgroundColor: 'var(--ee-primary)', color: '#06140E', fontFamily: 'var(--font-body)' }}
                        >
                            Request a briefing
                        </button>
                    </a>
                </div>

                <button
                    className="lg:hidden"
                    aria-label="Toggle menu"
                    style={{ color: brandColor }}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {isMobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="lg:hidden overflow-hidden mt-3"
                    style={{ backgroundColor: 'var(--ee-bg)', boxShadow: 'var(--shadow-ambient)' }}
                >
                    <div className="flex flex-col px-4 sm:px-6 py-4 gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="font-semibold text-base py-3 px-2 rounded-xl active:bg-[var(--ee-bg-pressed)] transition-colors"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="flex flex-col gap-3 mt-2 pt-4" style={{ borderTop: '1px solid var(--ee-bg-border)' }}>
                            <Link
                                href="/auth?mode=login"
                                className="font-semibold text-base text-center py-2"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Farmer login
                            </Link>
                            <a href="https://calendly.com/kurimasense/demo" target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileMenuOpen(false)}>
                                <button
                                    className="w-full px-6 py-3 rounded-full font-semibold"
                                    style={{ backgroundColor: 'var(--ee-primary)', color: '#06140E', fontFamily: 'var(--font-body)' }}
                                >
                                    Request a briefing
                                </button>
                            </a>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.nav>
    );
}
