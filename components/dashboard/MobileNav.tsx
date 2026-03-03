"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const MobileNav: React.FC = () => {
    const pathname = usePathname();

    const menuItems = [
        { id: 'overview', href: '/dashboard', icon: '📊', label: 'Dash' },
        { id: 'plan', href: '/dashboard/plan', icon: '📅', label: 'Plan' },
        { id: 'chat', href: '/dashboard/chat', icon: '✨', label: 'AI' },
        { id: 'weather', href: '/dashboard/weather', icon: '🌦️', label: 'Climate' },
        { id: 'fields', href: '/dashboard/fields', icon: '🌱', label: 'Fields' },
    ];

    const isActive = (path: string) => {
        if (path === '/dashboard' && pathname === '/dashboard') return true;
        if (path !== '/dashboard' && pathname?.startsWith(path)) return true;
        return false;
    };

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 h-24 bg-gradient-to-t from-brand-surface via-brand-surface/95 to-transparent pointer-events-none">
            <div className="max-w-md mx-auto glass-dark rounded-[2.5rem] shadow-2xl pointer-events-auto flex items-center justify-around p-2 border border-white/20">
                {menuItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all duration-300"
                        >
                            {active && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-brand-lime rounded-full shadow-[0_0_20px_rgba(215,242,108,0.4)]"
                                    transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                                />
                            )}
                            <span className={`text-2xl relative z-10 ${active ? 'scale-110' : 'opacity-60 grayscale'}`}>
                                {item.icon}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-widest relative z-10 mt-0.5 ${active ? 'text-brand-dark' : 'text-white/40'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileNav;
