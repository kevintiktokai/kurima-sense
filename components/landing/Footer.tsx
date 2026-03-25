import React from 'react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-[#2D3A26] text-white py-20 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D7F26C]/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />


            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-[#D7F26C] rounded-lg flex items-center justify-center text-[#2D3A26] font-black text-lg">
                                K
                            </div>
                            <span className="text-2xl font-black tracking-tighter">KurimaSense</span>
                        </Link>
                        <p className="text-white/60 mb-6 font-medium">
                            Empowering the next generation of African agriculture with intelligence and community.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-[#D7F26C] uppercase tracking-widest text-xs mb-6">Product</h4>
                        <ul className="space-y-4 text-sm font-medium text-white/70">
                            <li><Link href="#" className="hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Sentinel API</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-[#D7F26C] uppercase tracking-widest text-xs mb-6">Company</h4>
                        <ul className="space-y-4 text-sm font-medium text-white/70">
                            <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-[#D7F26C] uppercase tracking-widest text-xs mb-6">Legal</h4>
                        <ul className="space-y-4 text-sm font-medium text-white/70">
                            <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-white/40 text-sm">© {new Date().getFullYear()} KurimaSense. All rights reserved.</p>
                    <div className="flex gap-6">
                        {/* Social Icons Placeholder */}
                        <div className="w-6 h-6 bg-white/10 rounded-full hover:bg-[#D7F26C] hover:text-[#2D3A26] transition-colors cursor-pointer" />
                        <div className="w-6 h-6 bg-white/10 rounded-full hover:bg-[#D7F26C] hover:text-[#2D3A26] transition-colors cursor-pointer" />
                        <div className="w-6 h-6 bg-white/10 rounded-full hover:bg-[#D7F26C] hover:text-[#2D3A26] transition-colors cursor-pointer" />
                    </div>
                </div>
            </div>
        </footer>
    );
}
