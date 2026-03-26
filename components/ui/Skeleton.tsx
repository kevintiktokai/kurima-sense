"use client";

import React from 'react';

// Reusable skeleton component
export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`animate-pulse rounded-[16px] ${className}`} style={{ backgroundColor: 'var(--ee-bg-pressed)' }} />
);

// Dashboard skeleton loader
export const DashboardSkeleton: React.FC = () => (
    <div className="grid grid-cols-12 gap-5 lg:gap-8 pb-12">
        {/* Welcome Widget Skeleton */}
        <div className="col-span-12 lg:col-span-8 neu-surface p-8 lg:p-16 min-h-[350px]">
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-16 w-full mb-6" />
            <div className="flex gap-4">
                <Skeleton className="h-12 w-32 rounded-full" />
                <Skeleton className="h-12 w-48 rounded-full" />
            </div>
        </div>

        {/* Action Queue Skeleton */}
        <div className="col-span-12 lg:col-span-4 neu-surface p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        </div>

        {/* Yield Chart Skeleton */}
        <div className="col-span-12 lg:col-span-8 neu-surface p-6 lg:p-8">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-[280px] w-full" />
        </div>

        {/* Growth Stage Skeleton */}
        <div className="col-span-12 lg:col-span-4 neu-surface p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="flex justify-between mb-4">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-8 rounded-full" />
                ))}
            </div>
            <Skeleton className="h-20 w-full" />
        </div>

        {/* Risk Radar Skeleton */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 neu-surface p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="flex items-center justify-center">
                <Skeleton className="h-48 w-48 rounded-full" />
            </div>
        </div>

        {/* Actions Skeleton */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 neu-surface p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
            </div>
        </div>

        {/* Insights Skeleton */}
        <div className="col-span-12 lg:col-span-4 neu-surface p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        </div>
    </div>
);

// Card skeleton for individual use
export const CardSkeleton: React.FC<{ height?: string }> = ({ height = "h-32" }) => (
    <div className={`neu-surface p-6 ${height}`}>
        <Skeleton className="h-5 w-24 mb-3" />
        <Skeleton className="h-full w-full" />
    </div>
);

// Chart skeleton
export const ChartSkeleton: React.FC = () => (
    <div className="h-[350px] neu-surface flex items-center justify-center relative overflow-hidden">
        <div className="text-center z-10">
            <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-3" style={{
                border: '4px solid var(--ee-bg-pressed)',
                borderTopColor: 'var(--ee-primary)',
            }} />
            <p className="text-sm font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Generating AI Analysis...</p>
        </div>
    </div>
);

export default DashboardSkeleton;
