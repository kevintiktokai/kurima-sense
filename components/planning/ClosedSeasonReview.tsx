'use client'

// Picks the most recently closed season on a field and shows its review.
//
// Split from RetrospectiveCard so that card stays a pure function of a season
// id — the portfolio and season-history surfaces will both want to point it at
// a specific season rather than "whatever closed last".

import React from 'react'

import { useSeasons } from '@/hooks/useSeasons'
import { RetrospectiveCard } from './RetrospectiveCard'

interface Props {
    fieldId: string
}

export function ClosedSeasonReview({ fieldId }: Props) {
    const { seasons } = useSeasons(fieldId)

    // Seasons come back newest first, so the first closed one is the latest.
    const closed = seasons.find((s) => s.status === 'closed')
    if (!closed) return null

    return <RetrospectiveCard seasonId={closed.id} />
}

export default ClosedSeasonReview
