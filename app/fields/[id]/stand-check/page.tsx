'use client'

// Stand Check screen.
//
// Requires an active season with a recorded row spacing — the sample length is
// derived from it. Rather than 404ing when that isn't true, each missing
// precondition explains itself and points at the fix, because "nothing here"
// is the failure mode that makes farmers stop opening a feature.

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { PageContainer } from '@/components/layout/PageContainer'
import { StandCheckForm } from '@/components/planning/StandCheckForm'
import { useSeasons } from '@/hooks/useSeasons'
import { activeSeason, formatPopulation, formatSpacing } from '@/lib/planning-utils'

function Notice({
    title,
    children,
    cta,
}: {
    title: string
    children: React.ReactNode
    cta?: { href: string; label: string }
}) {
    return (
        <div
            className="neu-surface rounded-[20px] p-5 sm:p-6"
            style={{ background: 'var(--ee-surface)' }}
        >
            <h2
                className="text-base font-black mb-2"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                {title}
            </h2>
            <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                {children}
            </p>
            {cta && (
                <Link
                    href={cta.href}
                    className="inline-block text-sm font-bold py-2.5 px-4 rounded-[12px]"
                    style={{ background: 'var(--ee-primary)', color: '#fff', fontFamily: 'var(--font-body)' }}
                >
                    {cta.label}
                </Link>
            )}
        </div>
    )
}

export default function StandCheckPage() {
    const params = useParams()
    const fieldId = String(params?.id ?? '')
    const { seasons, isLoading, error } = useSeasons(fieldId)

    const season = activeSeason(seasons)
    const alreadyChecked = season?.established_population_per_ha != null

    return (
        <PageContainer variant="reading">
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
                Stand Check
            </h1>
            <p
                className="text-sm mb-6"
                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
            >
                Count what actually came up, while there is still time to do
                something about it.
            </p>

            {isLoading && (
                <div className="neu-surface rounded-[20px] p-6" style={{ background: 'var(--ee-surface)' }}>
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 w-40 rounded" style={{ background: 'var(--ee-bg)' }} />
                        <div className="h-20 rounded-[16px]" style={{ background: 'var(--ee-bg)' }} />
                    </div>
                </div>
            )}

            {error && (
                <Notice title="Couldn&apos;t load this field&apos;s seasons">{error.message}</Notice>
            )}

            {!isLoading && !error && !season && (
                <Notice
                    title="Nothing is growing here yet"
                    cta={{ href: `/fields/${fieldId}/plan-season`, label: 'Plan a season' }}
                >
                    A stand check counts the crop that came up, so it needs a season
                    that has actually been planted. Plan one and confirm planting, and
                    this unlocks about ten days after the crop emerges.
                </Notice>
            )}

            {!isLoading && season && !season.row_spacing_cm && (
                <Notice
                    title="We need your row spacing first"
                    cta={{ href: `/fields/${fieldId}/plan-season`, label: 'Set up the season' }}
                >
                    The length of row you measure depends on how far apart your rows
                    are, so we can&apos;t work out the sample without it.
                </Notice>
            )}

            {!isLoading && season && season.row_spacing_cm && (
                <div className="space-y-4">
                    {/* What we're checking against — the targets set pre-plant. */}
                    <div
                        className="rounded-[16px] p-4"
                        style={{ background: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)' }}
                    >
                        <p
                            className="text-[10px] font-bold uppercase mb-1"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                        >
                            Checking against your plan
                        </p>
                        <p
                            className="text-sm font-bold"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            {season.crop_type}
                            {season.variety ? ` · ${season.variety}` : ''} ·{' '}
                            {formatSpacing(season.row_spacing_cm, season.in_row_spacing_cm)}
                        </p>
                        {season.target_population_per_ha && (
                            <p
                                className="text-xs mt-0.5"
                                style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}
                            >
                                Target {formatPopulation(season.target_population_per_ha)} plants/ha
                            </p>
                        )}
                    </div>

                    {alreadyChecked && (
                        <p
                            className="text-sm leading-relaxed rounded-[16px] p-4"
                            style={{ background: '#eab30818', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                        >
                            You already recorded{' '}
                            <strong>
                                {formatPopulation(season.established_population_per_ha)} plants/ha
                            </strong>{' '}
                            for this season. Running the check again replaces that figure —
                            worth doing if the first count was early or from too few samples.
                        </p>
                    )}

                    <StandCheckForm fieldId={fieldId} season={season} />
                </div>
            )}
        </PageContainer>
    )
}
