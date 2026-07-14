import { test, expect, type Page } from '@playwright/test'

/**
 * The money path: signup → onboarding wizard → consumer dashboard.
 *
 * Runs against the production build with Supabase auth/REST and the backend
 * API mocked via route interception, so it needs no secrets and no live
 * services — it verifies the *frontend wiring* of the funnel end-to-end
 * (form → session persistence → post-auth routing → wizard → role-guarded
 * dashboard render). Backend behavior is covered by the pytest suite.
 */

const USER_ID = '00000000-0000-4000-8000-00000000e2e1'
const EMAIL = 'smoke@example.com'

function sessionJson() {
    const now = Math.floor(Date.now() / 1000)
    const user = {
        id: USER_ID,
        aud: 'authenticated',
        role: 'authenticated',
        email: EMAIL,
        email_confirmed_at: new Date().toISOString(),
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [{ id: USER_ID, user_id: USER_ID, provider: 'email' }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
    return {
        access_token: 'e2e-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: 'e2e-refresh-token',
        user,
    }
}

async function mockAuthAndApi(page: Page) {
    // ── Supabase (the built app points at the placeholder project URL) ──
    await page.route('**/auth/v1/signup**', (route) =>
        route.fulfill({ json: sessionJson() }),
    )
    await page.route('**/auth/v1/token**', (route) =>
        route.fulfill({ json: sessionJson() }),
    )
    await page.route('**/auth/v1/user**', (route) =>
        route.fulfill({ json: sessionJson().user }),
    )
    // Stateful profile mock: 406 (no row → "not onboarded") until the wizard
    // upserts, then a completed profile — mirroring the real backend so any
    // post-onboarding re-check routes to the dashboard instead of looping.
    let profileSaved = false
    await page.route('**/rest/v1/profiles**', (route) => {
        if (route.request().method() === 'GET') {
            if (!profileSaved) {
                return route.fulfill({
                    status: 406,
                    json: { message: 'JSON object requested, multiple (or no) rows returned' },
                })
            }
            return route.fulfill({ json: { full_name: 'Smoke Tester' } })
        }
        profileSaved = true
        return route.fulfill({ status: 201, json: [] })
    })

    // ── Backend API (NEXT_PUBLIC_API_URL defaults to 127.0.0.1:8000) ──
    await page.route('**/me/role', (route) =>
        route.fulfill({
            json: { user_id: USER_ID, role: 'consumer', institutional_type: null, tenant_name: null },
        }),
    )
    await page.route('http://127.0.0.1:8000/**', (route) => {
        const path = new URL(route.request().url()).pathname
        if (path === '/fields' || path.startsWith('/tasks')) {
            return route.fulfill({ json: [] })
        }
        return route.fulfill({ json: {} })
    })
}

test('signup → onboarding → dashboard', async ({ page }) => {
    await mockAuthAndApi(page)

    // 1. Sign up with email + password.
    await page.goto('/auth')
    await page.getByRole('button', { name: /sign up/i }).click()
    await page.getByPlaceholder('you@example.com').fill(EMAIL)
    await page.getByPlaceholder('••••••••').fill('str0ng-e2e-password')
    await page.getByRole('button', { name: 'Create Account' }).click()

    // 2. Auto-confirmed session → onboarding wizard.
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 })
    await expect(page.getByText('Welcome! 👋')).toBeVisible({ timeout: 20_000 })

    await page.getByPlaceholder('e.g. Tenda Mawarire').fill('Smoke Tester')
    await page.getByPlaceholder('+263 7...').fill('+263700000000')
    await page.getByRole('button', { name: 'Next Step' }).click()

    await page.getByRole('button', { name: /Individual \/ Farmer/ }).click()
    await page.getByRole('button', { name: 'Next Step' }).click()

    await page.getByRole('button', { name: /Commercial Farmer/ }).click()
    await page.getByRole('button', { name: 'Complete Setup' }).click()

    // 3. Role-guarded consumer dashboard renders.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
    await expect(page.getByText(/Good (Morning|Afternoon|Evening)/)).toBeVisible({ timeout: 30_000 })
})
