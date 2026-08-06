// Presentation helpers for action windows. Pure — unit-tested in
// tests/action-windows.test.ts.
//
// The design problem these solve: a farmer opening the app sees a list, and
// every item in a list looks equally important. These helpers encode the two
// distinctions that actually matter — how soon a window shuts, and whether
// missing it can be made up — so the UI can render them differently instead of
// flattening them into identical rows.

import type { ActionWindow, WindowCategory, WindowState } from './planning-types'

export interface WindowStateStyle {
    label: string
    color: string
    /** Full-bleed treatment: this one should interrupt, not sit in a list. */
    urgent: boolean
}

const STATE_STYLES: Record<WindowState, WindowStateStyle> = {
    closing: { label: 'Closing', color: '#dc2626', urgent: true },
    open: { label: 'Open now', color: '#0fb885', urgent: false },
    upcoming: { label: 'Coming up', color: '#64748b', urgent: false },
    closed: { label: 'Closed', color: '#9ca3af', urgent: false },
}

export function windowStateStyle(state: WindowState | null | undefined): WindowStateStyle {
    if (!state || !(state in STATE_STYLES)) return STATE_STYLES.upcoming
    return STATE_STYLES[state]
}

const CATEGORY_ICONS: Record<WindowCategory, string> = {
    establishment: 'straighten',
    weed: 'grass',
    nutrition: 'science',
    protection: 'pest_control',
}

export function windowIcon(category: WindowCategory | null | undefined): string {
    if (!category || !(category in CATEGORY_ICONS)) return 'schedule'
    return CATEGORY_ICONS[category]
}

/**
 * The deadline in the farmer's words.
 *
 * Deliberately not a date. "Closes in 3 days" is a decision; "closes 18 Dec"
 * is arithmetic the farmer has to do themselves while standing in a field.
 */
export function deadlineLabel(w: ActionWindow): string {
    if (w.state === 'closed') return 'Window has closed'
    if (w.state === 'upcoming') {
        return w.opens_date ? `Opens ${shortDate(w.opens_date)}` : 'Not open yet'
    }
    const d = w.days_remaining
    if (d === null || d === undefined) return 'Open now'
    if (d <= 0) return 'Last day'
    if (d === 1) return 'Closes tomorrow'
    return `Closes in ${d} days`
}

function shortDate(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/**
 * The cost line. Irreversible windows say so explicitly, because that is the
 * distinction a farmer is most likely to misjudge — a task that can be done
 * next week and one that cannot look identical on a list.
 */
export function costLabel(w: ActionWindow): string {
    const base = w.cost_of_missing || 'Reduced yield'
    return w.irreversible ? `${base} — cannot be recovered` : base
}

/**
 * The few windows worth interrupting a farmer over: open or closing, and
 * irreversible. Capped, because an "urgent" list of ten is just a list.
 */
export function urgentWindows(windows: ActionWindow[] | undefined, limit = 3): ActionWindow[] {
    if (!windows?.length) return []
    return windows
        .filter((w) => w.irreversible && (w.state === 'open' || w.state === 'closing'))
        .slice(0, limit)
}

/** Everything else, still ranked, for the full list below the fold. */
export function remainingWindows(
    windows: ActionWindow[] | undefined,
    urgent: ActionWindow[]
): ActionWindow[] {
    if (!windows?.length) return []
    const urgentKeys = new Set(urgent.map((w) => w.key))
    return windows.filter((w) => !urgentKeys.has(w.key))
}

/** Group by category for the full list, preserving the backend's ranking. */
export function groupByCategory(
    windows: ActionWindow[] | undefined
): { category: WindowCategory; windows: ActionWindow[] }[] {
    if (!windows?.length) return []
    const order: WindowCategory[] = ['establishment', 'weed', 'nutrition', 'protection']
    const groups = new Map<WindowCategory, ActionWindow[]>()
    for (const w of windows) {
        const list = groups.get(w.category)
        if (list) list.push(w)
        else groups.set(w.category, [w])
    }
    return order
        .filter((c) => groups.has(c))
        .map((category) => ({ category, windows: groups.get(category) as ActionWindow[] }))
}

export const CATEGORY_LABELS: Record<WindowCategory, string> = {
    establishment: 'Getting established',
    weed: 'Weed control',
    nutrition: 'Feeding the crop',
    protection: 'Scouting & protection',
}

export function categoryLabel(category: WindowCategory | null | undefined): string {
    if (!category || !(category in CATEGORY_LABELS)) return 'Other'
    return CATEGORY_LABELS[category]
}
