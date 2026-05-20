import type { NextConfig } from 'next';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { copySync, existsSync } from 'fs-extra';

// Copy static assets during config load (works for both webpack and turbopack)
const staticSrc = join(process.cwd(), 'docs', 'static');
const staticDest = join(process.cwd(), 'public', 'static');

if (existsSync(staticSrc)) {
  copySync(staticSrc, staticDest);
}

const isDev = process.env.NODE_ENV === 'development';
const stacktapeRepoRoot = join(process.cwd(), '..');
const stacktapeReleasePath = join(stacktapeRepoRoot, '__release-npm');
const stacktapeTypesDest = join(process.cwd(), 'public', 'stacktape');

if (isDev) {
  execFileSync('bun', ['run', 'build:npm:main'], {
    cwd: stacktapeRepoRoot,
    stdio: 'inherit'
  });

  if (existsSync(stacktapeReleasePath)) {
    copySync(stacktapeReleasePath, stacktapeTypesDest, { overwrite: true });
  }
}

const nextConfig: NextConfig = {
  // Static export for production. Disabled in dev so the /generation dashboard and its API
  // routes (which read .state/*.json from disk) can run as a normal Next.js server.
  ...(isDev ? {} : { output: 'export' as const }),
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
    // Pin the workspace root explicitly to the parent stacktape repo so Turbopack stops printing
    // "multiple lockfiles detected" on every dev start. Must be the parent (not docs/) because
    // several MDX components import from ../@generated/* which sits one level above docs/.
    root: stacktapeRepoRoot,
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
