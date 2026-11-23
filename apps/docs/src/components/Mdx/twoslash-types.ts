import { knownLibFilesForCompilerOptions } from '@typescript/vfs';
import ts from 'typescript';

/**
 * The virtual filesystem the documentation's in-browser Twoslash type-checks against.
 *
 * Everything it needs is served from this site's own origin: the `stacktape` declarations this
 * checkout would publish (`/stacktape`, see `src/build/generated-runtime-assets.ts`) and the
 * standard library of the workspace's own TypeScript (`/ts-lib`). There is deliberately no
 * automatic type acquisition and no CDN fallback, so a sample can only ever describe the types in
 * this repository.
 *
 * Resolution is genuine, not suppressed. `createTwoslasher({ fsMap })` roots the virtual filesystem
 * at `/`, so TypeScript's node resolution from `/index.ts` looks under `/node_modules` — the paths
 * below have to match that exactly. Production renders with `noErrorValidation: true` purely so a
 * reader never sees a red block; `tests/twoslash-types.test.ts` re-runs the same loader with error
 * validation ON, which is what actually proves the imports resolve.
 */

export const STACKTAPE_TYPES_ROUTE = '/stacktape';
export const TS_LIB_ROUTE = '/ts-lib';

/** Declaration files that make up the virtual `stacktape` package. */
export const STACKTAPE_DECLARATION_FILES = ['index.d.ts', 'types.d.ts', 'plain.d.ts', 'cloudformation.d.ts'] as const;

export const TWOSLASH_COMPILER_OPTIONS: ts.CompilerOptions = {
  lib: ['esnext', 'dom'],
  // Stated rather than inherited from a TypeScript default: this is what makes `import ... from
  // 'stacktape'` search `/node_modules` and honour the package's `exports` subpaths.
  moduleResolution: ts.ModuleResolutionKind.Bundler
};

/**
 * Standard-library declarations that `TWOSLASH_COMPILER_OPTIONS` may need. Both sides of the wire
 * derive their list from this one function, so the served files and the requested files cannot
 * drift. It is a candidate list: upstream includes names that no single TypeScript release ships,
 * so the build copies the ones that exist and the loader skips the ones that are not served.
 */
export const twoslashLibFileNames = (): string[] =>
  [...new Set(knownLibFilesForCompilerOptions(TWOSLASH_COMPILER_OPTIONS, ts))].toSorted();

/** Where TypeScript looks for the package, given the `/` virtual-filesystem root. */
const PACKAGE_ROOT = '/node_modules/stacktape';

const fetchText = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url} (${response.status})`);
  return response.text();
};

const fetchOptionalText = async (url: string) => {
  const response = await fetch(url);
  return response.ok ? response.text() : null;
};

/** Fetch the declarations and standard library, and assemble Twoslash's virtual filesystem. */
export const loadTwoslashFsMap = async (): Promise<Map<string, string>> => {
  const [declarations, libs] = await Promise.all([
    Promise.all(
      STACKTAPE_DECLARATION_FILES.map(
        async (name) => [name, await fetchText(`${STACKTAPE_TYPES_ROUTE}/${name}`)] as const
      )
    ),
    Promise.all(
      twoslashLibFileNames().map(async (name) => [name, await fetchOptionalText(`${TS_LIB_ROUTE}/${name}`)] as const)
    )
  ]);

  const fsMap = new Map<string, string>();
  // `@typescript/vfs` expects the standard library at `/lib.*.d.ts`.
  for (const [name, contents] of libs) {
    if (contents !== null) fsMap.set(`/${name}`, contents);
  }
  for (const [name, contents] of declarations) fsMap.set(`${PACKAGE_ROOT}/${name}`, contents);

  fsMap.set(
    `${PACKAGE_ROOT}/package.json`,
    JSON.stringify({
      name: 'stacktape',
      version: '0.0.0-docs',
      types: './index.d.ts',
      exports: {
        '.': './index.d.ts',
        './types': './types.d.ts',
        './plain': './plain.d.ts',
        './cloudformation': './cloudformation.d.ts'
      }
    })
  );

  return fsMap;
};
