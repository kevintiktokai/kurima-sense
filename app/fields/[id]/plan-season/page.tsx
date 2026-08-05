'use client'

// Pre-plant season planner.
//
// The product change this represents: until now the app had nothing to say
// until after planting, by which point crop, variety, spacing and basal
// fertiliser are all locked in. This screen moves the conversation to before
// the seed is bought, which is where the leverage actually is.
//
// Flow: what & when → conditions → the brief (rotation, spacing, fertiliser)
// → save as a planned season. Every input has a sane default, so a farmer who
// knows exactly what they're planting can reach the brief in two taps.

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import { PageContainer } from '@/components/layout/PageContainer'
import { RotationCard } from '@/components/planning/RotationCard'
import { EstablishmentCard } from '@/components/planning/EstablishmentCard'
import { FertiliserProgrammeCard } from '@/components/planning/FertiliserProgrammeCard'
import CropSearchSelect, { ALL_CROPS } from '@/components/dashboard/CropSearchSelect'
import { usePrePlantBrief, useSeasons, createPlannedSeason } from '@/hooks/useSeasons'
import { relativeDayLabel } from '@/lib/planning-utils'

const NATURAL_REGIONS = [
    { value: '', label: 'Not sure' },
    { value: 'I', label: 'I — Eastern Highlands (>1000 mm)' },
    { value: 'IIa', label: 'IIa — Intensive (750–1000 mm)' },
    { value: 'IIb', label: 'IIb — Intensive (750–1000 mm)' },
    { value: 'III', label: 'III — Semi-intensive (650–800 mm)' },
    { value: 'IV', label: 'IV — Semi-extensive (450–650 mm)' },
    { value: 'V', label: 'V — Extensive (<450 mm)' },
]

const SOIL_TEXTURES = [
    { value: '', label: 'Not sure' },
    { value: 'sand', label: 'Sandy' },
    { value: 'sandy loam', label: 'Sandy loam' },
    { value: 'loam', label: 'Loam' },
    { value: 'clay loam', label: 'Clay loam' },
    { value: 'clay', label: 'Clay' },
]

const TILLAGE = [
    { value: '', label: 'Not sure' },
    { value: 'conventional', label: 'Conventional (ploughed)' },
    { value: 'minimum', label: 'Minimum till' },
    { value: 'no_till', label: 'No till' },
]

const OUTLOOKS = [
    { value: '', label: 'Normal / unknown' },
    { value: 'below_normal', label: 'Drier than normal' },
    { value: 'above_normal', label: 'Wetter than normal' },
]

const inputStyle: React.CSSProperties = {
    background: 'var(--ee-bg)',
    color: 'var(--ee-text)',
    fontFamily: 'var(--font-body)',
    boxShadow: 'var(--shadow-neu-inset)',
    border: 'none',
}

function Label({ children }: { children: React.ReactNode }) {
    return (
        <label
            className="block text-xs font-bold uppercase mb-1.5"
            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
        >
            {children}
        </label>
    )
}

