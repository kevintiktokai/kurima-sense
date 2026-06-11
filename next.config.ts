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

const nextConfig: NextConfig = {
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
