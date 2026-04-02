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

// Crop-specific growth stages — each crop shows its own phenological timeline
const CROP_STAGES: Record<string, GrowthStage[]> = {
    Maize: [
        { id: 'VE', name: 'Emergence', shortName: 'VE', description: 'Seedling emerges from soil', daysFromPlanting: 10, status: 'upcoming' },
        { id: 'V3', name: 'Early Veg', shortName: 'V3', description: 'V1-V3: early vegetative', daysFromPlanting: 21, status: 'upcoming' },
        { id: 'V6', name: 'Mid Veg', shortName: 'V6', description: 'V4-V6: top-dress window', daysFromPlanting: 35, status: 'upcoming' },
        { id: 'V10', name: 'Late Veg', shortName: 'V10', description: 'V7-V10: rapid growth', daysFromPlanting: 49, status: 'upcoming' },
        { id: 'VT', name: 'Tasseling', shortName: 'VT', description: 'Peak water demand', daysFromPlanting: 63, status: 'upcoming' },
        { id: 'R1', name: 'Silking', shortName: 'R1', description: 'Pollination period', daysFromPlanting: 73, status: 'upcoming' },
        { id: 'R3', name: 'Grain Fill', shortName: 'R3', description: 'Kernel development', daysFromPlanting: 96, status: 'upcoming' },
        { id: 'R6', name: 'Maturity', shortName: 'R6', description: 'Black layer — harvest ready', daysFromPlanting: 130, status: 'upcoming' },
    ],
    Soybean: [
        { id: 'VE', name: 'Emergence', shortName: 'VE', description: 'Seedling emerges', daysFromPlanting: 8, status: 'upcoming' },
        { id: 'V3', name: 'Vegetative', shortName: 'V3', description: 'V1-V6: check nodulation', daysFromPlanting: 26, status: 'upcoming' },
        { id: 'R1', name: 'Flowering', shortName: 'R1', description: 'R1-R2: critical water period', daysFromPlanting: 50, status: 'upcoming' },
        { id: 'R3', name: 'Pod Set', shortName: 'R3', description: 'R3-R4: pod development', daysFromPlanting: 72, status: 'upcoming' },
        { id: 'R5', name: 'Seed Fill', shortName: 'R5', description: 'R5-R6: seed enlargement', daysFromPlanting: 90, status: 'upcoming' },
        { id: 'R8', name: 'Maturity', shortName: 'R8', description: '95% pods mature — harvest', daysFromPlanting: 120, status: 'upcoming' },
    ],
    Tobacco: [
        { id: 'TP', name: 'Transplant', shortName: 'TP', description: 'Establishment period', daysFromPlanting: 10, status: 'upcoming' },
        { id: 'RG', name: 'Rapid Growth', shortName: 'RG', description: 'Rapid leaf expansion', daysFromPlanting: 38, status: 'upcoming' },
        { id: 'TOP', name: 'Topping', shortName: 'TOP', description: 'Remove flower head', daysFromPlanting: 63, status: 'upcoming' },
        { id: 'RIP', name: 'Ripening', shortName: 'RIP', description: 'Leaf yellowing & harvest', daysFromPlanting: 85, status: 'upcoming' },
        { id: 'HRV', name: 'Harvest', shortName: 'HRV', description: 'Priming & curing', daysFromPlanting: 100, status: 'upcoming' },
    ],
    Groundnuts: [
        { id: 'VE', name: 'Emergence', shortName: 'VE', description: 'Seedling emerges', daysFromPlanting: 10, status: 'upcoming' },
        { id: 'VEG', name: 'Vegetative', shortName: 'VEG', description: 'Canopy development', daysFromPlanting: 27, status: 'upcoming' },
        { id: 'FL', name: 'Flowering', shortName: 'FL', description: 'Flowering & pegging', daysFromPlanting: 55, status: 'upcoming' },
        { id: 'PF', name: 'Pod Fill', shortName: 'PF', description: 'Pod development', daysFromPlanting: 85, status: 'upcoming' },
        { id: 'MAT', name: 'Maturity', shortName: 'MAT', description: 'Lift & dry', daysFromPlanting: 115, status: 'upcoming' },
    ],
};

const DEFAULT_GENERIC_STAGES: GrowthStage[] = [
    { id: 'EST', name: 'Establishment', shortName: 'EST', description: 'Germination & emergence', daysFromPlanting: 14, status: 'upcoming' },
    { id: 'VEG', name: 'Vegetative', shortName: 'VEG', description: 'Leaf & stem growth', daysFromPlanting: 42, status: 'upcoming' },
    { id: 'REP', name: 'Reproductive', shortName: 'REP', description: 'Flowering & fruiting', daysFromPlanting: 70, status: 'upcoming' },
    { id: 'MAT', name: 'Maturity', shortName: 'MAT', description: 'Harvest ready', daysFromPlanting: 100, status: 'upcoming' },
];

