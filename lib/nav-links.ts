// Navigation link helpers (Depth Sprint PR B) — pure, renderless, unit-tested.
//
// One place that builds cross-screen routes and the contextual "back" params,
// so consumer screens never accidentally link into /portfolio (and vice-versa)
// and every detail page has a safe, contextual back target even on a cold
// deep-link.

export type Audience = 'consumer' | 'portfolio'

/** Detail route for a field, in the caller's audience tree. */
export function routeForField(id: string, audience: Audience): string {
    return audience === 'portfolio' ? `/portfolio/fields/${id}` : `/fields/${id}`
}

/** Detail route for a grower (portfolio only). */
export function routeForGrower(id: string): string {
    return `/portfolio/growers/${id}`
}

// Short query keys for the contextual back label/href.
const FROM_LABEL_KEY = 'f'
const FROM_HREF_KEY = 'fh'

export interface FromContext {
    label: string
    href: string
}

/**
 * Append contextual back params (`f` = label, `fh` = href) to a target href.
 * Both are URL-encoded. Omitted parts are simply not appended.
 */
export function withFrom(href: string, fromLabel?: string, fromHref?: string): string {
    const parts: string[] = []
    if (fromLabel) parts.push(`${FROM_LABEL_KEY}=${encodeURIComponent(fromLabel)}`)
    if (fromHref) parts.push(`${FROM_HREF_KEY}=${encodeURIComponent(fromHref)}`)
    if (parts.length === 0) return href
    return href + (href.includes('?') ? '&' : '?') + parts.join('&')
}

/** Minimal shape both URLSearchParams and Next's ReadonlyURLSearchParams satisfy. */
export interface ParamsLike {
    get(key: string): string | null
}

/**
 * A same-app relative path: starts with a single '/', no protocol/scheme and no
 * '//' (protocol-relative). This rejects open-redirect-style junk such as
 * 'https://evil.com', '//evil.com', and 'javascript:alert(1)'.
 */
export function isSafeRelativeHref(href: string): boolean {
    return typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && !href.includes(':')
}

/**
 * Resolve the back target for a detail page from its search params, falling
 * back to a per-screen default. An `fh` that is not a safe same-app relative
 * path is rejected (falls back to the default href), so the back link can never
 * point off-app. A present-but-unsafe href also discards the custom label.
 */
export function parseFrom(params: ParamsLike, fallback: FromContext): FromContext {
    const label = params.get(FROM_LABEL_KEY)
    const href = params.get(FROM_HREF_KEY)
    if (href && isSafeRelativeHref(href)) {
        return { label: label || fallback.label, href }
    }
    return fallback
}

// Per-screen back defaults (used when no/!safe `fh` is present).
export const BACK_DEFAULTS = {
    consumerField: { label: 'Fields', href: '/dashboard/fields' } as FromContext,
    portfolioField: { label: 'Today', href: '/portfolio/today' } as FromContext,
    grower: { label: 'Growers', href: '/portfolio/growers' } as FromContext,
}

/**
 * Whether a nav tab is active for the current pathname: exact match, or the
 * pathname is a sub-route of the tab (prefix match on `tabHref + '/'`), so a
 * detail route lights up its parent tab. The dashboard/portfolio roots match
 * only exactly (they are not prefixes of their siblings).
 */
export function isTabActive(pathname: string | null | undefined, tabHref: string): boolean {
    if (!pathname) return false
    if (pathname === tabHref) return true
    return pathname.startsWith(tabHref + '/')
}
