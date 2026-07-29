// Mapbox token handling — the single place the app decides whether Mapbox GL
// can be used at all.
//
// WHY THIS EXISTS: Mapbox GL JS only accepts a PUBLIC token (`pk.*`) or a
// temporary one (`tk.*`). Handed a SECRET token (`sk.*`) it does not warn and
// fall back — it THROWS from the `new mapboxgl.Map(...)` constructor:
//
//     Use a public access token (pk.*) with Mapbox GL, not a secret access
//     token (sk.*).
//
// Because that constructor runs inside a React effect, the throw escapes to
// the nearest error boundary and takes down the WHOLE route with "Something
// went wrong" — the map does not merely fail, the page does. That is exactly
// what shipped: production was built with an `sk.*` token, so /fields/[id]
// crashed on mount.
//
// So the token is validated here, once, and anything Mapbox GL cannot use is
// treated as "not configured" — callers render the Leaflet fallback instead of
// crashing. A misconfigured token must never be able to break a page again.
//
// SECURITY: `NEXT_PUBLIC_*` values are inlined into the browser bundle by
// webpack, so a secret token placed here is published to every visitor. Only
// ever put a public token in NEXT_PUBLIC_MAPBOX_TOKEN.

/** True only for tokens Mapbox GL JS will actually accept in a browser. */
export function isUsableMapboxToken(token: string | null | undefined): boolean {
    if (typeof token !== 'string') return false
    const t = token.trim()
    return t.startsWith('pk.') || t.startsWith('tk.')
}

const RAW_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '').trim()

/** The token to hand to mapbox-gl — empty string when unusable. */
export const MAPBOX_TOKEN = isUsableMapboxToken(RAW_TOKEN) ? RAW_TOKEN : ''

/** Whether the Mapbox implementation should be used at all. */
export const MAPBOX_ENABLED = MAPBOX_TOKEN.length > 0

// A silent fallback is an invisible misconfiguration: say plainly, once, in the
// browser console why the richer map is not showing. Only the token's prefix is
// logged — never the token itself.
if (typeof window !== 'undefined' && RAW_TOKEN && !MAPBOX_ENABLED) {
    console.error(
        `[mapbox] NEXT_PUBLIC_MAPBOX_TOKEN starts with "${RAW_TOKEN.slice(0, 3)}" — ` +
        'Mapbox GL requires a PUBLIC token (pk.*). Falling back to the basic map. ' +
        'Set a public token in the deployment environment and rebuild. If the ' +
        'current value is a secret token (sk.*), revoke it immediately: ' +
        'NEXT_PUBLIC_* values are compiled into the browser bundle and are public.'
    )
}
