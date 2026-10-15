export const FILES_TO_INCLUDE_IN_DIGEST = [
  'pnpm-lock.yaml',
  'yarn.lock',
  'package-lock.json',
  'bun.lockb',
  'bun.lock',
  'deno.lockb',
  'deno.lock',
  'node_modules/.prisma/client/index.js',
  'prisma.schema',
  'prisma.config.ts',
  'tsconfig.json'
];

export const DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE = ['next'];

/** Optional peers that never need installing beside a bundle, even when a native package declares them. */
export const IGNORED_OPTIONAL_PEER_DEPS = ['supports-color', 'debug'];

export const IGNORED_MODULES = [
  '@prisma/cli',
  '@prisma/bar',
  '@prisma/engines',
  '@prisma/engine-versions',
  'pnpapi',
  'fsevents'
];
