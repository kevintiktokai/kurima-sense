import { test, expect } from '@playwright/test'

// Reproduces the reported bug: the iOS install-instructions sheet pops on the
// landing page, the user presses "Got it", and the instructions must dismiss
// (and stay dismissed across reloads via the 14-day cooldown).

test.describe('install prompt', () => {
    test.beforeEach(async ({ page }) => {
        // Qualify for the auto-show policy before the app boots. Runs on every
        // navigation, so guard with a marker — wiping dismissed-at on reload
        // would defeat the persistence assertion below.
        await page.addInitScript(() => {
            if (sessionStorage.getItem('e2e-seeded')) return
            sessionStorage.setItem('e2e-seeded', '1')
            localStorage.setItem('kurimasense:visit-count', '5')
            localStorage.removeItem('kurimasense:install-dismissed-at')
            localStorage.removeItem('kurimasense:installed')
        })
    })

    test('"Got it" dismisses the iOS instructions and they stay dismissed', async ({ page }) => {
        await page.goto('/')
        const ua = await page.evaluate(() => navigator.userAgent)
        test.skip(!/iPhone|iPad/.test(ua), 'iOS instructions only show for iOS user agents')
        const sheet = page.getByText('Add KurimaSense to your Home Screen')
        const gotIt = page.getByRole('button', { name: 'Got it' })

        // The prompt auto-shows ~600ms after mount on qualifying visits.
        await expect(sheet).toBeVisible({ timeout: 10_000 })
        await gotIt.click()
        await expect(sheet).toBeHidden({ timeout: 5_000 })

        // The dismissal must persist: reload and confirm the cooldown holds.
        await page.reload()
        await page.waitForTimeout(2_000)
        await expect(sheet).toBeHidden()
    })
})
