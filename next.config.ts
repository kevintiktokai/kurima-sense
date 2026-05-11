import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// Trigger Vercel Build

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
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
