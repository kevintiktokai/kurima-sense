"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import { useTutorial } from '@/components/providers/TutorialProvider';

interface SidebarProps {
    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
    const pathname = usePathname();
    const { profile, loading } = useUserProfile();
    const { startTutorial } = useTutorial();
    // Default collapsed on tablet-sized screens (< 1280px) so content has room to breathe
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        // Set initial state once based on viewport; respect user's manual toggle thereafter
        setIsCollapsed(window.matchMedia('(max-width: 1279px)').matches);
    }, []);


    const menuItems = [
        { id: 'overview', href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { id: 'plan', href: '/dashboard/plan', icon: 'calendar_month', label: 'My Plan' },
        { id: 'chat', href: '/dashboard/chat', icon: 'auto_awesome', label: 'AI Advisor' },
        { id: 'fields', href: '/dashboard/fields', icon: 'grass', label: 'My Fields' },
        { id: 'weather', href: '/dashboard/weather', icon: 'cloud', label: 'Climate' },
        { id: 'settings', href: '/dashboard/settings', icon: 'settings', label: 'Settings' },
    ];

    const isActive = (path: string) => {
        if (path === '/dashboard' && pathname === '/dashboard') return true;
        if (path !== '/dashboard' && pathname?.startsWith(path)) return true;
        return false;
    };

    return (
        <aside
            id="sidebar-nav"
            className={`
                flex flex-col h-screen sticky top-0 overflow-hidden py-8 md:py-10 px-4 md:px-6 transition-all duration-300 ease-in-out
                ${isCollapsed ? 'w-[5.5rem] md:w-[6.5rem]' : 'w-72'}
                hidden md:flex
                ${className}
            `}
            style={{ backgroundColor: 'var(--ee-bg-dim)' }}
        >
            {/* Logo */}
            <div className={`flex items-center gap-4 px-2 mb-14 ${isCollapsed ? 'justify-center' : ''}`}>
                <Image
                    src="/logo-200.png"
                    alt="KurimaSense"
                    width={48}
                    height={48}
                    className="rounded-[16px] flex-shrink-0"
                    style={{ boxShadow: 'var(--shadow-neu)' }}
                />
                {!isCollapsed && (
                    <h1
                        className="text-2xl tracking-tight uppercase"
                        style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}
                    >
                        Kurima
                    </h1>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            title={isCollapsed ? item.label : ''}
                            className={`w-full flex items-center gap-4 px-5 py-4 rounded-[16px] transition-all duration-200 group
                                ${isCollapsed ? 'justify-center px-0' : ''}
                            `}
                            style={{
                                backgroundColor: active ? 'var(--ee-surface)' : 'transparent',
                                boxShadow: active ? 'var(--shadow-neu)' : 'none',
                                color: active ? 'var(--ee-text)' : 'var(--ee-muted)',
                            }}
                        >
                            <span
                                className="material-symbols-outlined flex-shrink-0"
                                style={{
                                    color: active ? 'var(--ee-primary)' : 'var(--ee-muted)',
                                    fontSize: '24px',
                                    fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                                }}
                            >
                                {item.icon}
                            </span>
                            {!isCollapsed && (
                                <span
                                    className="text-sm font-bold uppercase tracking-widest whitespace-nowrap"
                                    style={{ fontFamily: 'var(--font-body)' }}
                                >
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User profile + collapse */}
            <div className="space-y-6 pt-6" style={{ borderTop: 'none' }}>
                <div className={`flex items-center gap-4 px-2 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl overflow-hidden flex-shrink-0"
                        style={{
                            backgroundColor: 'var(--ee-bg)',
                            boxShadow: 'var(--shadow-neu)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-primary)', fontSize: '24px' }}>person</span>
                    </div>
                    {!isCollapsed && (
                        <div>
                            <p className="text-sm font-bold truncate w-32" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>
                                {loading ? 'Loading...' : profile?.full_name || 'User'}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                {profile?.role === 'farmer' ? 'Commercial Farmer' :
                                    profile?.role === 'smallholder' ? 'Smallholder' :
                                        profile?.role === 'agronomist' ? 'Agronomist' :
                                            profile?.role || 'Free Plan'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center gap-2 py-3 mt-4 transition-colors"
                    style={{ color: 'var(--ee-muted)' }}
                >
                    <span
                        className={`material-symbols-outlined transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                        style={{ fontSize: '20px' }}
                    >
                        chevron_left
                    </span>
                    {!isCollapsed && <span className="text-xs font-bold uppercase" style={{ fontFamily: 'var(--font-body)' }}>Collapse</span>}
                </button>
            </div>

            {/* Tutorial Trigger */}
            <div className={`mt-auto px-2 pb-6 ${isCollapsed ? 'flex justify-center' : ''}`}>
                <button
                    onClick={startTutorial}
                    className={`flex items-center gap-3 p-3 rounded-[16px] transition-all duration-200
                        ${isCollapsed ? 'justify-center w-10 h-10' : 'w-full'}
                    `}
                    style={{
                        backgroundColor: isCollapsed ? 'var(--ee-primary)' : 'rgba(15, 184, 133, 0.1)',
                        color: 'var(--ee-text)',
                        boxShadow: isCollapsed ? 'var(--shadow-neu)' : 'none',
                    }}
                    title="Start Tutorial"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--ee-primary)' }}>help</span>
                    {!isCollapsed && <span className="text-sm font-bold uppercase tracking-widest" style={{ fontFamily: 'var(--font-body)' }}>Help / Tutorial</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
