/**
 * Keeps the project's own shared code and installed packages in separate chunks.
 *
 * Bun puts modules reached by exactly the same entry points into one chunk, so a shared `lib/orders.ts` and the
 * `stripe` it imports usually share a chunk. The shared layer then changes, and must be published again, whenever
 * the project's own shared code changes. An extra entry point that imports what the own code imports from installed
 * packages makes every installed module reachable from one more entry than any own module, so no chunk holds both.
 * The anchor re-exports exactly the names the own code imports, so tree shaking keeps the same code. Its output is
 * discarded.
 */
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import type { BunPlugin } from 'bun';
import type { BuildMetafile } from './types';

/** The anchor's entry point. No file has this name; the plugin below provides the module. */
export const OWN_CODE_ANCHOR_ENTRY = 'stacktape-own-code-anchor';

/** The anchor's emitted file or its source map, or its entry point as the metafile names it. */
export const isOwnCodeAnchorOutput = (path: string) =>
  basename(path).startsWith(`${OWN_CODE_ANCHOR_ENTRY}.`) || path.startsWith(`${OWN_CODE_ANCHOR_ENTRY}:`);

/** Serves the anchor entry point with the given source. */
export const createOwnCodeAnchorPlugin = (source: string): BunPlugin => ({
  name: 'stp-own-code-anchor',
  setup(build) {
    build.onResolve({ filter: new RegExp(`^${OWN_CODE_ANCHOR_ENTRY}$`) }, () => ({
      path: OWN_CODE_ANCHOR_ENTRY,
      namespace: OWN_CODE_ANCHOR_ENTRY
    }));
    build.onLoad({ filter: /.*/, namespace: OWN_CODE_ANCHOR_ENTRY }, () => ({ contents: source, loader: 'js' }));
  }
});

/** An installed package's file, by its path in the metafile. */
export const isInstalledPackagePath = (path: string) => /(?:^|[\\/])node_modules[\\/]/.test(path);

/** A module a plugin provides under its own namespace, such as `stacktape-bun-ffi-shim:bun:ffi`. */
const isVirtualModule = (path: string) => /^[\w-]+:/.test(path) && !/^[a-z]:[\\/]/i.test(path);

/** A source file of the project, rather than an installed package or a plugin's module. */
export const isOwnSourcePath = (path: string) => !isInstalledPackagePath(path) && !isVirtualModule(path);

const LOADERS: Record<string, 'ts' | 'tsx' | 'js' | 'jsx'> = {
  '.ts': 'ts',
  '.mts': 'ts',
  '.cts': 'ts',
  '.tsx': 'tsx',
  '.js': 'js',
  '.mjs': 'js',
  '.cjs': 'js',
  '.jsx': 'jsx'
};
const transpilers = new Map<string, Bun.Transpiler>();

/** The file's code with its types removed, or `undefined` when it is not a script this can read. */
const readScript = async (path: string) => {
  const loader = LOADERS[extname(path)];
  if (!loader) return undefined;
  if (!transpilers.has(loader)) transpilers.set(loader, new Bun.Transpiler({ loader, target: 'node' }));
  try {
    return transpilers.get(loader)!.transformSync(await readFile(path, 'utf8'));
  } catch {
    return undefined;
  }
};

/** `import … from` and `export … from` statements: their keyword, clause and specifier. */
const FROM_STATEMENT = /\b(import|export)\s*([\w$\s,*{}]*?)\s*from\s*["']([^"']+)["']/g;

/**
 * The names a source file imports from each specifier, or `*` when it takes the namespace or the form is not one of
 * the plain ones. Type-only imports are gone after transpiling.
 */
const getImportedNames = (code: string): Map<string, Set<string>> => {
  const names = new Map<string, Set<string>>();
  for (const [, keyword, clause = '', specifier = ''] of code.matchAll(FROM_STATEMENT)) {
    const forSpecifier = names.get(specifier) ?? new Set<string>();
    names.set(specifier, forSpecifier);
    const braces = clause.match(/\{([^}]*)\}/);
    const head = clause
      .replace(/\{[^}]*\}/, '')
      .replaceAll(',', ' ')
      .trim();
    if (clause.includes('*') || (keyword === 'export' && !braces)) {
      forSpecifier.add('*');
      continue;
    }
    if (keyword === 'import' && head) forSpecifier.add('default');
    for (const part of braces?.[1]?.split(',') ?? []) {
      const name = part
        .trim()
        .split(/\s+as\s+/)[0]
        ?.trim();
      if (name && /^[\w$]+$/.test(name)) forSpecifier.add(name);
      else if (name) forSpecifier.add('*');
    }
  }
  return names;
};

/**
 * The source of the anchor entry for a build whose metafile is given, or `undefined` when no own source shares a
 * chunk with an installed package. `resolveInput` turns a metafile path into an absolute path.
 */
export const createOwnCodeAnchorSource = async ({
  metafile,
  resolveInput
}: {
  metafile: BuildMetafile;
  resolveInput: (path: string) => string;
}): Promise<string | undefined> => {
  const mixedChunkInputs = new Set(
    Object.values(metafile.outputs).flatMap(({ inputs, entryPoint }) => {
      const paths = Object.keys(inputs);
      return !entryPoint && paths.some(isOwnSourcePath) && paths.some(isInstalledPackagePath) ? paths : [];
    })
  );
  const ownSources = Object.entries(metafile.inputs).filter(
    ([path]) => mixedChunkInputs.has(path) && isOwnSourcePath(path)
  );
  const reexports = await Promise.all(
    ownSources.map(async ([path, { imports }]) => {
      const packageImports = imports.filter(
        ({ path: imported, kind, external }) =>
          !external && kind === 'import-statement' && isInstalledPackagePath(imported) && !imported.endsWith('.json')
      );
      if (!packageImports.length) return [];
      const code = await readScript(resolveInput(path));
      const importedNames = code === undefined ? new Map<string, Set<string>>() : getImportedNames(code);
      return packageImports.map(({ path: imported, original }) => ({
        target: JSON.stringify(resolveInput(imported)),
        // A form this does not read takes the namespace: the chunks stay separate, the package is less tree-shaken.
        names: (original && importedNames.get(original)) || new Set(['*'])
      }));
    })
  );
  // Every name is exported under a new one, so that two packages' `default` exports cannot collide.
  let index = 0;
  const statements = reexports.flat().flatMap(({ target, names }) => {
    if (names.has('*')) return [`export * as __stp${index++} from ${target};`];
    if (!names.size) return [];
    return [`export { ${[...names].map((name) => `${name} as __stp${index++}`).join(', ')} } from ${target};`];
  });
  return statements.length ? statements.join('\n') : undefined;
};
