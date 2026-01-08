/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,

  // Standalone output for optimized Docker deployments
  // Creates a standalone build in .next/standalone with minimal dependencies
  output: 'standalone',

  // Turbopack activé par défaut en Next.js 16
  // La config webpack ci-dessous (fs: false) est gérée automatiquement par Turbopack
  turbopack: {},

  // Configuration SASS (supportée par Webpack et Turbopack)
  sassOptions: {
    includePaths: [path.join(__dirname, 'src/styles')],
    quietDeps: true,
  },

  // Configuration des images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.episciences.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api-preprod.episciences.org',
        pathname: '/**',
      },
    ],
    minimumCacheTTL: 5184000, // 60 days
    dangerouslyAllowSVG: false,
  },

  async rewrites() {
    // Default to preprod if API_PROXY_TARGET is not set in .env
    const apiTarget = process.env.API_PROXY_TARGET || 'https://api-preprod.episciences.org/api';
    console.log(`[Next.js] Proxying /api-proxy to: ${apiTarget}`);

    return [
      {
        source: '/api-proxy/:path*',
        destination: `${apiTarget}/:path*`,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
