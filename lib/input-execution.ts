// Which inputs are worth asking execution questions about, and what to offer.
// Pure — unit-tested in tests/input-execution.test.ts.
//
// The whole design constraint here is data-entry burden. The research is
// explicit that heavy forms drive farmers off a product, so the extra questions
// appear **only for nitrogen**, where how it went on genuinely changes the
// outcome. Asking a farmer logging glyphosate whether they incorporated it is
// noise, and noise is what teaches people to stop filling forms in.
//
// Mirrors services/planning/execution.py on the backend. Kept deliberately
// simple and matched by tests on both sides rather than shared over the wire:
// the form has to decide what to show before anything is submitted.

export type ApplicationMethod = 'broadcast' | 'banded' | 'incorporated' | 'fertigation'

export interface MethodOption {
    value: ApplicationMethod
    label: string
    hint: string
}

/**
 * Nitrogen products, where placement and rain timing decide how much of the
 * bag ever reaches the crop.
 *
 * `AN` and `CAN` are matched as whole words — as substrings they fire on
 * "manure" and "planting", which would put fertiliser questions in front of
 * farmers logging neither.
 */
const NITROGEN_WORDS = ['an', 'can', 'uan']
const NITROGEN_PHRASES = ['urea', 'ammonium nitrate', 'nitrogen', 'top dress', 'topdress']

// Basal compounds go on at planting and are not top-dressing. Matching them
// would ask about incorporation for a product placed with the seed.
const BASAL_PHRASES = ['compound', 'basal', 'dap', 'map', 'npk']

export function looksLikeNitrogen(inputType: string | null | undefined): boolean {
    if (!inputType) return false
    const text = inputType.trim().toLowerCase()
    if (!text) return false
    if (BASAL_PHRASES.some((p) => text.includes(p))) return false
    if (NITROGEN_PHRASES.some((p) => text.includes(p))) return true
    const tokens = text.replace(/-/g, ' ').split(/\s+/).map((t) => t.replace(/^[.,]+|[.,]+$/g, ''))
    return NITROGEN_WORDS.some((w) => tokens.includes(w))
}

/** Urea specifically — the form that volatilises off a dry surface. */
export function looksLikeUrea(inputType: string | null | undefined): boolean {
    return Boolean(inputType && inputType.trim().toLowerCase().includes('urea'))
}

export const METHOD_OPTIONS: MethodOption[] = [
    {
        value: 'broadcast',
        label: 'Spread on top',
        hint: 'Scattered over the surface',
    },
    {
        value: 'banded',
        label: 'In a band',
        hint: 'Placed in a line beside the row',
    },
    {
        value: 'incorporated',
        label: 'Worked in',
        hint: 'Covered with soil after applying',
    },
    {
        value: 'fertigation',
        label: 'Through irrigation',
        hint: 'Applied in the water',
    },
]

/**
 * A warning shown at entry time, while the farmer can still act on it.
 *
 * Surface urea is the one combination worth flagging in the moment: covering it
 * or timing it to rain is a decision they can still make today. Everything else
 * is better said in the season review, once the outcome is known — a form that
 * lectures on every selection stops being filled in.
 */
export function methodWarning(
    inputType: string | null | undefined,
    method: ApplicationMethod | null | undefined
): string | null {
    if (!looksLikeUrea(inputType)) return null
    if (method !== 'broadcast') return null
    return (
        'Urea left on the surface loses nitrogen to the air. Cover it, or put it ' +
        'on just before rain, and much more of the bag reaches the crop.'
    )
}
