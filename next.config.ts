import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression for all responses
  compress: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    // Serve modern formats automatically
    formats: ['image/avif', 'image/webp'],
  },

  // Optimize external packages — tree-shake heavy deps
  serverExternalPackages: [],

  experimental: {
    // Enable optimized package imports to reduce bundle size
    optimizePackageImports: [
      'recharts',
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-scroll-area',
    ],
  },

  // Add security and performance headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Cache static assets aggressively
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        source: '/logo-200.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Preconnect to the API and weather service
        source: '/(dashboard|fields)(.*)',
        headers: [
          { key: 'Link', value: '<https://api.open-meteo.com>; rel=preconnect' },
        ],
      },
    ];
  },
};

export default nextConfig;
