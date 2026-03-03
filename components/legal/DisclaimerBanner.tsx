"use client";

import React, { useState } from 'react';

interface DisclaimerBannerProps {
    type: 'yield' | 'chemical' | 'disease' | 'market' | 'general';
    showDismiss?: boolean;
    className?: string;
}

const DISCLAIMERS = {
    yield: {
        icon: '📊',
        title: 'Yield Estimate',
        message: 'This projection is based on variety data, satellite imagery, and weather patterns. Actual yields depend on rainfall, pest pressure, input quality, and management practices. Use as guidance only.',
        color: 'bg-amber-50 border-amber-200 text-amber-800'
    },
    chemical: {
        icon: '⚠️',
        title: 'Chemical Safety',
        message: 'Always read product labels and wear appropriate PPE (gloves, mask, overalls). Verify application rates with Agritex or AMA guidelines. Observe pre-harvest intervals.',
        color: 'bg-red-50 border-red-200 text-red-800'
    },
    disease: {
        icon: '🔬',
        title: 'Diagnostic Notice',
        message: 'This is an AI-assisted preliminary assessment. For valuable crops or severe outbreaks, confirm with laboratory testing or consult your local Agritex extension officer.',
        color: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    market: {
        icon: '💰',
        title: 'Market Data',
        message: 'Prices shown are indicative and sourced from available data. Always verify with actual buyers before making sales decisions.',
        color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    general: {
        icon: 'ℹ️',
        title: 'Advisory Notice',
        message: 'KurimaSense provides AI-powered agricultural guidance for informational purposes. Consult local extension officers for critical decisions.',
        color: 'bg-slate-50 border-slate-200 text-slate-700'
    }
};

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({
    type,
    showDismiss = true,
    className = ''
}) => {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const { icon, title, message, color } = DISCLAIMERS[type];

    return (
        <div className={`${color} border rounded-xl p-3 flex items-start gap-3 ${className}`}>
            <span className="text-xl flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm mb-0.5">{title}</p>
                <p className="text-xs opacity-90 leading-relaxed">{message}</p>
            </div>
            {showDismiss && (
                <button
                    onClick={() => setDismissed(true)}
                    className="text-current opacity-50 hover:opacity-100 transition-opacity text-lg"
                    aria-label="Dismiss"
                >
                    ×
                </button>
            )}
        </div>
    );
};

// Inline yield disclaimer for chart headers
export const YieldDisclaimerInline: React.FC<{ className?: string }> = ({ className = '' }) => (
    <p className={`text-[10px] text-slate-400 ${className}`}>
        ⚠️ Estimates only. Results vary with weather and management.
    </p>
);

// Full terms disclaimer for important screens
export const FullTermsDisclaimer: React.FC = () => (
    <div className="bg-slate-100 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
        <p className="font-bold text-slate-700">Agricultural Advisory Disclaimer</p>
        <p>
            KurimaSense provides AI-powered agricultural information for educational and informational
            purposes only. This should NOT be considered as professional agronomic advice, guaranteed
            yield predictions, definitive disease diagnoses, or licensed pesticide application recommendations.
        </p>
        <p>
            All agricultural decisions are ultimately your responsibility. We recommend consulting with
            local Agritex extension officers, certified agronomists, and agricultural authorities for
            critical decisions.
        </p>
        <p className="text-slate-500 text-[10px]">
            By using KurimaSense, you acknowledge these limitations and accept our Terms of Service.
        </p>
    </div>
);

export default DisclaimerBanner;
