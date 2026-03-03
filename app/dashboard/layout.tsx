'use client'

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { UserProfileProvider, useUserProfile } from '@/components/providers/UserProfileProvider';
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-green-900/20 dark:to-gray-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user || !profile) {
        return null;
    }

    return (
        <div className="flex bg-brand-surface min-h-screen relative">
            <Sidebar className="hidden lg:flex" />

            <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
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
            <DashboardContent>{children}</DashboardContent>
        </UserProfileProvider>
    );
}
