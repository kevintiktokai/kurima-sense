'use client'

// A prompt on the field page while the Stand Check window is open.
//
// This is the first "closing window" surface in the product, and it behaves
// differently from an ordinary task on purpose. Establishment can only be
// measured for a couple of weeks after emergence — miss it and the season's
// ceiling is unknown for good, which also leaves the KurimaScore unable to tell
// a thin stand from a stressed one. So the prompt states the deadline in days
// and disappears once the window has closed rather than nagging forever, which
// is what turns a to-do list into noise.

import React from 'react'
import Link from 'next/link'
import { useSeasons } from '@/hooks/useSeasons'
import { activeSeason, formatPopulation } from '@/lib/planning-utils'
import { standCheckWindow } from '@/lib/stand-check-window'

interface Props {
    fieldId: string
}

export function StandCheckPrompt({ fieldId }: Props) {
    const { seasons } = useSeasons(fieldId)
    const season = activeSeason(seasons)
    const { show, daysLeft, urgent } = standCheckWindow(season)

    if (!show || !season || daysLeft === null) return null

    return (
        <Link
            href={`/fields/${fieldId}/stand-check`}
            className="lg:col-span-12 block neu-surface rounded-[20px] p-5 transition-all hover:opacity-95"
            style={{
                background: urgent ? '#ea580c' : 'var(--ee-surface)',
                color: urgent ? '#fff' : 'var(--ee-text)',
            }}
        >
            <div className="flex items-start gap-3">
                <span
                    className="material-symbols-outlined shrink-0"
                    style={{
                        fontSize: '1.5rem',
                        color: urgent ? '#fff' : 'var(--ee-primary)',
                    }}
                >
                    straighten
                </span>
                <div className="min-w-0 flex-1">
                    <p
                        className="text-sm sm:text-base font-black leading-tight"
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        Run the Stand Check{' '}
                        {daysLeft <= 14 && (
                            <span className="whitespace-nowrap">
                                · {daysLeft} day{daysLeft === 1 ? '' : 's'} left
                            </span>
                        )}
                    </p>
                    <p
                        className="text-sm leading-relaxed mt-1"
                        style={{
                            fontFamily: 'var(--font-body)',
                            color: urgent ? 'rgba(255,255,255,0.9)' : 'var(--ee-muted)',
                        }}
                    >
                        One minute counting plants tells you whether this crop can still
                        reach{' '}
                        {season.target_population_per_ha
                            ? `${formatPopulation(season.target_population_per_ha)} plants/ha`
                            : 'your target'}
                        . After this window it can&apos;t be measured at all.
                    </p>
                </div>
                <span
                    className="material-symbols-outlined shrink-0"
                    style={{ fontSize: '1.25rem', opacity: 0.6 }}
                >
                    chevron_right
                </span>
            </div>
        </Link>
    )
}

export default StandCheckPrompt
