'use client'

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { UserProfileProvider, useUserProfile } from '@/components/providers/UserProfileProvider';
import { DashboardDataProvider } from '@/components/providers/DashboardDataProvider';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import MarketTicker from '@/components/dashboard/MarketTicker';
import MobileNav from '@/components/dashboard/MobileNav';

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { profile, loading: profileLoading } = useUserProfile();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth');
        }
    }, [user, authLoading, router]);

    // Redirect to onboarding if no profile
    useEffect(() => {
        if (!authLoading && !profileLoading && user && !profile) {
            router.push('/onboarding');
        }
    }, [user, profile, authLoading, profileLoading, router]);

    if (authLoading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--ee-bg)' }}>
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full animate-spin mx-auto mb-4" style={{
                        border: '4px solid var(--ee-bg-pressed)',
                        borderTopColor: 'var(--ee-primary)'
                    }}></div>
                    <p style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!user || !profile) {
        return null;
    }

    return (
        <div className="flex min-h-screen relative" style={{ backgroundColor: 'var(--ee-bg)' }}>
            <Sidebar className="hidden lg:flex" />

            <main className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-0">
                <MarketTicker />

                <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
                    <Header />
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </div>
            </main>

            <MobileNav />
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <UserProfileProvider>
            <DashboardDataProvider>
                <DashboardContent>{children}</DashboardContent>
            </DashboardDataProvider>
        </UserProfileProvider>
    );
}
