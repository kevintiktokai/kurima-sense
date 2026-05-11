# PWA Troubleshooting

Quick reference for the most common PWA bug reports. Before you dig in,
have the user open `/pwa-status` (dev only) or, on the live site,
DevTools → Application → Service Workers, and report what they see.

## "I'm still seeing the old version of the app"

**Symptoms**: a deploy went out hours ago, but the user reports the
header still says yesterday's copy / a bug we fixed is still showing.

**Why**: a service worker is, by design, sticky. After a new SW is
installed it sits in `waiting` until every tab controlled by the old
one is closed. `cleanupOutdatedCaches: true` only fires on activation,
which doesn't happen until the new SW takes over.

**Fix**:
1. The user closes every KurimaSense tab and reopens.
   `skipWaiting: true` is on, so the new SW activates on the next load
   and old precaches are flushed.
2. If that doesn't help, DevTools → Application → Service Workers →
   **Unregister**, then hard reload. Forces a clean install.
3. Worst case, DevTools → Application → Clear storage → Clear site
   data, then reload. Nukes caches and IndexedDB; user will sign in
   again.

**Prevention**: ship-blocker check — before every deploy verify the
build hash in `sw.js` differs from the one currently on the live URL.
If it doesn't, the precache won't invalidate.

---

## "The install prompt never appears"

**Symptoms**: Android user on Chrome, app loaded multiple times, no
prompt.

**Why** (most → least likely):

1. **They already dismissed it**. We back off for 14 days
   (`DISMISS_COOLDOWN_DAYS` in `lib/install-prompt-policy.ts`). Check
   `localStorage.getItem('kurimasense:install-dismissed-at')`.
2. **They already installed it**. The browser stops firing
   `beforeinstallprompt` after install. Check
   `kurimasense:installed` and the `display-mode: standalone` media
   query in `/pwa-status`.
3. **Manifest is invalid**. Chrome silently refuses to fire the event
   if the manifest fails its install criteria. DevTools → Application
   → Manifest must show zero errors. Common offenders: missing 192/512
   icons, missing `start_url`, `display` not `standalone`.
4. **Site isn't on HTTPS** (or `localhost`). Service workers require
   it, and the install prompt requires a working SW.
5. **Not enough engagement**. `beforeinstallprompt` typically needs at
   least one user gesture and ≥30 s on the site.
6. **They're not in a Chromium browser**. Firefox / Safari don't fire
   the event. iOS Safari users see our custom instruction sheet
   instead.

**Fix**: tell the user to open Chrome → menu → "Install app" / "Add to
home screen". If even that's missing, the manifest is broken.

---

## "On iOS, the home-screen icon is a generic screenshot"

**Symptoms**: iOS user adds to home screen but the icon is a thumbnail
of the page instead of the KurimaSense logo.

**Why**: iOS Safari ignores the manifest icons entirely. It only reads
the `<link rel="apple-touch-icon">` tags at the page where Add-to-Home
was triggered. If the path 404s, iOS falls back to a screenshot.

**Fix**:
1. Verify `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
   resolves on the live URL. Try it directly in Safari.
2. The 180×180 variant matters most. `app/layout.tsx` emits it via
   `metadata.icons.apple`.
3. The user must remove the existing icon and re-add — iOS caches the
   icon forever.

**Prevention**: every deploy, `curl -I https://<host>/apple-touch-icon.png`
and `apple-touch-icon-180x180.png`. Both must return 200.

---

## "The offline page never loads"

**Symptoms**: user reports turning off Wi-Fi → seeing the browser's
"You're not connected" page instead of our `/offline` screen.

**Why** (in order of likelihood):

1. **`/offline` isn't in the precache.** `next.config.ts` force-adds
   it via `additionalManifestEntries`. If you removed that, the
   `offlineFallback` recipe has nothing to serve.
2. **Route precedence**. `registerRoute` order matters — an earlier
   route that matches the navigation request will short-circuit the
   `offlineFallback` catch handler. Check `worker/index.ts`: the
   navigations route is NetworkFirst, and the `offlineFallback` call
   is last (it installs a `setCatchHandler` so it only fires on
   throws).
3. **The SW isn't actually installed yet**. First visit can't have a
   cached offline page — there hasn't been an install. Open the app
   once online, wait for the SW to activate, *then* go offline.

**Fix**:
1. DevTools → Application → Cache Storage → expand `workbox-precache-v2-*`
   and confirm `/offline` is listed.
2. If not, rebuild and reinstall the SW. If it's still missing,
   `additionalManifestEntries` was lost in a config edit.

---

## "Offline activity logs never sync when I come back online"

**Symptoms**: farmer logs activities while offline, sees the "queued
for sync" indicator, but when they reconnect the activities never
appear on the server.

**Why**:

1. **Auth token expired**. Background Sync replays the original
   request — same headers, same body. If the auth cookie / bearer
   token has expired, the server rejects with 401 and Workbox stops
   retrying. There is no token refresh in the SW.
2. **Request body was a stream**. `BackgroundSyncPlugin` can't clone
   a streamed `Request`. If a caller used `body: ReadableStream`, the
   queue entry was empty. All current `/api/*` clients send JSON
   strings, so this should be fine, but watch for it.
3. **Queue exceeded its retention window**. `maxRetentionTime: 24 * 60`
   (24 h). After that, entries are dropped silently.
4. **The SW never got a chance to replay**. Background Sync needs the
   browser to be running. On Android Chrome it can run in the
   background, but iOS only replays when the page is open.

**Fix**:
1. DevTools → Application → IndexedDB → `workbox-background-sync` →
   `requests`. If entries are present and not draining, check the
   network panel for 401s during replay attempts.
2. If 401s: extend the auth refresh window or move to refresh-token-
   in-cookie so the SW's replay survives.
3. Have the user open the app and leave it open for ~30 s after going
   back online.

---

## "The app opens to a blank white screen on iOS"

**Symptoms**: iOS install works, icon is right, but tapping the icon
shows a brief flash of white before the app loads.

**Why**: missing splash screen for that device's resolution. iOS
doesn't gracefully scale — if no `apple-touch-startup-image` matches
the exact device-width / device-height / device-pixel-ratio /
orientation, it shows white.

**Fix**:
1. Check `app/layout.tsx` for the device's media query. If their
   model is missing, add it.
2. Generate the splash image: add the size to
   `scripts/generate-pwa-icons.js` (`SPLASH_SCREENS` array), run
   `npm run generate-icons`.
3. Apple's splash media queries can be brittle — they require *both*
   `device-width` and `device-height` to match, with both orientations
   listed (portrait AND landscape) for the full coverage.

---

## "Lighthouse audit fails with `Page does not register a service worker`"

**Why**: in development, the SW is disabled (`disable:
process.env.NODE_ENV === "development"` in `next.config.ts`). Don't
run Lighthouse against `npm run dev` — it will always fail the PWA
audit.

**Fix**: `npm run build && npm run start`, then audit. The
`scripts/audit-pwa.sh` helper does this for you.

---

## "Can't reproduce — works on my machine"

Standard PWA debugging order:

1. Open `/pwa-status` in dev (or check Application → Service Workers
   in DevTools on the live site).
2. Compare to the user's report: SW state, cache list, controller
   active.
3. If the user's `/pwa-status` shows `registered: yes` but
   `controllerActive: no`, they're on the first load after install
   and need a refresh.
4. If a specific cache is suspiciously empty, the request that should
   populate it isn't matching the route in `worker/index.ts` — verify
   with DevTools → Network → look at the "Size" column ("(ServiceWorker)"
   = handled, anything else = not).
