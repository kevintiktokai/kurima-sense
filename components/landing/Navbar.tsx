'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { WHATSAPP_BRIEFING_URL } from '@/lib/contact';

const navLinks = [
    { name: 'For Institutions', href: '/for-buyers' },
    { name: 'Methodology', href: '/#methodology' },
    { name: 'For Farmers', href: '/#farmers' },
    { name: 'Blog', href: '/blog' },
];

interface NavbarProps {
    /**
     * 'transparent' — sits over a dark hero (home). Transparent at the top.
     * 'solid' — sits over a light page (institutional pages). Shows a dark
     * loam bar at the top so the nav is clearly visible against light content.
     * Both variants collapse into a floating pill on scroll.
     */
    variant?: 'transparent' | 'solid';
}

export default function Navbar({ variant = 'transparent' }: NavbarProps) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, 'change', (latest) => {
        setIsScrolled(latest > 40);
    });

    // Text is light in every state: top-transparent sits over the dark hero,
    // top-solid is a dark loam bar, and the scrolled pill is dark loam too.
    const linkColor = 'rgba(244,241,237,0.78)';

    // Outer bar background: dark loam when solid-at-top, transparent otherwise.
    const outerBg =
        !isScrolled && variant === 'solid'
            ? { backgroundColor: 'var(--ee-loam)', borderBottom: '1px solid var(--ee-loam-line)' }
            : { backgroundColor: 'transparent' };

    // Inner shell becomes a floating, blurred pill once scrolled.
    const pill = isScrolled
        ? {
              backgroundColor: 'rgba(14,26,20,0.82)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--ee-loam-line)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
          }
        : { backgroundColor: 'transparent' };

    return (
        <motion.nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'py-2.5' : 'py-4'}`}
            style={outerBg}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div
                className={`mx-auto px-4 sm:px-6 flex items-center justify-between transition-all duration-300 ${
                    isScrolled ? 'max-w-5xl rounded-full py-2 pl-5 pr-2.5' : 'container'
                }`}
                style={pill}
            >
                <Link href="/" className="flex items-center gap-2 group">
                    <Image src="/logo-200.png" alt="KurimaSense" width={34} height={34} className="rounded-[10px]" />
                    <span className="text-xl font-bold tracking-tight" style={{ color: '#F4F1ED', fontFamily: 'var(--font-heading)' }}>
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
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
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
                        style={{ color: '#F4F1ED', fontFamily: 'var(--font-body)' }}
                    >
                        Farmer login
                    </Link>
                    <a href={WHATSAPP_BRIEFING_URL} target="_blank" rel="noopener noreferrer">
                        <button
                            className="px-5 py-2.5 rounded-full font-semibold text-sm transition-transform hover:-translate-y-0.5"
                            style={{ backgroundColor: 'var(--ee-primary)', color: '#06140E', fontFamily: 'var(--font-body)' }}
                        >
                            Book a briefing
                        </button>
                    </a>
                </div>

                <button
                    className="lg:hidden"
                    aria-label="Toggle menu"
                    aria-expanded={isMobileMenuOpen}
                    style={{ color: '#F4F1ED' }}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </motion.div>

            {isMobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="lg:hidden overflow-hidden mx-4 mt-2 rounded-2xl"
                    style={{
                        backgroundColor: 'rgba(14,26,20,0.96)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid var(--ee-loam-line)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                    }}
                >
                    <div className="flex flex-col px-4 sm:px-6 py-4 gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="font-semibold text-base py-3 px-2 rounded-xl transition-colors"
                                style={{ color: '#F4F1ED', fontFamily: 'var(--font-body)' }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="flex flex-col gap-3 mt-2 pt-4" style={{ borderTop: '1px solid var(--ee-loam-line)' }}>
                            <Link
                                href="/auth?mode=login"
                                className="font-semibold text-base text-center py-2"
                                style={{ color: '#F4F1ED', fontFamily: 'var(--font-body)' }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Farmer login
                            </Link>
                            <a href={WHATSAPP_BRIEFING_URL} target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileMenuOpen(false)}>
                                <button
                                    className="w-full px-6 py-3 rounded-full font-semibold"
                                    style={{ backgroundColor: 'var(--ee-primary)', color: '#06140E', fontFamily: 'var(--font-body)' }}
                                >
                                    Book a briefing
                                </button>
                            </a>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.nav>
    );
}
