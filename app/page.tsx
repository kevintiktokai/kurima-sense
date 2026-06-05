'use client';

import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Stats from '@/components/landing/Stats';
import Moat from '@/components/landing/Moat';
import ForOrganizations from '@/components/landing/ForOrganizations';
import Methodology from '@/components/landing/Methodology';
import Segments from '@/components/landing/Segments';
import Testimonials from '@/components/landing/Testimonials';
import BlogPreview from '@/components/landing/BlogPreview';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
    return (
        <main className="min-h-screen" style={{ backgroundColor: 'var(--ee-bg)' }}>
            <Navbar />
            {/* Option A — institution-led spine:
                Hero → credibility strip → moat → institutional offerings →
                methodology/trust → farmer data layer → proof → blog → split CTA */}
            <Hero />
            <Stats />
            <Moat />
            <ForOrganizations />
            <Methodology />
            <Segments />
            <Testimonials />
            <BlogPreview />
            <CTA />
            <Footer />
        </main>
    );
}