export default function PlanSeasonPage() {
    const params = useParams()
    const router = useRouter()
    const fieldId = String(params?.id ?? '')

    const [step, setStep] = useState(1)
    const [crop, setCrop] = useState('Maize')
    const [variety, setVariety] = useState('')
    const [plantingDate, setPlantingDate] = useState('')
    const [naturalRegion, setNaturalRegion] = useState('')
    const [irrigated, setIrrigated] = useState(false)
    const [rainfallOutlook, setRainfallOutlook] = useState('')
    const [soilTexture, setSoilTexture] = useState('')
    const [soilPh, setSoilPh] = useState('')
    const [tillage, setTillage] = useState('')
    const [previousCrop, setPreviousCrop] = useState('')

    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const { seasons } = useSeasons(fieldId)

    // Only fetch the brief once the farmer reaches the review step — the inputs
    // are still changing before that, and every keystroke would refetch.
    const briefParams = useMemo(
        () => ({
            crop: step >= 3 ? crop : null,
            plantingDate: plantingDate || undefined,
            naturalRegion: naturalRegion || undefined,
            irrigated,
            rainfallOutlook: rainfallOutlook || undefined,
            soilPh: soilPh ? Number(soilPh) : undefined,
            soilTexture: soilTexture || undefined,
            tillagePractice: tillage || undefined,
        }),
        [step, crop, plantingDate, naturalRegion, irrigated, rainfallOutlook, soilPh, soilTexture, tillage]
    )
    const { brief, isLoading, error } = usePrePlantBrief(fieldId, briefParams)

    const alreadyActive = seasons.some((s) => s.status === 'active')

    const save = async () => {
        setSaving(true)
        setSaveError(null)
        try {
            const est = brief?.establishment
            await createPlannedSeason(fieldId, {
                crop_type: crop,
                variety: variety || undefined,
                planned_planting_date: plantingDate || undefined,
                previous_crop: previousCrop || undefined,
                tillage_practice: tillage || undefined,
                // Persist the targets so the Stand Check has something to
                // verify against after emergence.
                row_spacing_cm: est?.row_spacing_cm,
                in_row_spacing_cm: est?.in_row_spacing_cm,
                target_population_per_ha: est?.target_population_per_ha,
                seed_rate_kg_ha: est?.seed_rate_kg_ha,
                planting_depth_cm: est?.planting_depth_cm?.min,
            })
            router.push(`/fields/${fieldId}`)
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Could not save the plan')
            setSaving(false)
        }
    }

    return (
        <PageContainer variant="wide">
            <div className="mb-5">
                <Link
                    href={`/fields/${fieldId}`}
                    className="text-sm font-bold inline-flex items-center gap-1"
                    style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                        arrow_back
                    </span>
                    Back to field
                </Link>
            </div>

            <h1
                className="text-2xl sm:text-3xl font-black mb-1 tracking-tight"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                Plan a season
            </h1>
            <p
                className="text-sm mb-6"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                Decide crop, spacing and fertiliser before the seed is bought — while
                every one of them can still be changed.
            </p>

            {/* Progress */}
            <div className="flex gap-2 mb-6" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
                {[1, 2, 3].map((n) => (
                    <div
                        key={n}
                        className="h-1.5 flex-1 rounded-full transition-colors"
                        style={{ background: n <= step ? 'var(--ee-primary)' : 'var(--ee-bg)' }}
                    />
                ))}
            </div>

            {/* Step 1 — what & when */}
            {step === 1 && (
                <div
                    className="neu-surface rounded-[20px] p-5 sm:p-6 space-y-4"
                    style={{ background: 'var(--ee-surface)' }}
                >
                    <h2
                        className="text-lg font-black"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        What are you planting?
                    </h2>

                    <div>
                        <Label>Crop</Label>
                        <CropSearchSelect value={crop} onChange={setCrop} />
                    </div>

                    <div>
                        <Label>Variety <span className="lowercase font-normal">(optional)</span></Label>
                        <input
                            type="text"
                            className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                            style={inputStyle}
                            placeholder="e.g. SC727"
                            value={variety}
                            onChange={(e) => setVariety(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>When do you plan to plant?</Label>
                        <input
                            type="date"
                            className="w-full rounded-[16px] p-3 font-bold focus:outline-none"
                            style={inputStyle}
                            value={plantingDate}
                            onChange={(e) => setPlantingDate(e.target.value)}
                        />
                        {plantingDate && (
                            <p
                                className="text-xs mt-1.5"
                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                            >
                                {relativeDayLabel(plantingDate)}
                            </p>
                        )}
                    </div>

                    <div>
                        <Label>What grew here last season?</Label>
                        <select
                            className="w-full rounded-[16px] p-3 font-bold focus:outline-none"
                            style={inputStyle}
                            value={previousCrop}
                            onChange={(e) => setPreviousCrop(e.target.value)}
                        >
                            <option value="">Not sure / nothing</option>
                            {ALL_CROPS.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}{c.aka ? ` (${c.aka})` : ''}
                                </option>
                            ))}
                        </select>
                        <p
                            className="text-xs mt-1.5 leading-relaxed"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            This drives disease carry-over risk — some pathogens survive in
                            last season&apos;s residue.
                        </p>
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        className="w-full py-3.5 rounded-[16px] font-bold"
                        style={{ background: 'var(--ee-primary)', color: '#fff', fontFamily: 'var(--font-body)' }}
                    >
                        Continue
                    </button>
                </div>
            )}

            {/* Step 2 — conditions */}
            {step === 2 && (
                <div
                    className="neu-surface rounded-[20px] p-5 sm:p-6 space-y-4"
                    style={{ background: 'var(--ee-surface)' }}
                >
                    <h2
                        className="text-lg font-black"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        Conditions in this field
                    </h2>
                    <p
                        className="text-sm"
                        style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                    >
                        All optional — every one you answer makes the plan more specific
                        to this field rather than a regional average.
                    </p>

                    <div>
                        <Label>Natural region</Label>
                        <select
                            className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                            style={inputStyle}
                            value={naturalRegion}
                            onChange={(e) => setNaturalRegion(e.target.value)}
                        >
                            {NATURAL_REGIONS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    <label
                        className="flex items-center gap-3 rounded-[16px] p-3.5 cursor-pointer"
                        style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
                    >
                        <input
                            type="checkbox"
                            checked={irrigated}
                            onChange={(e) => setIrrigated(e.target.checked)}
                            className="w-5 h-5"
                        />
                        <span
                            className="text-sm font-bold"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            This field is irrigated
                        </span>
                    </label>

                    <div>
                        <Label>Rainfall outlook</Label>
                        <select
                            className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                            style={inputStyle}
                            value={rainfallOutlook}
                            onChange={(e) => setRainfallOutlook(e.target.value)}
                        >
                            {OUTLOOKS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Soil texture</Label>
                            <select
                                className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                                style={inputStyle}
                                value={soilTexture}
                                onChange={(e) => setSoilTexture(e.target.value)}
                            >
                                {SOIL_TEXTURES.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Soil pH</Label>
                            <input
                                type="number"
                                step="0.1"
                                min="3"
                                max="10"
                                className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                                style={inputStyle}
                                placeholder="e.g. 5.4"
                                value={soilPh}
                                onChange={(e) => setSoilPh(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Tillage</Label>
                        <select
                            className="w-full rounded-[16px] p-3 font-bold text-sm focus:outline-none"
                            style={inputStyle}
                            value={tillage}
                            onChange={(e) => setTillage(e.target.value)}
                        >
                            {TILLAGE.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3.5 rounded-[16px] font-bold"
                            style={{
                                background: 'var(--ee-bg)',
                                color: 'var(--ee-muted)',
                                fontFamily: 'var(--font-body)',
                                boxShadow: 'var(--shadow-neu)',
                            }}
                        >
                            Back
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            className="flex-[2] py-3.5 rounded-[16px] font-bold"
                            style={{ background: 'var(--ee-primary)', color: '#fff', fontFamily: 'var(--font-body)' }}
                        >
                            See the plan
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3 — the brief */}
            {step === 3 && (
                <div className="space-y-4">
                    {error && (
                        <div
                            className="rounded-[16px] p-4 text-sm"
                            style={{ background: '#dc262618', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            {error.message}
                        </div>
                    )}

                    <RotationCard rotation={brief?.rotation} loading={isLoading} />
                    <EstablishmentCard
                        plan={brief?.establishment ?? null}
                        crop={crop}
                        loading={isLoading}
                    />
                    <FertiliserProgrammeCard
                        programme={brief?.fertiliser ?? null}
                        loading={isLoading}
                    />

                    {alreadyActive && (
                        <p
                            className="text-sm leading-relaxed rounded-[16px] p-4"
                            style={{ background: '#eab30818', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            This field already has a season growing. Saving this plan is
                            fine — it stays as a plan until you confirm planting, and only
                            one season can be growing at a time.
                        </p>
                    )}

                    {saveError && (
                        <p
                            className="text-sm rounded-[16px] p-4"
                            style={{ background: '#dc262618', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            {saveError}
                        </p>
                    )}

                    <div className="flex gap-3 pb-6">
                        <button
                            onClick={() => setStep(2)}
                            disabled={saving}
                            className="flex-1 py-3.5 rounded-[16px] font-bold disabled:opacity-60"
                            style={{
                                background: 'var(--ee-bg)',
                                color: 'var(--ee-muted)',
                                fontFamily: 'var(--font-body)',
                                boxShadow: 'var(--shadow-neu)',
                            }}
                        >
                            Back
                        </button>
                        <button
                            onClick={save}
                            disabled={saving || isLoading}
                            className="flex-[2] py-3.5 rounded-[16px] font-bold disabled:opacity-60"
                            style={{ background: 'var(--ee-primary)', color: '#fff', fontFamily: 'var(--font-body)' }}
                        >
                            {saving ? 'Saving…' : 'Save this plan'}
                        </button>
                    </div>
                </div>
            )}
        </PageContainer>
    )
}
