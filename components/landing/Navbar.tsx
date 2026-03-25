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
                ? 'bg-[#EBEBE3]/80 backdrop-blur-md border-b border-[#2D3A26]/5 py-4'
                : 'bg-transparent py-6'
                }`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="container mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 bg-[#2D3A26] rounded-xl flex items-center justify-center text-[#D7F26C] font-black text-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        K
                    </div>
                    <span className={`text-2xl font-black tracking-tighter ${isScrolled ? 'text-[#2D3A26]' : 'text-[#2D3A26]'}`}>
                        KurimaSense
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-[#2D3A26]/80 hover:text-[#2D3A26] font-medium text-sm uppercase tracking-widest hover:underline decoration-[#D7F26C] decoration-2 underline-offset-4 transition-all"
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* CTA Button */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/auth?mode=login" className="text-[#2D3A26] font-bold text-sm hover:text-[#4A5D3B] transition-colors">
                        Login
                    </Link>
                    <Link href="/auth">
                        <button className="bg-[#2D3A26] text-[#D7F26C] px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#1a2216] hover:scale-105 transition-all shadow-xl shadow-[#2D3A26]/10">
                            Get Started
                        </button>
                    </Link>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-[#2D3A26]"
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
                    className="md:hidden bg-[#EBEBE3] border-t border-[#2D3A26]/10 overflow-hidden shadow-2xl"
                >
                    <div className="flex flex-col p-6 gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-[#2D3A26] font-bold text-lg"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="flex flex-col gap-3 mt-4 border-t border-[#2D3A26]/10 pt-4">
                            <Link
                                href="/auth?mode=login"
                                className="text-[#2D3A26] font-bold text-lg text-center py-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                            <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                                <button className="w-full bg-[#2D3A26] text-[#D7F26C] px-6 py-3 rounded-xl font-bold hover:bg-[#1a2216] transition-colors">
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
