import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer
            className="py-20 relative overflow-hidden"
            style={{ backgroundColor: 'var(--ee-text)', color: '#FFFFFF' }}
        >
            {/* Decorative Background */}
            <div
                className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"
                style={{ backgroundColor: 'rgba(15, 184, 133, 0.06)' }}
            />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-8 sm:gap-10 md:gap-12 mb-12 md:mb-16">
                    <div className="col-span-2 md:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <Image
                                src="/logo-200.png"
                                alt="KurimaSense"
                                width={36}
                                height={36}
                            />
                            <span
                                className="text-2xl font-black tracking-tighter"
                                style={{ fontFamily: 'var(--font-heading)' }}
                            >
                                KurimaSense
                            </span>
                        </Link>
                        <p
                            className="mb-6 font-medium max-w-sm"
                            style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'var(--font-body)' }}
                        >
                            Empowering the next generation of African agriculture with AI-powered satellite intelligence, precision monitoring, and data-driven farming advice.
                        </p>
                        {/* Social Icons */}
                        <div className="flex gap-3">
                            {[
                                { icon: 'public', label: 'Website' },
                                { icon: 'smart_toy', label: 'AI Chat' },
                                { icon: 'mail', label: 'Email' },
                                { icon: 'groups', label: 'Community' },
                            ].map((social) => (
                                <div
                                    key={social.label}
                                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--ee-primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#FFFFFF' }}>{social.icon}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4
                            className="font-bold uppercase tracking-widest text-xs mb-6"
                            style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                        >
                            Product
                        </h4>
                        <ul className="space-y-4 text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                            {['Features', 'How It Works', 'AI Insights', 'Pricing'].map((item) => (
                                <li key={item}>
                                    <Link
                                        href={item === 'Features' ? '#features' : item === 'How It Works' ? '#how-it-works' : item === 'AI Insights' ? '#ai-insights' : '#'}
                                        className="transition-colors"
                                        style={{ color: 'rgba(255, 255, 255, 0.55)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}
                                    >
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4
                            className="font-bold uppercase tracking-widest text-xs mb-6"
                            style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                        >
                            Resources
                        </h4>
                        <ul className="space-y-4 text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                            {[
                                { name: 'Blog', href: '/blog' },
                                { name: 'For Farmers', href: '#farmers' },
                                { name: 'For Agronomists', href: '#agronomists' },
                                { name: 'Community', href: '#' },
                            ].map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="transition-colors"
                                        style={{ color: 'rgba(255, 255, 255, 0.55)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4
                            className="font-bold uppercase tracking-widest text-xs mb-6"
                            style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                        >
                            For Organizations
                        </h4>
                        <ul className="space-y-4 text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                            {[
                                { name: 'For Buyers', href: '/for-buyers' },
                                { name: 'For Lenders', href: '/for-lenders' },
                                { name: 'For Insurers', href: '/for-insurers' },
                            ].map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="transition-colors"
                                        style={{ color: 'rgba(255, 255, 255, 0.55)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4
                            className="font-bold uppercase tracking-widest text-xs mb-6"
                            style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                        >
                            Legal
                        </h4>
                        <ul className="space-y-4 text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                            {[
                                { name: 'Privacy Policy', href: '/privacy' },
                                { name: 'Terms of Service', href: '/terms' },
                            ].map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="transition-colors"
                                        style={{ color: 'rgba(255, 255, 255, 0.55)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div
                    className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
                    style={{ borderTop: '2px solid rgba(255, 255, 255, 0.08)' }}
                >
                    <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.3)', fontFamily: 'var(--font-body)' }}>
                        &copy; {new Date().getFullYear()} KurimaSense. All rights reserved.
                    </p>
                    <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.2)', fontFamily: 'var(--font-body)' }}>
                        Cultivating Intelligence, Harvesting Success.
                    </p>
                </div>
            </div>
        </footer>
    );
}
