import React from 'react';
import Link from 'next/link';

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

            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <div
                                className="w-8 h-8 rounded-[10px] flex items-center justify-center font-black text-lg"
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
                                style={{ fontFamily: 'var(--font-heading)' }}
                            >
                                KurimaSense
                            </span>
                        </Link>
                        <p
                            className="mb-6 font-medium"
                            style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'var(--font-body)' }}
                        >
                            Empowering the next generation of African agriculture with intelligence and community.
                        </p>
                    </div>

                    <div>
                        <h4
                            className="font-bold uppercase tracking-widest text-xs mb-6"
                            style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                        >
                            Product
                        </h4>
                        <ul className="space-y-4 text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                            <li><Link href="#" className="transition-colors" style={{ color: 'rgba(255, 255, 255, 0.55)' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}>Features</Link></li>
                            <li><Link href="#" className="transition-colors" style={{ color: 'rgba(255, 255, 255, 0.55)' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}>Pricing</Link></li>
                            <li><Link href="#" className="transition-colors" style={{ color: 'rgba(255, 255, 255, 0.55)' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}>Sentinel API</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4
                            className="font-bold uppercase tracking-widest text-xs mb-6"
                            style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}
                        >
                            Company
                        </h4>
                        <ul className="space-y-4 text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                            <li><Link href="#" className="transition-colors" style={{ color: 'rgba(255, 255, 255, 0.55)' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}>About Us</Link></li>
                            <li><Link href="#" className="transition-colors" style={{ color: 'rgba(255, 255, 255, 0.55)' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}>Careers</Link></li>
                            <li><Link href="#" className="transition-colors" style={{ color: 'rgba(255, 255, 255, 0.55)' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}>Blog</Link></li>
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
                            <li><Link href="#" className="transition-colors" style={{ color: 'rgba(255, 255, 255, 0.55)' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}>Privacy Policy</Link></li>
                            <li><Link href="#" className="transition-colors" style={{ color: 'rgba(255, 255, 255, 0.55)' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}>Terms of Service</Link></li>
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
                    <div className="flex gap-6">
                        {/* Social Icons */}
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--ee-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#FFFFFF' }}>public</span>
                        </div>
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--ee-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#FFFFFF' }}>chat</span>
                        </div>
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--ee-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#FFFFFF' }}>mail</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
