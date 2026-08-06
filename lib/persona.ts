// Persona-aware presentation. Pure — unit-tested in tests/persona.test.ts.
//
// Onboarding has always asked whether someone is a commercial farmer, a
// smallholder, an agronomist or a hobbyist, written the answer to
// `profiles.persona`, and then used it for exactly one thing: a label in the
// sidebar. Everyone gets the same interface.
//
// They differ on nearly everything that matters to advice:
//
//   * **Measurement.** A smallholder paces a row. A commercial farmer has a
//     tape, a planter monitor and GPS.
//   * **Equipment.** "Calibrate your planter" is not a coherent instruction to
//     someone planting by hand — and "plant two seeds per station and thin at
//     V3" is not one you give a 400 ha operation.
//   * **Register.** An agronomist wants the stage code. A hobbyist wants
//     "when it's knee-high".
//
// This module holds the differences. It deliberately changes *how* things are
// said and which instructions apply — never the agronomy itself. A target plant
// population is the same number for everyone; only the way you hit it changes.

export type Persona = 'farmer' | 'smallholder' | 'agronomist' | 'hobbyist'

export interface PersonaProfile {
    key: Persona
    /** Mechanised: planter, spreader, boom. Changes which instructions apply. */
    usesEquipment: boolean
    /** Measures by walking rather than with a tape or GPS. */
    pacesRatherThanMeasures: boolean
    /** Wants growth-stage codes (V4, R1) rather than plain descriptions. */
    wantsStageCodes: boolean
    /** Thinks per-plot rather than per-hectare. */
    thinksInPlots: boolean
}

const PROFILES: Record<Persona, PersonaProfile> = {
    farmer: {
        key: 'farmer',
        usesEquipment: true,
        pacesRatherThanMeasures: false,
        wantsStageCodes: true,
        thinksInPlots: false,
    },
    smallholder: {
        key: 'smallholder',
        usesEquipment: false,
        pacesRatherThanMeasures: true,
        wantsStageCodes: false,
        thinksInPlots: true,
    },
    agronomist: {
        key: 'agronomist',
        usesEquipment: true,
        pacesRatherThanMeasures: false,
        wantsStageCodes: true,
        thinksInPlots: false,
    },
    hobbyist: {
        key: 'hobbyist',
        usesEquipment: false,
        pacesRatherThanMeasures: true,
        wantsStageCodes: false,
        thinksInPlots: true,
    },
}

/**
 * Unknown personas fall back to the **smallholder** profile, not the commercial
 * one. Getting it wrong in that direction gives someone paces and plain
 * language they didn't need; the other way tells a person with a hoe to
 * calibrate a planter they do not own, which is the failure that makes an app
 * feel like it was not built for you.
 */
export function personaProfile(persona: string | null | undefined): PersonaProfile {
    const key = (persona ?? '').trim().toLowerCase() as Persona
    return PROFILES[key] ?? PROFILES.smallholder
}

/**
 * Whether an instruction that assumes machinery should be shown at all.
 * Not a rewording — some advice simply does not apply.
 */
export function showsEquipmentAdvice(persona: string | null | undefined): boolean {
    return personaProfile(persona).usesEquipment
}

/**
 * A growth stage in the register the reader wants: `"V4-V6"` for an agronomist
 * or commercial grower, a plain description for everyone else.
 */
export function stageLabel(
    stageCode: string | null | undefined,
    plainDescription: string | null | undefined,
    persona: string | null | undefined
): string {
    const p = personaProfile(persona)
    if (p.wantsStageCodes && stageCode) return stageCode
    if (plainDescription) return plainDescription
    return stageCode ?? ''
}

/**
 * How to check spacing in the field.
 *
 * The agronomy is identical — the same plants in the same length of row. Only
 * the instrument changes: a smallholder paces it, a commercial grower measures
 * it, because they have a tape and want the number to be exact.
 */
export function spacingCheckInstruction(
    inRowSpacingCm: number | null | undefined,
    persona: string | null | undefined,
    paceMetres = 0.75
): string {
    if (!inRowSpacingCm || inRowSpacingCm <= 0) return ''
    const p = personaProfile(persona)

    if (p.pacesRatherThanMeasures) {
        const paces = 4
        const metres = paces * paceMetres
        const plants = Math.max(1, Math.round(metres / (inRowSpacingCm / 100)))
        return (
            `Walk ${paces} paces (about ${metres.toFixed(1)} m) along a row — ` +
            `you should count roughly ${plants} plants.`
        )
    }

    const metres = 10
    const plants = Math.max(1, Math.round(metres / (inRowSpacingCm / 100)))
    return (
        `Measure ${metres} m along a row — you should count ${plants} plants ` +
        `at ${Math.round(inRowSpacingCm)} cm spacing.`
    )
}

/**
 * Seed quantity phrased for the reader: a whole-plot figure for someone
 * thinking in plots, a rate for someone thinking in hectares.
 */
export function seedQuantityLabel(
    seedRateKgHa: number | null | undefined,
    seedRequiredKg: number | null | undefined,
    persona: string | null | undefined
): string {
    const p = personaProfile(persona)
    if (p.thinksInPlots && seedRequiredKg != null) {
        return `${Math.round(seedRequiredKg * 10) / 10} kg for this field`
    }
    if (seedRateKgHa != null) return `${Math.round(seedRateKgHa * 10) / 10} kg/ha`
    if (seedRequiredKg != null) return `${Math.round(seedRequiredKg * 10) / 10} kg`
    return '—'
}

/**
 * Establishment advice that only applies to one way of planting.
 *
 * Returned as a list so a surface can render none of it — for a smallholder
 * there is genuinely nothing here, and padding the screen with machinery advice
 * they cannot use is exactly what this module exists to stop.
 */
export function establishmentEquipmentTips(
    persona: string | null | undefined
): string[] {
    if (!showsEquipmentAdvice(persona)) return []
    return [
        'Calibrate the planter against the target seed rate before you start — ' +
            'a plate or belt one size out costs the whole field.',
        'Check singulation and seed depth after the first few rows, not at the ' +
            'end of the block.',
    ]
}

/**
 * Establishment advice for hand planting. The mirror of the above: real
 * instructions for someone with a hoe and a bucket, and nothing at all for a
 * mechanised grower.
 */
export function establishmentHandTips(persona: string | null | undefined): string[] {
    if (showsEquipmentAdvice(persona)) return []
    return [
        'Mark your row spacing with a string line or a marked stick so it stays ' +
            'even down the whole row.',
        'Plant to the same depth every station — seed placed deeper comes up ' +
            'later and gets shaded out by its neighbours.',
    ]
}
