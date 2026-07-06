# KurimaSense Native Mobile App (Capacitor)

One codebase, three surfaces: web, installable PWA, and a native shell built
with **Capacitor** (`capacitor.config.ts`, `android/`).

## Architecture decision

The Next.js app is server-rendered on Vercel, so Capacitor's default
static-`webDir` mode would require forking the web architecture into a static
export. Instead the native shell uses Capacitor's **remote-URL strategy**: the
WebView loads the production deployment and Capacitor injects the native
bridge into it. That preserves a single deployable codebase (every web deploy
updates the app instantly) while unlocking native capabilities the PWA cannot
reach — reliable push notifications, native camera/GPS permission flows, and
trustworthy connectivity events for sync.

`mobile/www/` contains only a cold-start bootstrap page; after the first
online launch the existing service worker (`worker/index.ts`) serves the app
shell offline inside the WebView exactly as it does in the browser.

All platform-conditional code lives behind one seam — `lib/native/index.ts`:

| Capability | Native shell | Browser/PWA fallback |
| --- | --- | --- |
| Push | `@capacitor/push-notifications` → token posted to `POST /notifications/devices` | in-app inbox + polling badge |
| Location | `@capacitor/geolocation` | `navigator.geolocation` |
| Camera | `@capacitor/camera` (`takePhotoBase64`) | existing `<input type="file">` flows |
| Connectivity | `@capacitor/network` events → outbox drain | `online`/visibility events |
| Back button / lifecycle | `@capacitor/app` | n/a |

`<NativeBridge/>` (root layout) initialises this wiring; it is a no-op on web.

## Offline & synchronization strategy

Offline capture is **app-level, not request-level**: every field mutation
(tasks, task completion, harvests, input logs, scouting observations, crop
plans) goes through `lib/offline/submit.ts` → tries the network, and on
failure queues into the IndexedDB outbox (`lib/offline/outbox.ts`) with a
client-generated UUID, exponential backoff, and per-item status the UI can
surface. Replays re-attach a **fresh Supabase JWT**, which Workbox background
sync cannot do for cross-origin API calls. The outbox drains on reconnect
(native network events in the shell), on foreground, on tab focus, and on an
interval. This milestone extended the outbox to `PATCH` mutations
(`submitTaskCompletion`) so completing planner work offline syncs too.

Reads work offline through the service worker: API GETs are NetworkFirst with
a 1-day cache (a full offline workday), navigations fall back to the cached
shell.

## Build & release

```bash
npm run build              # unchanged web build (Vercel)
npm run cap:sync           # sync plugins/config into android/
npm run cap:android        # open in Android Studio → run/build AAB
npx cap add ios            # generate the iOS project (macOS + Xcode)
```

Point the shell at another environment with
`CAPACITOR_SERVER_URL=https://… npx cap sync`.

### Enabling push end-to-end

1. Create a Firebase project; download `google-services.json` into
   `android/app/`.
2. Set `FCM_SERVICE_ACCOUNT_JSON` on the backend — the push channel adapter
   (`services/notifications/channels.py`) and device-token registry are
   already live, so no code changes are needed on either side.

### Store note

Remote-URL shells are accepted when the app offers genuine native integration
(push, camera, GPS, offline — all present here). If a fully-bundled binary is
ever required, the migration path is a static export of the app shell into
`webDir` — `lib/native` and the outbox are already client-side and carry over
unchanged.
