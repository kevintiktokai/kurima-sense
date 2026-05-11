/// <reference lib="webworker" />
/**
 * KurimaSense custom service worker.
 *
 * Compiled by @ducanh2912/next-pwa from `customWorkerSrc` and imported
 * into the auto-generated Workbox service worker via importScripts.
 *
 * Caching strategy summary (see docs/PWA_CACHING.md for the full table):
 *
 *   /api/  GET                 — NetworkFirst (5s timeout), 1 day, 100 entries
 *   /api/  POST/PUT/DELETE     — NetworkOnly + BackgroundSync (24h retry)
 *   image  destination         — CacheFirst, 30 days, 200 entries
 *   fonts.googleapis.com       — StaleWhileRevalidate
 *   fonts.gstatic.com          — CacheFirst, 1 year, 30 entries
 *   navigation                 — NetworkFirst (3s timeout)
 *   catch handler              — offlineFallback → /offline
 */

import { BackgroundSyncPlugin } from "workbox-background-sync";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { offlineFallback } from "workbox-recipes";
import { registerRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

const SW_VERSION = "1.0.0";

self.addEventListener("activate", () => {
  // eslint-disable-next-line no-console
  console.log(`[SW] KurimaSense service worker activated, version ${SW_VERSION}`);
});

// ─── Backend API: GET ──────────────────────────────────────────────────
// Network first so farmers always see fresh data when connected, with a
// 5s ceiling before we fall back to the last cached response. 1-day TTL
// covers a full offline workday.
registerRoute(
  ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ─── Backend API: mutations ────────────────────────────────────────────
// When offline, queue the request and replay it once the network is back.
// Single queue across methods so order is preserved when replayed.
const mutationQueue = new BackgroundSyncPlugin("mutation-queue", {
  maxRetentionTime: 24 * 60, // minutes → 24 hours
});

(["POST", "PUT", "DELETE"] as const).forEach((method) => {
  registerRoute(
    ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
    new NetworkOnly({ plugins: [mutationQueue] }),
    method,
  );
});

// ─── Images (field photos, satellite tiles, UI assets) ─────────────────
// Cache first — once a photo or tile is downloaded, serve it from disk
// for 30 days. This covers slow rural connections and zero-data days.
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ─── Google Fonts ──────────────────────────────────────────────────────
// Material Symbols icon font is loaded from Google. next/font handles
// Fraunces/Nunito at build time so those don't need a runtime route.
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({ cacheName: "google-fonts-stylesheets" }),
);
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ─── HTML navigations ──────────────────────────────────────────────────
// 3s timeout keeps the app feeling fast on flaky connections — after
// that, serve the cached page. offlineFallback below handles the case
// where nothing is cached yet.
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages",
    networkTimeoutSeconds: 3,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

// ─── Offline fallback ──────────────────────────────────────────────────
// Must come after other routes — installs a catch handler that returns
// the precached /offline page for navigation requests that fail outright.
offlineFallback({ pageFallback: "/offline" });
