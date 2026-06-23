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
 *   map raster tiles           — NOT cached (network only; never served stale)
 *   image  destination         — CacheFirst, 30 days, 200 entries, status 200 only
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

const SW_VERSION = "1.1.0";

// Runtime caches from older service-worker versions that must be discarded on
// upgrade. The legacy "images" cache could hold opaque/error map-tile responses
// (it accepted statuses [0, 200] and CacheFirst-served them for 30 days), which
// blanked the production map. Deleting it forces a clean refetch; map tiles are
// no longer cached at all (see the images route below).
const LEGACY_CACHES = ["images"];

self.addEventListener("activate", (event) => {
  console.log(`[SW] KurimaSense service worker activated, version ${SW_VERSION}`);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => LEGACY_CACHES.includes(key)).map((key) => caches.delete(key)),
      ),
    ),
  );
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

// ─── Map raster tiles: NEVER service-worker cached ─────────────────────
// Map tiles are fetched as `image` requests, so without this guard they fall
// into the CacheFirst image route below. That is exactly what blanked the
// production map: opaque/error tile responses got cached (CacheFirst + statuses
// [0, 200]) and were served stale for 30 days. Tiles must always go to the
// network and never be precached/served-stale, so we match these hosts FIRST
// and exclude them from the image cache. (No registerRoute here → no caching;
// the exclusion lives in the image matcher.)
const MAP_TILE_HOST = /(^|\.)arcgisonline\.com$|(^|\.)tile\.openstreetmap\.org$/i;

// ─── Images (field photos, UI assets) ──────────────────────────────────
// Cache first — once a photo or asset is downloaded, serve it from disk for
// 30 days. This covers slow rural connections and zero-data days. Map tiles
// are explicitly excluded (see MAP_TILE_HOST), and only real 200 responses are
// cached — never opaque (0) or error responses, which is what poisoned the
// cache before.
registerRoute(
  ({ request, url }) =>
    request.destination === "image" && !MAP_TILE_HOST.test(url.hostname),
  new CacheFirst({
    cacheName: "images-v2",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
      new CacheableResponsePlugin({ statuses: [200] }),
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
