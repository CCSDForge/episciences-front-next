/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  
  // Configuration des images
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
    
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
    };

    // Configuration SASS
    const rules = config.module.rules;
    const sassRule = rules.find(
      (rule) => rule.test && rule.test.toString().includes('scss')
    );

    if (sassRule) {
      sassRule.use = sassRule.use.map((loader) => {
        if (loader.loader && loader.loader.includes('sass-loader')) {
          return {
            ...loader,
            options: {
              ...loader.options,
              sassOptions: {
                includePaths: [path.join(__dirname, 'src/styles')],
                quietDeps: true,
              },
            }
          };
        }
        return loader;
      });
    }

    // Traiter les SVG comme des fichiers statiques
    config.module.rules.push({
      test: /\.svg$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/icons/[name][ext]'
      }
    });

    return config;
  },
};

module.exports = nextConfig;