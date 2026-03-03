"use client";

import React from 'react';

export interface GrowthStage {
    id: string;
    name: string;
    shortName: string;
    description: string;
    daysFromPlanting: number;
    status: 'completed' | 'current' | 'upcoming';
    activities?: string[];
}

interface GrowthStageTrackerProps {
    stages?: GrowthStage[];
    currentStage?: string;
    daysToHarvest?: number;
    plantingDate?: string;
    cropType?: string;
}

// Default maize growth stages
const DEFAULT_MAIZE_STAGES: GrowthStage[] = [
    { id: 'VE', name: 'Emergence', shortName: 'VE', description: 'Seedling emerges from soil', daysFromPlanting: 7, status: 'completed' },
    { id: 'V3', name: 'Third Leaf', shortName: 'V3', description: '3 leaves with visible collar', daysFromPlanting: 21, status: 'completed' },
    { id: 'V6', name: 'Sixth Leaf', shortName: 'V6', description: 'Growing point above soil', daysFromPlanting: 35, status: 'completed' },
    { id: 'V12', name: 'Twelfth Leaf', shortName: 'V12', description: 'Rapid growth phase', daysFromPlanting: 56, status: 'current' },
    { id: 'VT', name: 'Tasseling', shortName: 'VT', description: 'Tassel fully emerged', daysFromPlanting: 70, status: 'upcoming' },
    { id: 'R1', name: 'Silking', shortName: 'R1', description: 'Silks visible, pollination', daysFromPlanting: 75, status: 'upcoming' },
    { id: 'R3', name: 'Milk', shortName: 'R3', description: 'Kernels contain milky fluid', daysFromPlanting: 90, status: 'upcoming' },
    { id: 'R6', name: 'Maturity', shortName: 'R6', description: 'Black layer formed, harvest ready', daysFromPlanting: 120, status: 'upcoming' },
];

const stageColors = {
    completed: {
        bg: 'bg-brand-lime',
        border: 'border-brand-lime',
        text: 'text-brand-dark',
        line: 'bg-brand-lime'
    },
    current: {
        bg: 'bg-amber-400',
        border: 'border-amber-400',
        text: 'text-amber-900',
        line: 'bg-slate-200'
    },
    upcoming: {
        bg: 'bg-slate-200',
        border: 'border-slate-300',
        text: 'text-slate-400',
        line: 'bg-slate-200'
    }
};

export const GrowthStageTracker: React.FC<GrowthStageTrackerProps> = ({
    stages = DEFAULT_MAIZE_STAGES,
    currentStage,
    daysToHarvest,
    plantingDate,
    cropType = 'Maize'
}) => {
    // Calculate days since planting
    let daysSincePlanting = 0;
    if (plantingDate) {
        const pDate = new Date(plantingDate);
        daysSincePlanting = Math.floor((Date.now() - pDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Update stage statuses based on current stage or days
    const processedStages = stages.map(stage => {
        let status: GrowthStage['status'] = 'upcoming';

        if (currentStage) {
            const stageIndex = stages.findIndex(s => s.shortName === currentStage);
            const thisIndex = stages.findIndex(s => s.id === stage.id);

            if (thisIndex < stageIndex) status = 'completed';
            else if (thisIndex === stageIndex) status = 'current';
        } else if (daysSincePlanting > 0) {
            if (stage.daysFromPlanting < daysSincePlanting - 7) status = 'completed';
            else if (stage.daysFromPlanting <= daysSincePlanting + 7) status = 'current';
        }

        return { ...stage, status };
    });

    const currentStageData = processedStages.find(s => s.status === 'current');
    const completedCount = processedStages.filter(s => s.status === 'completed').length;
    const progressPercent = ((completedCount + 0.5) / processedStages.length) * 100;

    return (
        <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-lime rounded-full flex items-center justify-center text-xl">
                        🌱
                    </div>
                    <div>
                        <h3 className="font-black text-brand-dark text-lg">Growth Stage</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {cropType} • Day {daysSincePlanting}
                        </p>
                    </div>
                </div>

                {daysToHarvest && (
                    <div className="bg-brand-lime/20 px-4 py-2 rounded-full">
                        <p className="text-xs font-bold text-brand-dark">
                            🌾 {daysToHarvest} days to harvest
                        </p>
                    </div>
                )}
            </div>

            {/* Current Stage Highlight */}
            {currentStageData && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center text-white font-black text-lg">
                            {currentStageData.shortName}
                        </div>
                        <div>
                            <p className="font-bold text-amber-900">{currentStageData.name}</p>
                            <p className="text-sm text-amber-700">{currentStageData.description}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            <div className="relative mb-6">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-brand-lime to-amber-400 transition-all duration-1000"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Stage Timeline */}
            <div className="flex justify-between items-start overflow-x-auto pb-2">
                {processedStages.map((stage, idx) => {
                    const colors = stageColors[stage.status];
                    const isLast = idx === processedStages.length - 1;

                    return (
                        <div key={stage.id} className="flex flex-col items-center min-w-[60px] relative">
                            {/* Connector Line */}
                            {!isLast && (
                                <div className={`absolute top-4 left-1/2 w-full h-0.5 ${colors.line} z-0`} />
                            )}

                            {/* Stage Dot */}
                            <div className={`relative z-10 w-8 h-8 ${colors.bg} ${colors.border} border-2 rounded-full flex items-center justify-center ${stage.status === 'current' ? 'ring-4 ring-amber-200 animate-pulse' : ''}`}>
                                {stage.status === 'completed' && (
                                    <svg className="w-4 h-4 text-brand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>

                            {/* Label */}
                            <p className={`text-[10px] font-bold mt-2 ${colors.text} text-center`}>
                                {stage.shortName}
                            </p>
                            <p className={`text-[8px] ${stage.status === 'upcoming' ? 'text-slate-300' : 'text-slate-400'} text-center hidden lg:block`}>
                                Day {stage.daysFromPlanting}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export type { GrowthStageTrackerProps };
export default GrowthStageTracker;
