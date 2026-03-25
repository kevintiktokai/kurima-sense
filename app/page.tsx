'use client';

import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Segments from '@/components/landing/Segments';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#EBEBE3]">
      <Navbar />
      <Hero />
      <Segments />
      <Footer />
    </main>
  );
}
