"use client";

import React from 'react';

// Reusable skeleton component
export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`bg-slate-200 animate-pulse rounded-lg ${className}`} />
);

// Dashboard skeleton loader
export const DashboardSkeleton: React.FC = () => (
    <div className="grid grid-cols-12 gap-4 lg:gap-8 animate-in fade-in duration-300 pb-12">
        {/* Welcome Widget Skeleton */}
        <div className="col-span-12 lg:col-span-8 bg-white/60 backdrop-blur p-8 lg:p-16 rounded-[2.5rem] lg:rounded-[4rem] shadow-xl border border-white/40 min-h-[350px]">
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-16 w-full mb-6 rounded-xl" />
            <div className="flex gap-4">
                <Skeleton className="h-12 w-32 rounded-full" />
                <Skeleton className="h-12 w-48 rounded-full" />
            </div>
        </div>

        {/* Market Prices Skeleton */}
        <div className="col-span-12 lg:col-span-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
            </div>
        </div>

        {/* Yield Chart Skeleton */}
        <div className="col-span-12 lg:col-span-8 bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-[280px] w-full rounded-xl" />
        </div>

        {/* Growth Stage Skeleton */}
        <div className="col-span-12 lg:col-span-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="flex justify-between mb-4">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-8 rounded-full" />
                ))}
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
        </div>

        {/* Risk Radar Skeleton */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="flex items-center justify-center">
                <Skeleton className="h-48 w-48 rounded-full" />
            </div>
        </div>

        {/* Actions Skeleton */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
            </div>
        </div>

        {/* Insights Skeleton */}
        <div className="col-span-12 lg:col-span-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
            </div>
        </div>
    </div>
);

// Card skeleton for individual use
export const CardSkeleton: React.FC<{ height?: string }> = ({ height = "h-32" }) => (
    <div className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 ${height}`}>
        <Skeleton className="h-5 w-24 mb-3" />
        <Skeleton className="h-full w-full rounded-xl" />
    </div>
);

// Chart skeleton
export const ChartSkeleton: React.FC = () => (
    <div className="h-[350px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"
            style={{ animation: 'shimmer 2s infinite' }} />
        <div className="text-center z-10">
            <div className="w-12 h-12 border-4 border-brand-lime border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">Generating AI Analysis...</p>
        </div>
    </div>
);

export default DashboardSkeleton;
