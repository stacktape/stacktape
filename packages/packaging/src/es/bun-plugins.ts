/**
 * Bun plugins both ES bundlers install, and the guard their own resolvers share.
 *
 * A plugin here is the same for a per-Lambda build and a split build: neither the artifact's shape
 * nor the number of entrypoints changes what it does. Keeping one copy means a fix to the shim or
 * the loader reaches every artifact Stacktape builds.
 */
import type { BunPlugin } from 'bun';
import { isAbsolute } from 'node:path';

/**
 * Whether a specifier names a package rather than a file.
 *
 * Both resolvers run on a `^[^.]` filter, which still admits absolute paths and POSIX roots, so
 * each one drops those before looking anything up.
 */
export const isBareImportSpecifier = (specifier: string): boolean =>
  !specifier.startsWith('.') && !specifier.startsWith('/') && !isAbsolute(specifier);

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
