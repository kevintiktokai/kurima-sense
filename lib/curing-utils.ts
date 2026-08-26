// Presentation helpers for the flue-curing plan. Pure — no React, no fetch.
//
// Same reason as lib/planning-utils and lib/action-window-utils: a helper shared
// by two surfaces so the number on one always matches the number on the other.
// The backend computes the agronomy (services/planning/curing.py); this file
// only decides how it reads.
//
// Nothing here invents a value. Where the backend declines — a barn with no
// published fuel figure, a field with no area — these return null and the card
// renders nothing rather than rendering empty.

import type { CuringBarnOption, CuringPlan, CuringStage } from './planning-types'

/**
 * A (low, high) pair as "30–40", and as "40" when both ends agree.
 *
 * En dash, not a hyphen: these are ranges, and "30-40" reads as a subtraction
 * or a part number at small sizes on a phone.
 */
export function formatRange([low, high]: [number, number]): string {
    return low === high ? `${low}` : `${low}–${high}`
}

/**
 * The line a farmer at the barn door is actually looking for.
 *
 * Humidity appears only where the source states one — which is colouring, and
 * only colouring. Printing "humidity: —" for the other two stages would imply
 * the figure exists and is unknown, rather than that the stage is not run to a
 * humidity target.
 */
export function stageSummary(stage: CuringStage): string {
    const parts = [
        `${formatRange(stage.temperature_c)} °C`,
        `${formatRange(stage.duration_days)} days`,
    ]
    if (stage.relative_humidity_pct !== null) {
        parts.push(`~${stage.relative_humidity_pct}% humidity`)
    }
    return parts.join(' · ')
}

/** "1 × Plastic barn" / "4 × Rocket barn". */
export function barnLabel(option: CuringBarnOption): string {
    return `${option.count} × ${option.name}`
}

/**
 * Fuel to cure this much leaf, in kg.
 *
 * Mirrors `fuel_required_kg` in services/planning/curing.py deliberately, and
 * declines in exactly the same places: no published efficiency for the barn, or
 * no sensible quantity of leaf. This is the number a grower budgets wood or
 * coal against, and a plausible invented one is worse than a gap.
 */
export function fuelBudgetKg(
    option: CuringBarnOption,
    curedLeafKg: number | null | undefined
): number | null {
    if (option.fuel_kg_per_kg_cured === null) return null
    if (curedLeafKg === null || curedLeafKg === undefined) return null
    if (!Number.isFinite(curedLeafKg) || curedLeafKg <= 0) return null
    return option.fuel_kg_per_kg_cured * curedLeafKg
}

/**
 * Whether there is enough here to be worth a card.
 *
 * `null` is the backend saying curing does not apply to this crop — every crop
 * that is not flue-cured, and burley, which is tobacco and is air-cured. That is
 * an answer, not a failure, and the card's response to it is silence.
 */
export function isRenderable(plan: CuringPlan | null | undefined): plan is CuringPlan {
    return Boolean(plan && plan.stages.length > 0)
}
