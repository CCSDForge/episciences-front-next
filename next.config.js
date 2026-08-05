/** @type {import('next').NextConfig} */
const path = require('path');
const { execSync } = require('child_process');

function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    return { branch, commit };
  } catch {
    return { branch: 'unknown', commit: 'unknown' };
  }
}

const { branch: GIT_BRANCH, commit: GIT_COMMIT } = getGitInfo();

const nextConfig = {
  reactStrictMode: true,

  // Do not advertise the framework in response headers
  poweredByHeader: false,

  // Deterministic build ID (git commit) instead of Next's random per-build hash.
  // The Ansistrano preprod/prod pipeline builds independently and in parallel on
  // each server (see deployment/ansible/deploy.yml) — a random BUILD_ID would make
  // every server's build ID diverge, and the Valkey cache handler treats any
  // __buildId mismatch as stale (src/lib/cache-handler.js), causing the servers to
  // continuously invalidate each other's cache entries even for identical code.
  //
  // NEXT_BUILD_GIT_SHA is set by deployment/ansible/tasks/build.yml from the
  // Ansistrano repo cache (which has .git); GIT_COMMIT (execSync above) is the
  // fallback for local dev, where .git is present in the working directory but
  // NOT in an Ansistrano release directory (export strategy strips it there).
  generateBuildId: async () => process.env.NEXT_BUILD_GIT_SHA || GIT_COMMIT,

  env: {
    NEXT_GIT_BRANCH: GIT_BRANCH,
    NEXT_GIT_COMMIT: GIT_COMMIT,
  },

  // Required when running behind a reverse proxy (HAProxy → Nginx → Node.js).
  //
  // trustHostHeader: true  → resolve-routes.js builds initUrl from the Host header
  //                          (e.g. https://epijinfo.episciences.org/) instead of
  //                          the server's internal address (https://localhost:3000/).
  //
  // skipProxyUrlNormalize: true → runMiddleware() uses the same initUrl stored in
  //                          request metadata instead of re-building it from
  //                          fetchHostname. Without this the two URLs have different
  //                          origins, getRelativeURL() cannot relativize the rewrite
  //                          destination, and Next.js falls back to an external
  //                          HTTPS proxy to localhost:3000 → EPROTO.
  trustHostHeader: true,
  skipProxyUrlNormalize: true,

  // Distributed cache handler (Valkey/ioredis)
  // Activated only when VALKEY_ENABLED=true for backward compatibility and local dev without Valkey
  ...(process.env.VALKEY_ENABLED === 'true' && {
    cacheHandler: require.resolve('./src/lib/cache-handler.js'),
    // Disable Next.js built-in in-memory cache (our handler manages it)
    cacheMaxMemorySize: 0,
  }),

  // Standalone output for optimized Docker deployments
  // Creates a standalone build in .next/standalone with minimal dependencies
  output: 'standalone',

  // fs.readFile paths are not traced statically — include locales explicitly
  outputFileTracingIncludes: {
    '/*': ['public/locales/**/*.json'],
  },

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
      {
        protocol: 'https',
        hostname: '*.episciences.org',
        pathname: '/**',
      },
    ],
    minimumCacheTTL: 5184000, // 60 days
    dangerouslyAllowSVG: false,
  },

  async rewrites() {
    // Local-dev CORS escape hatch only (see docs/LOCAL_TESTING_GUIDE.md).
    // Opt-in via API_PROXY_TARGET: never enabled by default, as this is an
    // unauthenticated, un-rate-limited pass-through to the target API.
    if (!process.env.API_PROXY_TARGET) {
      return [];
    }
    console.log(`[Next.js] Proxying /api-proxy to: ${process.env.API_PROXY_TARGET}`);
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${process.env.API_PROXY_TARGET}/:path*`,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        // X-Frame-Options must NOT apply to API routes: the pdf-proxy serves PDFs inside iframes
        // and Chrome's internal PDF renderer misinterprets SAMEORIGIN against its own internal
        // origin (chrome-extension://...), causing "This content is blocked." intermittently.
        source: '/((?!api/).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
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
