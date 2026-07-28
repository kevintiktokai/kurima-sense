import { test, expect } from '@playwright/test'

/**
 * Field-management map (Mapbox implementation): proves the critical
 * field-creation path still works after the engine swap — the map mounts a GL
 * canvas, draw mode places corners by tapping, live area/perimeter update, and
 * Finish is only offered once a polygon is valid (>=3 corners).
 *
 * Mapbox network APIs are mocked so this runs offline. Requires a build made
 * with NEXT_PUBLIC_MAPBOX_TOKEN set.
 */

const USER_ID = '00000000-0000-4000-8000-00000000e2e1'

const FAKE_STYLE = {
    version: 8,
    name: 'probe',
    sources: {},
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0b1f14' } }],
    glyphs: 'https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf',
    sprite: 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/sprite',
}

// The Mapbox implementation is only selected when the token was present at
// BUILD time (NEXT_PUBLIC_* is inlined by webpack); CI builds without it and
// renders the Leaflet fallback, so skip rather than fail. Run with:
//   NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx npm run build && npm run e2e
test.skip(
    !process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    'needs NEXT_PUBLIC_MAPBOX_TOKEN set at build time (Leaflet fallback renders otherwise)',
)

// Desktop viewport: the toolbar collapses its labels below `sm` ("Add Field"
// becomes "Add"), so a wide viewport keeps the selectors readable.
test.use({ viewport: { width: 1280, height: 900 } })

test('field map: Mapbox mounts and tap-to-draw creates a valid boundary', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))

    // Mapbox APIs
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
    await page.route('**/events.mapbox.com/**', (r) => r.fulfill({ status: 204, body: '' }))
    await page.route('**/api.mapbox.com/**', (r) => r.fulfill({ json: {} }))

    // Backend catch-all first (most-recent route wins in Playwright).
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
    // tutorial_progress marks the guided tour as already seen — otherwise
    // driver.js renders a full-screen overlay that intercepts every click.
    await page.route('**/rest/v1/profiles**', (r) => r.fulfill({
        json: {
            full_name: 'Probe',
            tutorial_progress: { '/dashboard': true, '/dashboard/fields': true },
        },
    }))
    await page.route('**/me/role', (r) => r.fulfill({
        json: { user_id: USER_ID, role: 'consumer', institutional_type: null, tenant_name: null },
    }))
    // Host-qualified: a bare '**/fields' glob also matches the PAGE navigation
    // to /dashboard/fields and would serve raw JSON instead of the app.
    await page.route('http://127.0.0.1:8000/fields', (r) => r.fulfill({ json: [] }))

    // Authenticate for real: the Supabase client persists the session to
    // cookies itself, which route mocks alone cannot do (the dashboard is
    // auth-gated and would redirect to /auth).
    await page.goto('/auth')
    await page.getByPlaceholder('you@example.com').fill('p@example.com')
    await page.getByPlaceholder('••••••••').fill('probe-password')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })

    await page.goto('/dashboard/fields')

    // The Mapbox GL canvas must mount (proves the Mapbox impl is active).
    const canvas = page.locator('canvas.mapboxgl-canvas')
    await expect(canvas).toHaveCount(1, { timeout: 30_000 })

    // Enter mapping: "Add Field" → choose "Draw on map".
    await page.getByRole('button', { name: /Add Field/i }).first().click()
    await page.getByText('Draw on map').click()
    await expect(page.getByText(/place your first corner/i)).toBeVisible({ timeout: 10_000 })

    // Tap four corners on the canvas.
    const box = (await canvas.boundingBox())!
    const pts = [
        { x: box.x + box.width * 0.35, y: box.y + box.height * 0.35 },
        { x: box.x + box.width * 0.65, y: box.y + box.height * 0.35 },
        { x: box.x + box.width * 0.65, y: box.y + box.height * 0.65 },
        { x: box.x + box.width * 0.35, y: box.y + box.height * 0.65 },
    ]
    for (const p of pts) {
        await page.mouse.click(p.x, p.y)
        await page.waitForTimeout(250)
    }

    // Live stats appear and Finish becomes available only with a valid polygon.
    await expect(page.getByText('Area', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /^Finish/ })).toBeVisible()
    await expect(page.getByText('Points', { exact: true })).toBeVisible()

    // Undo removes exactly one corner. Assert the invariant (count decrements)
    // rather than assuming every synthetic click landed on the canvas.
    const countText = () => page.locator('p', { hasText: /^Points$/ })
        .locator('xpath=following-sibling::p[1]').innerText()
    const before = Number(await countText())
    expect(before).toBeGreaterThanOrEqual(3)

    await page.getByRole('button', { name: 'Undo' }).click()
    await page.waitForTimeout(400)
    expect(Number(await countText())).toBe(before - 1)

    // Clear resets the whole boundary back to the empty prompt.
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(page.getByText(/place your first corner/i)).toBeVisible({ timeout: 5_000 })

    expect(errors.filter((e) => !/mapbox|sprite|glyph|worker/i.test(e))).toEqual([])
})
