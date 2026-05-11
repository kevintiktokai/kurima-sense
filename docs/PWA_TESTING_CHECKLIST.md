# PWA Testing Checklist

Run through every section below on real devices before tagging a PWA
release. Lighthouse (`npm run audit:pwa`) covers the automated portion;
nothing below substitutes for it but it can't catch device-specific
install / splash / status-bar bugs.

## Automated audit

- [ ] `npm test` — policy unit tests green
- [ ] `npm run audit:pwa` — opens `lighthouse-report.html`
  - [ ] PWA: **100** (any deduction = fix before shipping)
  - [ ] Performance: **> 90**
  - [ ] Accessibility: **> 95**
  - [ ] Best Practices: **> 90**

> The audit script builds, starts the prod server, polls it until it
> answers, runs Lighthouse headless, then tears the server down. If
> the run fails because Chrome isn't installed locally, install it or
> run the audit from a machine where it is.

---

## Real device test — Android Chrome

- [ ] Open production URL on Android Chrome
- [ ] Wait 30 seconds, browse 2–3 pages
- [ ] Confirm the "Install app" prompt appears (or trigger via menu → Install app, or via Settings → Install App in the app)
- [ ] Tap **Install**. Confirm:
  - [ ] Icon appears on the home screen with the KurimaSense logo (not a generic globe)
  - [ ] Tapping the icon opens the app in standalone mode (no browser chrome)
  - [ ] Splash screen shows the correct icon and `#0fb885` theme color
  - [ ] App functions normally — auth still works, dashboard loads
- [ ] Test offline:
  - [ ] Browse a page, then enable airplane mode
  - [ ] Pull-to-refresh — page should still load from cache
  - [ ] Try to log a farming activity — request should queue (check `kurimasense:engagement-score` is still bumping) and surface a "synced when online" indicator
  - [ ] Disable airplane mode — confirm the queued mutation replays. DevTools (remote-debugging via `chrome://inspect`) → Application → IndexedDB → `workbox-background-sync` → `requests` should drain to zero.

## Real device test — iOS Safari

> Requires iOS 16.4+ for full PWA support (service worker, push, etc.).
> On older iOS the app degrades to a basic web view — still installable
> as a home-screen icon, but with no background sync.

- [ ] Open production URL on iOS Safari (16.4+)
- [ ] Browse 2–3 pages
- [ ] Trigger the install prompt via Settings → Install App
- [ ] Confirm the iOS instruction sheet appears with the share-icon and add-to-home-screen illustrations
- [ ] Manually: Share → Add to Home Screen → Add
- [ ] Confirm:
  - [ ] Icon on the home screen uses the apple-touch-icon (not a generic screenshot)
  - [ ] Tapping the icon opens standalone (no Safari URL bar)
  - [ ] Status bar style matches `apple-mobile-web-app-status-bar-style: default`
  - [ ] Splash screen displays the device-specific image from `public/splash/` with no letterboxing
  - [ ] No Safari chrome visible
- [ ] Test offline (Settings → toggle Wi-Fi off and toggle Cellular Data off):
  - [ ] Previously-viewed pages still accessible
  - [ ] Navigating to a never-visited route lands on `/offline`

## Desktop test — Chrome / Edge (macOS / Windows / Linux)

- [ ] Open production URL in Chrome or Edge
- [ ] Address-bar install icon (small monitor with down-arrow) is visible on the right side
- [ ] Click it → confirm install
- [ ] App opens in its own window with no browser chrome
- [ ] App appears in the OS dock / taskbar / Activities
- [ ] App launches independently of Chrome / Edge (close the browser; app still runs)
- [ ] `npm run dev` and visit `/pwa-status` (dev-only): "Standalone display-mode" reads `yes` inside the installed window

## Manifest validation

- [ ] Chrome DevTools → Application → Manifest
- [ ] **Zero** errors or warnings — including the maskable icon preview, shortcut icons, and theme color
- [ ] All icons load (no red ✗ next to any size)
- [ ] "Add to homescreen" link inside DevTools works

## Service worker validation

- [ ] DevTools → Application → Service Workers
  - [ ] Status: **activated and running**
  - [ ] Script URL ends in `/sw.js`
  - [ ] Console shows `[SW] KurimaSense service worker activated, version 1.0.0`
- [ ] No errors in the Console (filter: Errors only)
- [ ] DevTools → Application → Cache Storage — after a 1–2 minute browse you should see at minimum: `workbox-precache-v2-*`, `pages`, plus `api-cache` and `images` once those requests have fired
- [ ] DevTools → Application → Background Services → Background Sync — `mutation-queue` is registered when an offline mutation is attempted

## Performance spot checks

- [ ] DevTools → Network → throttle to **Slow 3G**
- [ ] First load completes within **5 seconds**
- [ ] Second load (with SW + caches warm) completes within **1 second**
- [ ] Lighthouse mobile Performance score > **85** on the home page and at least one dashboard surface

## Pre-release sign-off

- [ ] All three platforms (Android Chrome, iOS Safari, desktop Chromium) checked off above
- [ ] `lighthouse-report.html` archived to the release notes
- [ ] `docs/PWA_CACHING.md` and `docs/PWA_TROUBLESHOOTING.md` still match the deployed worker
- [ ] Tag the release: `git tag v1.0.0-pwa && git push origin v1.0.0-pwa`
- [ ] Deploy and re-verify against the live URL — installs done before the deploy will hold onto the old SW until the next `cleanupOutdatedCaches` activation cycle, so the first post-deploy load on a previously-installed device is the most fragile moment.
