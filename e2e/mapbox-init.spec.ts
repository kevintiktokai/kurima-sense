import { test, expect } from '@playwright/test'

/**
 * Verifies the Mapbox integration CODE initializes correctly: with a token
 * present, FieldMapbox must mount a real mapbox-gl canvas, and the zone
 * overlay must be applied. Mapbox's network APIs are mocked so this runs
 * offline/in CI. Requires the app to be built with NEXT_PUBLIC_MAPBOX_TOKEN
 * set (see the mapbox:probe npm script).
 */

const USER_ID = '00000000-0000-4000-8000-00000000e2e1'
const FIELD_ID = '11111111-2222-4333-8444-555555555555'
const POLY = [
    { lat: -17.800, lon: 31.000 },
    { lat: -17.800, lon: 31.010 },
    { lat: -17.810, lon: 31.010 },
    { lat: -17.810, lon: 31.000 },
]

// Minimal valid Mapbox GL style — enough for the map to finish loading.
const FAKE_STYLE = {
    version: 8,
    name: 'probe',
    sources: {},
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0b1f14' } }],
    glyphs: 'https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf',
    sprite: 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/sprite',
}

// The Mapbox branch only exists in the bundle when the token was present at
// BUILD time (NEXT_PUBLIC_* is inlined by webpack). CI builds without it, so
// skip there rather than fail — run locally/preview with the token set:
//   NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx npm run build && npm run e2e
test.skip(
    !process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    'needs NEXT_PUBLIC_MAPBOX_TOKEN set at build time (Mapbox branch is compiled out otherwise)',
)

test('Mapbox map initializes and applies the zone overlay', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

    // --- Mapbox API mocks (style / sprite / glyphs / tiles) ---
    await page.route('**/styles/v1/mapbox/**', (r) => {
        const u = r.request().url()
        if (u.includes('sprite')) {
            return u.endsWith('.png')
                ? r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) })
                : r.fulfill({ json: {} })
        }
        return r.fulfill({ json: FAKE_STYLE })
    })
    await page.route('**/fonts/v1/**', (r) => r.fulfill({ status: 200, body: Buffer.alloc(0) }))
    await page.route('**/api.mapbox.com/**', (r) => r.fulfill({ json: {} }))
    await page.route('**/events.mapbox.com/**', (r) => r.fulfill({ status: 204, body: '' }))

    // --- backend catch-all FIRST: Playwright checks the most recently
    // registered route first, so specific routes must come after it. ---
    await page.route('http://127.0.0.1:8000/**', (r) => r.fulfill({ json: {} }))

    // --- auth + backend mocks ---
    const now = Math.floor(Date.now() / 1000)
    const session = {
        access_token: 'probe', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600,
        refresh_token: 'probe-r',
        user: {
            id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'p@example.com',
            email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {},
            identities: [{ id: USER_ID }], created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    }
    await page.route('**/auth/v1/**', (r) =>
        r.fulfill({ json: r.request().url().includes('user') ? session.user : session }))
    await page.route('**/rest/v1/profiles**', (r) => r.fulfill({ json: { full_name: 'Probe' } }))
    await page.route('**/me/role', (r) => r.fulfill({
        json: { user_id: USER_ID, role: 'consumer', institutional_type: null, tenant_name: null },
    }))
    await page.route('**/field/*/state', (r) => r.fulfill({
        json: {
            field: { id: FIELD_ID, name: 'Probe Field', crop_type: 'Maize', area_ha: 12, polygon_coordinates: POLY },
            kurima_score: { score: 72, label: 'Good', color: '#65a30d' },
            indices: { current: { ndvi: 0.62 }, trend_30d: [] },
            water_balance: { soil_moisture_pct: 44 },
            season: {}, meta: { as_of_satellite_pass: '2026-07-20' }, alerts: [],
        },
    }))
    await page.route('**/fields/*/sections**', (r) => r.fulfill({
        json: {
            field_id: FIELD_ID, grid: 2, analyzed_at: new Date().toISOString(),
            sections: [
                { index: 0, label: 'North-West', polygon: POLY, centroid: { lat: -17.802, lon: 31.002 }, area_share: 0.25, ndvi: 0.71, evi: null, cloud_cover: null, status: 'ok', sampled_at: new Date().toISOString() },
                { index: 1, label: 'North-East', polygon: POLY, centroid: { lat: -17.802, lon: 31.008 }, area_share: 0.25, ndvi: 0.28, evi: null, cloud_cover: null, status: 'ok', sampled_at: new Date().toISOString() },
            ],
        },
    }))
    await page.goto(`/fields/${FIELD_ID}`)

    // The zone card must render...
    await expect(page.getByText('Field Map & Zones')).toBeVisible({ timeout: 30_000 })
    // ...and the worst-zone callout must name the low-NDVI zone.
    await expect(page.getByText(/North-East/).first()).toBeVisible({ timeout: 15_000 })
    // ...and a real mapbox-gl canvas must exist (proves GL init, not the fallback).
    await expect(page.locator('canvas.mapboxgl-canvas')).toHaveCount(1, { timeout: 30_000 })
    // ...with the style toggle available.
    await expect(page.getByRole('button', { name: 'Terrain' })).toBeVisible()

    console.log('=== page errors ===')
    console.log(errors.slice(0, 20).join('\n') || '  (none)')
})
