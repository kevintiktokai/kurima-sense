// Pure helpers for turning a spoken phrase into structured capture fields.
// No browser APIs here — unit tested. The Web Speech wrapper lives in speech.ts.

const NUMBER_WORDS: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
    nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
}

/** Convert a small spoken number ("fifty", "twenty five", "two hundred") to a
 *  digit. Handles 0–9999 in the common phrasings; returns null if not parseable. */
export function wordsToNumber(text: string): number | null {
    const tokens = text.toLowerCase().replace(/-/g, ' ').split(/\s+/).filter(Boolean)
    let total = 0
    let current = 0
    let matched = false
    for (const tok of tokens) {
        const val = NUMBER_WORDS[tok]
        if (val == null) {
            if (tok === 'and' && matched) continue
            continue
        }
        matched = true
        if (val === 100) {
            current = (current || 1) * 100
        } else if (val === 1000) {
            total += (current || 1) * 1000
            current = 0
        } else {
            current += val
        }
    }
    if (!matched) return null
    return total + current
}

const UNIT_ALIASES: Record<string, string> = {
    kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
    g: 'g', gram: 'g', grams: 'g',
    t: 't', ton: 't', tons: 't', tonne: 't', tonnes: 't',
    l: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L',
    ml: 'ml', millilitre: 'ml', millilitres: 'ml',
    bag: 'bags', bags: 'bags',
    ha: 'ha', hectare: 'ha', hectares: 'ha',
}

export function normalizeUnit(raw: string | null | undefined): string | null {
    if (!raw) return null
    return UNIT_ALIASES[raw.toLowerCase()] ?? null
}

export interface ParsedQuantity {
    quantity: number | null
    unit: string | null
}

/**
 * Pull a quantity + unit out of a spoken phrase, e.g.
 *   "applied fifty kg of compound D" -> { quantity: 50, unit: 'kg' }
 *   "2.5 litres" -> { quantity: 2.5, unit: 'L' }
 * Digit numbers win; falls back to spoken number words.
 */
export function extractQuantity(text: string): ParsedQuantity {
    const lower = text.toLowerCase()
    const unitPattern = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length).join('|')

    // 1) digit number optionally followed by a unit: "50 kg", "2.5l", "100kgs"
    const digit = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})?\\b`, 'i').exec(lower)
    if (digit) {
        return { quantity: parseFloat(digit[1]), unit: normalizeUnit(digit[2]) }
    }

    // 2) spoken-number words followed by a unit: "fifty kilograms"
    const wordUnit = new RegExp(`([a-z\\s-]+?)\\s*(${unitPattern})\\b`, 'i').exec(lower)
    if (wordUnit) {
        const qty = wordsToNumber(wordUnit[1])
        if (qty != null) return { quantity: qty, unit: normalizeUnit(wordUnit[2]) }
    }

    // 3) a bare spoken number, no unit
    const bare = wordsToNumber(lower)
    return { quantity: bare, unit: null }
}
