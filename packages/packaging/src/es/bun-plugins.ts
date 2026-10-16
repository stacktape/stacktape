/**
 * Bun plugins both ES bundlers install, and the guard their own resolvers share.
 *
 * A plugin here is the same for a per-Lambda build and a split build: neither the artifact's shape
 * nor the number of entrypoints changes what it does. Keeping one copy means a fix to the shim or
 * the loader reaches every artifact Stacktape builds.
 */
import type { BunPlugin } from 'bun';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';

/**
 * Whether a specifier names a package rather than a file.
 *
 * Both resolvers run on a `^[^.]` filter, which still admits absolute paths and POSIX roots, so
 * each one drops those before looking anything up. A subpath import (`#name`) is not a package
 * either: it names a file of the importing package through that package's `imports` map, which
 * Bun's own resolver follows. Prisma 6's generated client loads itself this way.
 */
export const isBareImportSpecifier = (specifier: string): boolean =>
  !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('#') && !isAbsolute(specifier);

/**
 * `.node` addons stay external: they are copied next to the artifact and loaded by the runtime,
 * not read by the bundler.
 */
export const createNativeNodeModulesPlugin = (): BunPlugin => ({
  name: 'native-node-modules',
  setup(build) {
    build.onResolve({ filter: /\.node$/ }, (args) => ({ path: args.path, external: true }));
  }
});

/**
 * Where a Lambda carries Prisma's query engine and the generated `schema.prisma`, relative to `/var/task`, the
 * function's working directory.
 */
export const PRISMA_LAMBDA_CLIENT_DIRECTORY = '.prisma/client';

/**
 * Prisma's generated client (`prisma-client-js`, Prisma 5 and 6) looks for its engine beside `schema.prisma`: in its
 * own directory, or, when bundled code finds no schema there, in the directories its `alternativePaths` name relative
 * to the working directory. Those names come from where `prisma generate` ran and can lead outside the artifact, and a
 * split build can put the client in a layer chunk under `/opt`, so for a Lambda both point at
 * {@link PRISMA_LAMBDA_CLIENT_DIRECTORY}. The engine works from the function and from a layer alike.
 */
export const createPrismaLambdaClientPlugin = (): BunPlugin => ({
  name: 'stacktape-prisma-lambda-client',
  setup(build) {
    build.onLoad({ filter: /[\\/]index\.js$/ }, async ({ path }) => {
      if (!existsSync(join(dirname(path), 'schema.prisma'))) return undefined;
      const source = await readFile(path, 'utf8');
      const contents = source.replace(/(const alternativePaths = \[)([^\]]*)\]/, (_match, opening, paths: string) => {
        const location = JSON.stringify(PRISMA_LAMBDA_CLIENT_DIRECTORY);
        return `${opening}${paths.replace(/"(?:[^"\\]|\\.)*"/g, location)}]`;
      });
      return contents === source ? undefined : { contents, loader: 'js' };
    });
  }
});

/**
 * `bun:ffi` has no Node equivalent. A dependency that reaches for it would otherwise fail the
 * build; this lets the artifact build and fail at the call, naming the export that was attempted.
 */
export const createBunFfiShimPlugin = (): BunPlugin => ({
  name: 'stacktape-bun-ffi-shim',
  setup(build) {
    build.onResolve({ filter: /^bun:ffi$/ }, () => ({ path: 'bun:ffi', namespace: 'stacktape-bun-ffi-shim' }));

    build.onLoad({ filter: /^bun:ffi$/, namespace: 'stacktape-bun-ffi-shim' }, () => ({
      loader: 'js',
      contents: [
        'const fail = (name) => () => {',
        '  throw new Error("Unsupported Bun module bun:ffi in Node runtime (attempted export: " + name + ").");',
        '};',
        "export const dlopen = fail('dlopen');",
        "export const toArrayBuffer = fail('toArrayBuffer');",
        "export const JSCallback = class { constructor() { fail('JSCallback')(); } };",
        "export const ptr = fail('ptr');"
      ].join('\n')
    }));
  }
});
