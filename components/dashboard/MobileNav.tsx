"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { isTabActive } from '@/lib/nav-links';

const MobileNav: React.FC = () => {
    const pathname = usePathname();

    const menuItems = [
        { id: 'overview', href: '/dashboard', icon: 'dashboard', label: 'Dash' },
        { id: 'plan', href: '/dashboard/plan', icon: 'calendar_month', label: 'Plan' },
        { id: 'chat', href: '/dashboard/chat', icon: 'auto_awesome', label: 'AI' },
        { id: 'weather', href: '/dashboard/weather', icon: 'cloud', label: 'Climate' },
        { id: 'fields', href: '/dashboard/fields', icon: 'grass', label: 'Fields' },
    ];

    // Dashboard root matches exactly; every other tab matches itself or a
    // sub-route (prefix) via the shared helper, so detail pages light up their
    // parent tab.
    const isActive = (path: string) =>
        path === '/dashboard' ? pathname === '/dashboard' : isTabActive(pathname, path);

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pt-2 safe-pb safe-x">
            <div
                className="max-w-md mx-auto rounded-[24px] flex items-center justify-around p-2"
                style={{
                    backgroundColor: 'var(--ee-bg)',
                    boxShadow: 'var(--shadow-neu)',
                }}
            >
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
                                    className="absolute inset-1 rounded-full"
                                    style={{ backgroundColor: 'var(--ee-primary)', opacity: 0.12 }}
                                    transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                                />
                            )}
                            <span
                                className="material-symbols-outlined relative z-10"
                                style={{
                                    color: active ? 'var(--ee-primary)' : 'var(--ee-muted)',
                                    fontSize: '24px',
                                    fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                                }}
                            >
                                {item.icon}
                            </span>
                            <span
                                className="text-[10px] font-bold uppercase tracking-wider relative z-10 mt-0.5"
                                style={{
                                    color: active ? 'var(--ee-primary)' : 'var(--ee-muted)',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
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
