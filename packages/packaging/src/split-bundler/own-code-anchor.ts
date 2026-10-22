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
import { basename } from 'node:path';
import type { BuildMetafile } from './types';

/** The anchor entry's file name, in a directory of the build folder. */
export const OWN_CODE_ANCHOR_FILE_NAME = '__stacktape-own-code-anchor.js';

/** The anchor's emitted file or its source map. */
export const isOwnCodeAnchorOutput = (path: string) => basename(path).startsWith('__stacktape-own-code-anchor.');

/** An installed package's file, by its path in the metafile. */
export const isInstalledPackagePath = (path: string) => /(?:^|[\\/])node_modules[\\/]/.test(path);

/** A module a plugin provides under its own namespace, such as `stacktape-bun-ffi-shim:bun:ffi`. */
const isVirtualModule = (path: string) => /^[\w-]+:/.test(path) && !/^[a-z]:[\\/]/i.test(path);

/** A source file of the project, rather than an installed package or a plugin's module. */
export const isOwnSourcePath = (path: string) => !isInstalledPackagePath(path) && !isVirtualModule(path);

const transpiler = new Bun.Transpiler({ loader: 'tsx', target: 'node' });

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
  const lines = await Promise.all(
    ownSources.map(async ([path, { imports }]) => {
      const packageImports = imports.filter(
        ({ path: imported, kind, external }) =>
          !external && kind === 'import-statement' && isInstalledPackagePath(imported) && !imported.endsWith('.json')
      );
      if (!packageImports.length) return [];
      const importedNames = getImportedNames(transpiler.transformSync(await readFile(resolveInput(path), 'utf8')));
      return packageImports.map(({ path: imported, original }) => {
        const names = (original && importedNames.get(original)) || new Set(['*']);
        const target = JSON.stringify(resolveInput(imported));
        return names.has('*')
          ? `export * as __ from ${target};`
          : `export { ${[...names].join(', ')} } from ${target};`;
      });
    })
  );
  const statements = [...new Set(lines.flat())];
  if (!statements.length) return undefined;
  // Every export needs a unique name.
  let index = 0;
  return statements
    .map((statement) =>
      statement.startsWith('export *')
        ? statement.replace('__', `__stp${index++}`)
        : statement.replace(
            /\{ (.*) \}/,
            (_, list: string) =>
              `{ ${list
                .split(', ')
                .map((name) => `${name} as __stp${index++}`)
                .join(', ')} }`
          )
    )
    .join('\n');
};
