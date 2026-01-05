/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,

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
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'https://api-preprod.episciences.org/api/:path*',
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