import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// Trigger Vercel Build

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
  // Custom worker — see worker/index.ts for the Workbox route configuration.
  // The default runtime caching is turned off so our routes are the only
  // ones in play; precaching of static assets still happens automatically.
  customWorkerSrc: "worker",
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [],
    // Force the offline fallback page into the precache so it's available
    // when navigation fetches fail outright.
    additionalManifestEntries: [{ url: "/offline", revision: null }],
  },
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default withPWA(nextConfig);
