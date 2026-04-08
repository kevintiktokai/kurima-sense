'use client';

import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Stats from '@/components/landing/Stats';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Segments from '@/components/landing/Segments';
import AIInsights from '@/components/landing/AIInsights';
import Testimonials from '@/components/landing/Testimonials';
import BlogPreview from '@/components/landing/BlogPreview';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ee-bg)' }}>
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Segments />
      <AIInsights />
      <Testimonials />
      <BlogPreview />
      <CTA />
      <Footer />
    </main>
  );
}
