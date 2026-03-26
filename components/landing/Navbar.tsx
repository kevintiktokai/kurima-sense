'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 50);
    });

    const navLinks = [
        { name: 'Features', href: '#features' },
        { name: 'For Farmers', href: '#farmers' },
        { name: 'For Agronomists', href: '#agronomists' },
        { name: 'Community', href: '#community' },
    ];

    return (
        <motion.nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                ? 'py-4'
                : 'py-6'
                }`}
            style={isScrolled ? {
                backgroundColor: 'rgba(244, 241, 237, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: 'var(--shadow-ambient)',
            } : {
                backgroundColor: 'transparent',
            }}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="container mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div
                        className="w-10 h-10 rounded-[12px] flex items-center justify-center font-black text-xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                        style={{
                            backgroundColor: 'var(--ee-primary)',
                            color: '#FFFFFF',
                            fontFamily: 'var(--font-heading)',
                        }}
                    >
                        K
                    </div>
                    <span
                        className="text-2xl font-black tracking-tighter"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        KurimaSense
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="font-medium text-sm uppercase tracking-widest transition-all hover:opacity-100"
                            style={{
                                color: 'var(--ee-muted)',
                                fontFamily: 'var(--font-body)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ee-text)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ee-muted)')}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* CTA Button */}
                <div className="hidden md:flex items-center gap-4">
                    <Link
                        href="/auth?mode=login"
                        className="font-bold text-sm transition-colors"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ee-primary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ee-text)')}
                    >
                        Login
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

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden"
                    style={{ color: 'var(--ee-text)' }}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="md:hidden overflow-hidden"
                    style={{
                        backgroundColor: 'var(--ee-bg)',
                        boxShadow: 'var(--shadow-ambient)',
                    }}
                >
                    <div className="flex flex-col p-6 gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="font-bold text-lg"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: '2px solid var(--ee-bg-pressed)' }}>
                            <Link
                                href="/auth?mode=login"
                                className="font-bold text-lg text-center py-2"
                                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                            <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                                <button
                                    className="w-full px-6 py-3 rounded-full font-bold transition-colors"
                                    style={{
                                        backgroundColor: 'var(--ee-primary)',
                                        color: '#FFFFFF',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    Get Started
                                </button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.nav>
    );
}
