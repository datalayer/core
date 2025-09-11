/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Browser polyfills path
const browserPolyfillPath = path.join(__dirname, 'browser-polyfill.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Required for Jupyter components
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.datalayer.tech',
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: [
    '@datalayer/core',
    '@datalayer/jupyter-react',
    '@datalayer/primer-addons',
    '@jupyterlab/services',
    '@jupyterlab/coreutils',
    '@jupyterlab/settingregistry',
    '@jupyterlite/settings',
  ],
  webpack: (config, { webpack, isServer }) => {
    // Use the webpack instance provided by Next.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      buffer: false,
      process: false,
      stream: false,
      net: false,
      tls: false,
      child_process: false,
    };

    // Fix json5 import issue
    config.resolve.alias = {
      ...config.resolve.alias,
      json5: 'json5/lib/index.js',
    };

    // Add comprehensive polyfills for server-side rendering
    if (isServer) {
      // Inject polyfills at the beginning of server bundles
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        for (const [key, entry] of Object.entries(entries)) {
          if (key.includes('app/') || key.includes('page')) {
            if (Array.isArray(entry.import)) {
              entry.import.unshift(browserPolyfillPath);
            }
          }
        }
        return entries;
      };
    }

    // Add webpack plugins using Next.js's webpack instance
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
        ...(isServer && {
          navigator: [browserPolyfillPath, 'navigator'],
          document: [browserPolyfillPath, 'document'],
          window: [browserPolyfillPath, 'window'],
          localStorage: [browserPolyfillPath, 'localStorage'],
          sessionStorage: [browserPolyfillPath, 'sessionStorage'],
          Event: [browserPolyfillPath, 'createEvent'],
        }),
      }),
      new webpack.DefinePlugin({
        'process.env.WS_NO_BUFFER_UTIL': JSON.stringify('1'),
        'process.env.WS_NO_UTF_8_VALIDATE': JSON.stringify('1'),
        ...(isServer
          ? {
              'typeof window': JSON.stringify('object'),
              'typeof document': JSON.stringify('object'),
              'typeof navigator': JSON.stringify('object'),
            }
          : {}),
      }),
    );

    // Add module rules for SVG handling
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.(ts|tsx|js|jsx)$/,
      use: ['svg-url-loader'],
    });

    // Add rule for handling Python wheel files (for Pyodide)
    config.module.rules.push({
      test: /\.whl$/,
      type: 'asset/resource',
    });

    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/jupyter/:path*',
        destination: 'https://prod1.datalayer.run/api/jupyter/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
