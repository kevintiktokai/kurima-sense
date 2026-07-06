// Types + pure presentation helpers for the AI irrigation recommendation
// engine (backend services/irrigation). No 'use client' — used by components
// and node:test.

export type IrrigationAction =
    | 'irrigate_now'
    | 'irrigate_soon'
    | 'delay_rain_expected'
    | 'monitor'
    | 'not_needed'

export interface IrrigationRecommendation {
    field_id: string
    field_name: string
    crop: string
    stage: string
    action: IrrigationAction
    headline: string
    reasoning: string[]
    water_deficit_mm: number
    raw_trigger_mm: number
    taw_mm: number
    recommended_mm: number
    duration_minutes: number | null
    method: string
    expected_rain_mm_3d: number
    etc_mm_per_day: number
    confidence: number
    confidence_label: 'high' | 'medium' | 'low'
    next_review_date?: string | null
    valid_until?: string | null
    generated_at?: string | null
    data_sources: string[]
}

export interface IrrigationOutlookResponse {
    recommendations: IrrigationRecommendation[]
    evaluated_fields: number
    actionable: number
}

export interface ActionMeta {
    label: string
    icon: string      // material symbol
    color: string     // accent (text/icon)
    urgent: boolean
}

const ACTION_META: Record<IrrigationAction, ActionMeta> = {
    irrigate_now: { label: 'Irrigate today', icon: 'sprinkler', color: '#dc2626', urgent: true },
    irrigate_soon: { label: 'Irrigate within 2 days', icon: 'schedule', color: 'var(--ee-sun, #d97706)', urgent: true },
    delay_rain_expected: { label: 'Delay — rain expected', icon: 'rainy', color: '#2563eb', urgent: false },
    monitor: { label: 'Monitor', icon: 'visibility', color: 'var(--ee-muted, #6b7280)', urgent: false },
    not_needed: { label: 'Well watered', icon: 'check_circle', color: 'var(--ee-primary, #2F6B3C)', urgent: false },
}

export function actionMeta(action: IrrigationAction): ActionMeta {
    return ACTION_META[action] ?? ACTION_META.monitor
}

/** "45 min" / "1 h 20 min" for runtime display. */
export function formatDuration(minutes: number | null | undefined): string {
    if (!minutes || minutes <= 0) return ''
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h} h ${m} min` : `${h} h`
}

/** Root-zone fullness (0..1) for the water gauge: 1 = field capacity. */
export function rootZoneFullness(rec: Pick<IrrigationRecommendation, 'water_deficit_mm' | 'taw_mm'>): number {
    if (!rec.taw_mm || rec.taw_mm <= 0) return 0
    const fullness = 1 - rec.water_deficit_mm / rec.taw_mm
    return Math.min(1, Math.max(0, fullness))
}

/** Sort order for outlook lists: most urgent first (mirrors the backend). */
export const ACTION_ORDER: Record<IrrigationAction, number> = {
    irrigate_now: 0,
    irrigate_soon: 1,
    delay_rain_expected: 2,
    monitor: 3,
    not_needed: 4,
}
