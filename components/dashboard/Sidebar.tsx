"use client";

import React from 'react';
import Link from 'next/link';
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
    const [isCollapsed, setIsCollapsed] = React.useState(false);


    const menuItems = [
        { id: 'overview', href: '/dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'plan', href: '/dashboard/plan', icon: '📅', label: 'My Plan' },
        { id: 'chat', href: '/dashboard/chat', icon: '✨', label: 'AI Advisor' },
        { id: 'fields', href: '/dashboard/fields', icon: '🌱', label: 'My Fields' },
        { id: 'weather', href: '/dashboard/weather', icon: '☁️', label: 'Climate' },
        { id: 'settings', href: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
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
                bg-white flex flex-col h-screen sticky top-0 overflow-hidden py-10 px-6 border-r border-slate-200 shadow-sm transition-all duration-300 ease-in-out
                ${isCollapsed ? 'w-[6.5rem]' : 'w-72'}
                hidden lg:flex
                ${className}
            `}
        >
            <div className={`flex items-center gap-4 px-2 mb-14 ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="w-12 h-12 bg-brand-dark rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-brand-dark/20 flex-shrink-0">
                    <svg className="w-7 h-7 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                {!isCollapsed && (
                    <h1 className="text-2xl font-black tracking-tighter text-brand-dark uppercase animate-in fade-in slide-in-from-left-2 duration-300">Kurima</h1>
                )}
            </div>

            <nav className="flex-1 space-y-3">
                {menuItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            title={isCollapsed ? item.label : ''}
                            className={`w-full flex items-center gap-5 px-5 py-4 rounded-[1.5rem] transition-all duration-300 group
                                ${active
                                    ? 'bg-white text-brand-dark font-black custom-shadow scale-105 border border-slate-100'
                                    : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'
                                }
                                ${isCollapsed ? 'justify-center px-0' : ''}
                            `}
                        >
                            <span className={`text-2xl flex-shrink-0 ${active ? 'text-brand-lime' : ''}`}>{item.icon}</span>
                            {!isCollapsed && (
                                <span className="text-sm font-bold uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-left-2">{item.label}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="space-y-6 pt-6 border-t border-slate-200">
                <div className={`flex items-center gap-4 px-2 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-xl overflow-hidden ring-4 ring-white shadow-md flex-shrink-0">
                        👨‍🌾
                    </div>
                    {!isCollapsed && (
                        <div className="animate-in fade-in slide-in-from-left-2">
                            <p className="text-sm font-black text-brand-dark truncate w-32">
                                {loading ? 'Loading...' : profile?.full_name || 'User'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
                    className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-slate-300 hover:text-brand-dark transition-colors"
                >
                    <svg className={`w-6 h-6 transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                    {!isCollapsed && <span className="text-xs font-bold uppercase">Collapse</span>}
                </button>
            </div>
            {/* Tutorial Trigger Button */}
            <div className={`mt-auto px-2 pb-6 ${isCollapsed ? 'flex justify-center' : ''}`}>
                <button
                    onClick={startTutorial}
                    className={`
                        flex items-center gap-3 p-3 rounded-xl transition-all duration-300
                        ${isCollapsed
                            ? 'bg-brand-lime text-brand-dark justify-center w-10 h-10 shadow-lg'
                            : 'bg-brand-lime/10 text-brand-dark hover:bg-brand-lime w-full'
                        }
                    `}
                    title="Start Tutorial"
                >
                    <span className="text-xl">❓</span>
                    {!isCollapsed && <span className="text-sm font-bold uppercase tracking-widest">Help / Tutorial</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
