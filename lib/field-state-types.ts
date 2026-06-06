// Field State Aggregator — canonical response types.
// Mirrors services/field_state/models.py in the backend. Every consumer screen
// reads this single shape, so two screens can never disagree about a field.

export interface FSConfidence {
    band: 'low' | 'medium' | 'high'
    pct: number // integer 0-100, NEVER fractional
}

export interface FieldInfo {
    id: string
    name: string
    crop_type?: string | null
    variety_code?: string | null
    area_ha?: number | null
    natural_region?: string | null
    polygon_coordinates?: Array<{ lat: number; lon: number }> | null
    tenant_id?: string | null
}

export interface SeasonInfo {
    planted_date?: string | null
    days_since_planted?: number | null
    expected_harvest_date?: string | null
    days_to_harvest?: number | null
    current_stage?: string | null
    season_progress_pct?: number | null
    season_phase?: string | null
}

export interface KurimaScoreComponents {
    satellite?: number | null
    management?: number | null
    environmental?: number | null
}

export interface KurimaScore {
    score: number // 0-100
    label: string
    color: string // hex
    components: KurimaScoreComponents
    primary_driver?: string | null
    likely_cause?: string | null
    recommended_action?: string | null
    yield_implication?: string | null
    confidence_band: 'low' | 'medium' | 'high'
    confidence_pct: number
}

export interface CurrentIndices {
    as_of_date?: string | null
    ndvi?: number | null // dimensionless -1..1
    evi?: number | null
    ndre?: number | null
    ndmi?: number | null
    savi?: number | null
    sar_vv_db?: number | null
    observation_quality: 'good' | 'fair' | 'stale' | 'none'
    cloud_pct?: number | null
    ndvi_label?: string | null
    ndvi_color?: string | null
    ndvi_expected_low?: number | null
    ndvi_expected_high?: number | null
}

export interface TrendPoint {
    date: string
    ndvi?: number | null
    kurima_score?: number | null // 0-100
}

export interface Indices {
    current: CurrentIndices
    trend_30d: TrendPoint[]
}

export interface YieldProjection {
    projected_tonnes_per_ha?: number | null
    potential_tonnes_per_ha?: number | null
    yield_gap_pct?: number | null
    confidence_band: 'low' | 'medium' | 'high'
    confidence_pct: number
    confidence_factors: { positive: string[]; negative: string[] }
    confidence_interval_low?: number | null
    confidence_interval_high?: number | null
    unit: string
}

export interface Weather {
    current: {
        temperature_c?: number | null
        humidity_pct?: number | null
        wind_kmh?: number | null
        uv_index?: number | null
        condition?: string | null
        as_of?: string | null
    }
    today: { high?: number | null; low?: number | null; icon?: string | null }
    next_5_days: Array<{ day: string; high?: number | null; low?: number | null; icon?: string | null }>
}

export interface WaterBalance {
    weekly_rainfall_mm?: number | null
    weekly_et_mm?: number | null
    balance_mm?: number | null
    balance_status?: 'surplus' | 'balanced' | 'deficit' | null
    soil_moisture_pct?: number | null
    soil_moisture_label?: string | null
    irrigation_recommended: boolean
    urgency?: 'none' | 'low' | 'medium' | 'high' | null
}

export interface GrowingDegreeDays {
    accumulated_gdd?: number | null
    remaining_gdd?: number | null
    progress_to_maturity_pct?: number | null
    estimated_maturity_days?: number | null
    current_phase?: string | null
}

export interface PlanItem {
    id: string
    date?: string | null
    category?: string | null
    title: string
    description?: string | null
    status: string
    ai_recommended: boolean
    contextualized_to_current_conditions: boolean
    notes?: string | null
}

export interface Alert {
    severity: 'low' | 'medium' | 'high'
    category?: string | null
    headline: string
    detail?: string | null
    first_detected?: string | null
    recommended_action?: string | null
}

export interface ScoutingObservation {
    id: string
    date?: string | null
    type?: string | null
    notes?: string | null
}

export interface DataCompleteness {
    has_variety_in_database: boolean
    has_recent_satellite_pass: boolean
    has_input_records: boolean
    has_planting_date: boolean
    has_field_polygon: boolean
    overall_completeness_pct: number
    missing_for_full_confidence: string[]
}

export interface Meta {
    generated_at: string
    computation_time_ms: number
    stale_data_warnings: string[]
    as_of_satellite_pass?: string | null
    next_satellite_pass_estimate?: string | null
}

export interface FieldState {
    field: FieldInfo
    season: SeasonInfo
    kurima_score: KurimaScore
    indices: Indices
    yield_projection: YieldProjection
    weather: Weather
    water_balance: WaterBalance
    growing_degree_days: GrowingDegreeDays
    active_plan_items: PlanItem[]
    alerts: Alert[]
    scouting_observations: ScoutingObservation[]
    data_completeness: DataCompleteness
    meta: Meta
}

// Confidence is ALWAYS shown as a band, with the integer pct as secondary detail.
// This helper is the single place confidence becomes display text — it can never
// produce "0.6%".
// KurimaScore band → (label, hex colour). Mirrors classifiers.SCORE_BANDS on the
// backend so any client computing an aggregate score (e.g. AVG KurimaScore) uses
// the exact same vocabulary as a single field's detail page.
export function scoreToLabel(score: number): { label: string; color: string } {
    const s = Math.max(0, Math.min(100, Math.round(score)))
    if (s >= 85) return { label: 'Thriving', color: '#2E7D32' }
    if (s >= 70) return { label: 'Strong', color: '#66BB6A' }
    if (s >= 55) return { label: 'Adequate', color: '#FBC02D' }
    if (s >= 40) return { label: 'Stressed', color: '#F57C00' }
    if (s >= 25) return { label: 'Distressed', color: '#D84315' }
    return { label: 'Critical', color: '#B71C1C' }
}

// Convert a legacy 0-1 confidence fraction into a (band, integer pct) pair —
// the client-side mirror of classifiers.confidence_from_fraction. Use this
// anywhere a raw fraction would otherwise be rendered as "0.6%".
export function confidenceFromFraction(score?: number | null): { band: 'low' | 'medium' | 'high'; pct: number } {
    if (score === null || score === undefined) return { band: 'medium', pct: 50 }
    let v = Number(score)
    if (v > 1) v = v <= 100 ? v / 100 : 1 // already a percent — normalise, don't double
    v = Math.max(0, Math.min(1, v))
    const band = v >= 0.7 ? 'high' : v >= 0.45 ? 'medium' : 'low'
    return { band, pct: Math.round(v * 100) }
}

export function formatConfidence(band?: string | null, pct?: number | null): string {
    const b = (band || 'medium')
    const label = b.charAt(0).toUpperCase() + b.slice(1)
    if (pct === null || pct === undefined) return label
    return `${label} (${Math.round(pct)}%)`
}
