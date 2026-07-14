import { defineConfig, devices } from '@playwright/test'

// E2E smoke tests. These run against a production build (`next start`) with
// network interception for Supabase/backend calls, so they need no secrets and
// work in CI. Run with: npm run e2e (builds are NOT triggered automatically —
// run `npm run build` first, or let the webServer reuse a dev server).
export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://127.0.0.1:3100',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'npx next start -p 3100',
        url: 'http://127.0.0.1:3100',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
    },
    projects: [
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 7'] },
        },
        {
            name: 'mobile-safari-ua',
            // Chromium with an iPhone UA/viewport — enough to drive the iOS
            // install-instructions path (detectIos() is UA-based). Real WebKit
            // isn't installed in this environment.
            use: {
                ...devices['iPhone 13'],
                browserName: 'chromium',
            },
        },
    ],
})