const getStagesForCrop = (cropType: string): GrowthStage[] => {
    const normalised = cropType?.trim() || 'Maize';
    for (const [key, stages] of Object.entries(CROP_STAGES)) {
        if (normalised.toLowerCase() === key.toLowerCase()) return stages;
    }
    if (normalised.toLowerCase() === 'soybeans') return CROP_STAGES.Soybean;
    if (normalised.toLowerCase() === 'groundnut') return CROP_STAGES.Groundnuts;
    return DEFAULT_GENERIC_STAGES;
};

export const GrowthStageTracker: React.FC<GrowthStageTrackerProps> = ({
    stages,
    currentStage,
    daysToHarvest,
    plantingDate,
    cropType = 'Maize'
}) => {
    if (!stages || stages.length === 0) {
        stages = getStagesForCrop(cropType);
    }

    let daysSincePlanting = 0;
    if (plantingDate) {
        const pDate = new Date(plantingDate);
        daysSincePlanting = Math.floor((Date.now() - pDate.getTime()) / (1000 * 60 * 60 * 24));
    }

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
        <div className="neu-surface p-4 sm:p-6 lg:p-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(15, 184, 133, 0.15)' }}
                    >
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-primary)', fontSize: '20px' }}>eco</span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>Growth Stage</h3>
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            {cropType} · Day {daysSincePlanting}
                        </p>
                    </div>
                </div>

                {daysToHarvest && (
                    <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(15, 184, 133, 0.1)' }}>
                        <p className="text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-body)' }}>
                            <span className="material-symbols-outlined align-middle" style={{ fontSize: '13px' }}>agriculture</span> {daysToHarvest}d
                        </p>
                    </div>
                )}
            </div>

            {/* Current Stage Highlight */}
            {currentStageData && (
                <div className="rounded-[12px] sm:rounded-[16px] p-3 sm:p-4 mb-4 sm:mb-6" style={{ backgroundColor: 'rgba(232, 163, 101, 0.1)' }}>
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-[10px] sm:rounded-[12px] flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: 'var(--ee-sun)', color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.75rem' }}
                        >
                            {currentStageData.shortName}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm sm:text-base truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>{currentStageData.name}</p>
                            <p className="text-xs sm:text-sm line-clamp-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{currentStageData.description}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            <div className="relative mb-4 sm:mb-6">
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ee-bg)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                            width: `${progressPercent}%`,
                            background: 'linear-gradient(90deg, var(--ee-primary), var(--ee-sun))',
                        }}
                    />
                </div>
            </div>

            {/* Stage Timeline */}
            <div className="flex justify-between items-start overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {processedStages.map((stage, idx) => {
                    const isCompleted = stage.status === 'completed';
                    const isCurrent = stage.status === 'current';
                    const isLast = idx === processedStages.length - 1;

                    return (
                        <div key={stage.id} className="flex flex-col items-center min-w-[44px] sm:min-w-[60px] relative">
                            {/* Connector Line */}
                            {!isLast && (
                                <div
                                    className="absolute top-3 sm:top-4 left-1/2 w-full h-0.5 z-0"
                                    style={{ backgroundColor: isCompleted ? 'var(--ee-primary)' : 'var(--ee-bg-pressed)' }}
                                />
                            )}

                            {/* Stage Dot */}
                            <div
                                className={`relative z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${isCurrent ? 'animate-pulse' : ''}`}
                                style={{
                                    backgroundColor: isCompleted ? 'var(--ee-primary)' : isCurrent ? 'var(--ee-sun)' : 'var(--ee-bg-pressed)',
                                    boxShadow: isCurrent ? '0 0 0 3px rgba(232, 163, 101, 0.2)' : 'none',
                                    border: stage.status === 'upcoming' ? '2px solid var(--ee-bg-border)' : 'none',
                                }}
                            >
                                {isCompleted && (
                                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#fff' }}>check</span>
                                )}
                            </div>

                            {/* Label */}
                            <p className="text-[8px] sm:text-[10px] font-bold mt-1.5 sm:mt-2 text-center" style={{
                                color: isCompleted ? 'var(--ee-primary)' : isCurrent ? 'var(--ee-sun)' : 'var(--ee-muted)',
                                fontFamily: 'var(--font-body)',
                            }}>
                                {stage.shortName}
                            </p>
                            <p className="text-[7px] sm:text-[8px] text-center hidden sm:block" style={{
                                color: stage.status === 'upcoming' ? 'var(--ee-bg-border)' : 'var(--ee-muted)',
                                fontFamily: 'var(--font-body)',
                            }}>
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
