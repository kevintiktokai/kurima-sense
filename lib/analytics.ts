'use client'

/**
 * Conversion analytics (Meta Pixel). Dormant until NEXT_PUBLIC_META_PIXEL_ID
 * is set — no script is injected and every track call is a safe no-op, so dev,
 * preview, and CI behave identically with or without the pixel configured.
 *
 * Funnel events (what ad optimization needs):
 *   Lead                 — signup submitted (confirmation email sent)
 *   CompleteRegistration — onboarding finished (the real "we got a user")
 *   FieldCreated (custom)— first activation step in the product
 */

declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void
    }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''

export const analyticsEnabled = () =>
    !!META_PIXEL_ID && typeof window !== 'undefined' && typeof window.fbq === 'function'

/** Meta standard events (https://developers.facebook.com/docs/meta-pixel/reference). */
const STANDARD_EVENTS = new Set([
    'PageView', 'Lead', 'CompleteRegistration', 'Contact', 'Search',
    'ViewContent', 'SubmitApplication', 'StartTrial', 'Subscribe',
])

/** Fire a Meta Pixel event; custom (non-standard) names use trackCustom. */
export function trackEvent(name: string, params?: Record<string, unknown>) {
    if (!analyticsEnabled()) return
    try {
        const verb = STANDARD_EVENTS.has(name) ? 'track' : 'trackCustom'
        window.fbq!(verb, name, params)
    } catch {
        // Analytics must never break the product.
    }
}
