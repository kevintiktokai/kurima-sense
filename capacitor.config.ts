import type { CapacitorConfig } from '@capacitor/cli'

/**
 * KurimaSense native shell (Capacitor).
 *
 * Strategy: **remote-URL shell over the deployed Next.js app** — one codebase.
 * The Next app is SSR on Vercel (dynamic routes, API-backed), so a static
 * `webDir` export is not an option without forking the web architecture.
 * Instead the native WebView loads the production deployment and Capacitor
 * injects the native bridge into it, giving the existing PWA (service worker,
 * IndexedDB outbox, offline fallback) full native plugin access: push
 * notifications, camera, geolocation, background-capable sync via the outbox.
 *
 * `mobile/www` holds only the cold-start bootstrap page shown before the
 * remote app is reachable for the first time; after first load the service
 * worker serves the app shell offline.
 *
 * Override the app URL per environment:
 *   CAPACITOR_SERVER_URL=https://staging.kurimasense.com npx cap sync
 *
 * See docs/MOBILE_APP.md for the full build + release guide.
 */
const config: CapacitorConfig = {
  appId: 'com.kurimasense.app',
  appName: 'KurimaSense',
  webDir: 'mobile/www',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://kurima-sense.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
