import { test, expect } from '@playwright/test'

/**
 * REGRESSION (July 2026): production was built with a Mapbox SECRET token
 * (`sk.*`). mapbox-gl throws from the `new mapboxgl.Map(...)` constructor on
 * such a token; the throw escaped the map's React effect, hit the route error
 * boundary, and replaced the ENTIRE field page with "Something went wrong" —
 * no map, no field data, no scouting, nothing.
 *
 * This proves the failure now degrades: with an unusable token the page must
 * render normally and fall back to the basic (Leaflet) map.
 *
 * Build with an sk.* token to arm it:
 *   NEXT_PUBLIC_MAPBOX_TOKEN=sk.eyJ1IjoicHJvYmUifQ.fake npm run build && npm run e2e
 */

const FIELD_ID = '11111111-2222-4333-8444-555555555555'
const USER_ID = '00000000-0000-4000-8000-00000000e2e1'
const POLY = [
    { lat: -17.800, lon: 31.000 },
    { lat: -17.800, lon: 31.010 },
    { lat: -17.810, lon: 31.010 },
    { lat: -17.810, lon: 31.000 },
]

test.skip(
    !(process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '').startsWith('sk.'),
    'needs a build made with an sk.* token — that is the condition under test',
)

test('an unusable Mapbox token degrades to the basic map, it does NOT crash the page', async ({ page }) => {
    // Block every map network call: nothing should be requested anyway, and if
    // the guard regressed we want a deterministic failure, not a flaky one.
    await page.route('**/api.mapbox.com/**', (r) => r.abort())
    await page.route('**/events.mapbox.com/**', (r) => r.fulfill({ status: 204, body: '' }))
    await page.route('**/*.tile.openstreetmap.org/**', (r) =>
        r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }))
    await page.route('**/unpkg.com/**', (r) =>
        r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }))

    await page.route('http://127.0.0.1:8000/**', (r) => r.fulfill({ json: {} }))

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
        json: { field_id: FIELD_ID, grid: 2, analyzed_at: null, sections: [] },
    }))

    await page.goto(`/fields/${FIELD_ID}`)

    // The page itself must survive.
    await expect(page.getByText('Something went wrong')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Probe Field' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Field Map & Zones')).toBeVisible({ timeout: 30_000 })

    // ...and no Mapbox canvas was ever mounted (the fallback took over).
    await expect(page.locator('canvas.mapboxgl-canvas')).toHaveCount(0)
})

test('REGRESSION: a partial field-state payload (no kurima_score) does not crash the page', async ({ page }) => {
    await page.route('**/api.mapbox.com/**', (r) => r.abort())
    await page.route('**/*.tile.openstreetmap.org/**', (r) =>
        r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }))
    await page.route('**/unpkg.com/**', (r) =>
        r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }))
    await page.route('http://127.0.0.1:8000/**', (r) => r.fulfill({ json: {} }))

    const now = Math.floor(Date.now() / 1000)
    await page.route('**/auth/v1/**', (r) => r.fulfill({
        json: r.request().url().includes('user')
            ? { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'p@example.com' }
            : {
                access_token: 'probe', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600,
                refresh_token: 'probe-r',
                user: { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'p@example.com' },
            },
    }))
    await page.route('**/rest/v1/profiles**', (r) => r.fulfill({ json: { full_name: 'Probe' } }))
    await page.route('**/me/role', (r) => r.fulfill({
        json: { user_id: USER_ID, role: 'consumer', institutional_type: null, tenant_name: null },
    }))
    // Deliberately omits kurima_score — the shape that used to throw a
    // TypeError straight into the route error boundary.
    await page.route('**/field/*/state', (r) => r.fulfill({
        json: {
            field: { id: FIELD_ID, name: 'Partial Field', crop_type: 'Maize', area_ha: 4, polygon_coordinates: POLY },
            indices: { current: {}, trend_30d: [] },
            season: {}, meta: {}, alerts: [],
        },
    }))
    await page.route('**/fields/*/sections**', (r) => r.fulfill({
        json: { field_id: FIELD_ID, grid: 2, analyzed_at: null, sections: [] },
    }))

    await page.goto(`/fields/${FIELD_ID}`)

    await expect(page.getByText('Something went wrong')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Partial Field' })).toBeVisible({ timeout: 30_000 })
    // Degrades to an explicit placeholder rather than a broken badge.
    await expect(page.getByText('Score pending')).toBeVisible()
})
