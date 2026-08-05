// When the Stand Check prompt should appear, and how long is left.
//
// Split out of the component so the window logic is testable — it decides
// whether a farmer is asked to do something, and getting it wrong in either
// direction is costly. Too eager and we ask them to count a crop that hasn't
// emerged; too late and the measurement is worthless, because establishment
// can only be assessed for a couple of weeks after emergence.

import { daysUntil } from './planning-utils'
import type { Season } from './planning-types'

// Emergence is roughly a week after planting for most field crops, and the
// gap-filling decision is dead about three weeks after planting. Both are
// deliberate approximations — the farmer confirms the real emergence date in
// the form itself; these only decide whether to *show* the prompt.
export const DAYS_TO_EMERGENCE = 7
export const CHECK_WINDOW_DAYS = 21

export interface StandCheckWindow {
    /** Whether to render the prompt at all. */
    show: boolean
    /** Days remaining in the window; null when not applicable. */
    daysLeft: number | null
    /** Within a week of closing — escalate the styling. */
    urgent: boolean
    /** Why it isn't shown, for debugging and tests. */
    reason:
        | 'open'
        | 'no-season'
        | 'no-planting-date'
        | 'no-row-spacing'
        | 'already-checked'
        | 'too-early'
        | 'window-closed'
}

const hidden = (reason: StandCheckWindow['reason']): StandCheckWindow => ({
    show: false,
    daysLeft: null,
    urgent: false,
    reason,
})

export function standCheckWindow(
    season: Season | null | undefined,
    today?: Date
): StandCheckWindow {
    if (!season) return hidden('no-season')
    if (!season.planting_date) return hidden('no-planting-date')
    // The sample row length is derived from row spacing; without it the check
    // cannot be set up, so prompting for it would dead-end.
    if (!season.row_spacing_cm) return hidden('no-row-spacing')
    if (season.established_population_per_ha != null) return hidden('already-checked')

    const sincePlanting = -(daysUntil(season.planting_date, today) ?? 0)
    if (sincePlanting < DAYS_TO_EMERGENCE) return hidden('too-early')

    const daysLeft = DAYS_TO_EMERGENCE + CHECK_WINDOW_DAYS - sincePlanting
    // Once the window closes the prompt stops asking. A permanent badge for
    // something no longer worth doing trains farmers to ignore the surface.
    if (daysLeft <= 0) return hidden('window-closed')

    return { show: true, daysLeft, urgent: daysLeft <= 7, reason: 'open' }
}
