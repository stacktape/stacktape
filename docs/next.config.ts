import type { NextConfig } from 'next';
import { join } from 'node:path';
import { copySync, existsSync } from 'fs-extra';

// Copy static assets during config load (works for both webpack and turbopack)
const staticSrc = join(process.cwd(), 'docs', 'static');
const staticDest = join(process.cwd(), 'public', 'static');

if (existsSync(staticSrc)) {
  copySync(staticSrc, staticDest);
}

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    unoptimized: true
  },
  // Disable caching in development for MDX hot reload
  ...(isDev && {
    onDemandEntries: {
      // period (in ms) where the server will keep pages in the buffer
      maxInactiveAge: 0,
      // number of pages that should be kept simultaneously without being disposed
      pagesBufferLength: 0
    }
  }),
  turbopack: {
    rules: {
      '*.yaml': {
        loaders: [{ loader: 'yaml-loader' }],
        as: '*.js'
      },
      '*.yml': {
        loaders: [{ loader: 'yaml-loader' }],
        as: '*.js'
      }
    }
  },
  experimental: {
    viewTransition: true
  },
  compiler: {
    emotion: {
      // Enable source maps for debugging
      sourceMap: true,
      // Automatically add labels based on variable names (only in development)
      autoLabel: 'always',
      // Customize how labels appear in class names
      labelFormat: '[dirname]_[filename]_[local]'
      // This is important for the css prop
    }
  },
  reactStrictMode: true
};

export default nextConfig;
