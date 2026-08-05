// Types for the season lifecycle and pre-plant planning API.
// Mirrors the backend shapes in season_lifecycle_routes.py — keep in step.

export type SeasonStatus = 'planned' | 'active' | 'harvested' | 'closed' | 'abandoned'

export interface Season {
    id: string
    field_id: string
    status: SeasonStatus
    season_label: string | null
    crop_type: string
    variety: string | null

    planned_planting_date: string | null
    planting_date: string | null
    transplant_date: string | null
    expected_harvest_date: string | null
    harvest_date: string | null

    row_spacing_cm: number | null
    in_row_spacing_cm: number | null
    target_population_per_ha: number | null
    seed_rate_kg_ha: number | null
    planting_depth_cm: number | null
    emergence_date: string | null
    established_population_per_ha: number | null
    emergence_uniformity: 'uniform' | 'moderate' | 'poor' | null

    previous_crop: string | null
    tillage_practice: string | null
    residue_management: string | null

    yield_tonnes_per_ha: number | null
    notes: string | null
    created_at: string | null
    updated_at: string | null
}

export type RotationRisk = 'unknown' | 'low' | 'moderate' | 'high'

export interface RotationHistoryEntry {
    season_id: string | null
    crop_type: string | null
    family: string | null
    variety: string | null
    season_label: string | null
    planting_date: string | null
    yield_tonnes_per_ha: number | null
    status: SeasonStatus | null
}

export interface RotationSummary {
    seasons_recorded: number
    history: RotationHistoryEntry[]
    current_crop: string | null
    consecutive_same_crop: number
    consecutive_same_family: number
    years_since: Record<string, number>
    rotation_risk: RotationRisk
    risk_reasons: string[]
    last_n_fixing_crop: string | null
}

export interface EstablishmentPlan {
    crop: string
    target_population_per_ha: number
    potential_band: string
    row_spacing_cm: number
    in_row_spacing_cm: number
    planting_depth_cm: { min: number; max: number }
    seeds_per_station: number
    thin_at_stage: string | null
    seed_rate_kg_ha: number
    seed_required_kg: number | null
    field_check: string
    stand_check_row_length_m: number
    rationale: string[]
    warnings: string[]
}

export interface FertiliserStep {
    key: string
    label: string
    product: string
    rate_text: string
    rate_low: number | null
    rate_high: number | null
    rate_unit: string | null
    amount_low: number | null
    amount_high: number | null
    timing_text: string
    days_after_planting: number | null
    scheduled_date: string | null
    stage_code: string | null
    application: string | null
    why: string
    optional: boolean
    conditional_on: string | null
}

export interface FertiliserProgramme {
    crop: string
    area_hectares: number | null
    planting_date: string | null
    steps: FertiliserStep[]
    adjustments: string[]
    warnings: string[]
    notes: string
}

export interface PrePlantBrief {
    field_id: string
    crop: string
    area_hectares: number | null
    planting_date: string | null
    rotation: RotationSummary
    establishment: EstablishmentPlan | null
    fertiliser: FertiliserProgramme | null
    unsupported_crop: boolean
}

export interface StandCheckInstructions {
    season_id: string
    row_spacing_cm: number
    row_length_m: number
    target_population_per_ha: number | null
    expected_count: number | null
    instructions: string
}

export type StandVerdict = 'good' | 'acceptable' | 'thin' | 'severely_thin'

export interface StandAssessment {
    established_population_per_ha: number
    target_population_per_ha: number
    achieved_pct: number
    verdict: StandVerdict
    yield_ceiling_factor: number
    recommendation: string
    rationale: string[]
}

// --- Season history ---------------------------------------------------------

export interface HistoryPoint {
    date: string
    days_after_planting: number
    ndvi: number | null
    evi: number | null
}

export interface SeasonHistory {
    season_id: string
    season_label: string | null
    crop_type: string | null
    variety: string | null
    status: SeasonStatus | null
    planting_date: string | null
    points: HistoryPoint[]
    peak_ndvi: number | null
    days_to_peak: number | null
    mean_ndvi: number | null
    observation_count: number
    peak_is_confident: boolean
    target_population_per_ha: number | null
    established_population_per_ha: number | null
    yield_tonnes_per_ha: number | null
}

export type FieldTrend = 'unknown' | 'improving' | 'stable' | 'declining'

export interface FieldHistory {
    field_id: string
    seasons: SeasonHistory[]
    comparisons: string[]
    trend: FieldTrend
}
