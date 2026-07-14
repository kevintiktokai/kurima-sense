import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

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

// Baseline security headers (production-readiness audit, July 2026). A strict
// Content-Security-Policy is intentionally deferred: the app loads map tiles,
// Unsplash images, and talks to Supabase + the Render backend, so a CSP needs
// careful allowlisting and a staging soak before it can ship without breakage.
const securityHeaders = [
  // Force HTTPS for 2 years once a browser has seen the site over HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Never MIME-sniff responses.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow embedding in iframes (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Send only the origin cross-site; full URL same-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app itself uses geolocation + camera (field capture); deny them to
  // embedded third-party content and turn off features the app never uses.
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  experimental: {
    // Tree-shake the named-imports so only the icons/components actually
    // referenced end up in the client bundle. Big win for lucide-react,
    // recharts and the radix packages.
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-avatar',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tooltip',
      'framer-motion',
    ],
  },
};

export default withPWA(nextConfig);
