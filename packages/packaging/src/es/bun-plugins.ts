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

export type PrismaClientEngine = 'query-engine' | 'query-compiler' | 'no-engine';

/** One token of a JavaScript object literal: whitespace, a string in any quotes, a word, a number or punctuation. */
const OBJECT_LITERAL_TOKEN =
  /\s+|"(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'|`(?:[^`\\]|\\[\s\S])*`|[A-Za-z_$][\w$]*|-?\d[\w.+-]*|[{}[\]:,]/y;

/**
 * The `config` object a generated client's `index.js` builds, as data. Keys may be quoted in either quote or bare, and
 * any whitespace or trailing comma is accepted, so a client that a tool such as Bun's transpiler reformatted reads the
 * same. A string with an escape reads as empty: the configuration's keys and engine names have none, and the inlined
 * schema, the one value that can spell out `engineType`, always has one.
 */
const readPrismaClientConfig = (indexSource: string): Record<string, unknown> | undefined => {
  const start = indexSource.match(/\bconfig\s*=\s*(?=\{)/);
  if (start?.index === undefined) return undefined;
  const json: string[] = [];
  let depth = 0;
  OBJECT_LITERAL_TOKEN.lastIndex = start.index + start[0].length;
  for (let match = OBJECT_LITERAL_TOKEN.exec(indexSource); match; match = OBJECT_LITERAL_TOKEN.exec(indexSource)) {
    const [token] = match;
    if (/^\s/.test(token)) continue;
    if (/^["'`]/.test(token)) {
      const content = token.slice(1, -1);
      json.push(JSON.stringify(content.includes('\\') ? '' : content));
    } else if (/^[A-Za-z_$]/.test(token)) {
      json.push(['true', 'false', 'null'].includes(token) ? token : JSON.stringify(token));
    } else if (token === '}' || token === ']') {
      if (json.at(-1) === ',') json.pop();
      json.push(token);
      depth--;
      if (depth === 0) break;
    } else {
      if (token === '{' || token === '[') depth++;
      json.push(token);
    }
  }
  if (depth !== 0) return undefined;
  try {
    const config: unknown = JSON.parse(json.join(''));
    return isRecord(config) ? config : undefined;
  } catch {
    return undefined;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * What a generated `prisma-client-js` client (Prisma 5 and 6) needs at run time. `createPrismaLambdaClientPlugin`
 * rewrites by this decision and `resolvePrisma` copies by it, so the bundle never looks for files packaging left out.
 *
 * - `query-engine`: the library or binary query engine, found beside `schema.prisma`;
 * - `query-compiler`: `engineType = "client"`, whose `query_compiler_bg.wasm` stays under the generator output;
 * - `no-engine`: a client for Prisma Accelerate, which loads nothing from disk.
 *
 * The configuration in `index.js` records `generator.config.engineType` (every version since 5.0) and `copyEngine`
 * (5.2 and later; `false` after `prisma generate --no-engine`). Without a readable configuration, the client's own code
 * decides: a query compiler loads `query_compiler_bg`, and a query engine client names its engine files for bundlers.
 * The files in the client's directory never decide: regenerating with another engine type leaves the old engine there.
 *
 * `undefined` when the source is no generated client Stacktape recognizes.
 */
export const getPrismaClientEngine = (indexSource: string): PrismaClientEngine | undefined => {
  const config = readPrismaClientConfig(indexSource);
  const generator = isRecord(config?.generator) ? config.generator : undefined;
  const engineType = isRecord(generator?.config) ? generator.config.engineType : undefined;
  if (typeof engineType === 'string') {
    if (engineType === 'client') return 'query-compiler';
    return config?.copyEngine === false ? 'no-engine' : 'query-engine';
  }
  if (/\bquery_compiler_bg\.(?:js|wasm)\b/.test(indexSource)) return 'query-compiler';
  if (/\b(?:libquery_engine|query-engine|query_engine)-[\w.-]+/.test(indexSource)) return 'query-engine';
  return undefined;
};

/**
 * Prisma's generated client (`prisma-client-js`, Prisma 5 and 6) looks for its engine beside `schema.prisma`: in its
 * own directory, or, when bundled code finds no schema there, in a directory relative to the working directory. That
 * name comes from where `prisma generate` ran and can lead outside the artifact, and a split build can put the client
 * in a layer chunk under `/opt`, so for a Lambda it points at {@link PRISMA_LAMBDA_CLIENT_DIRECTORY}. The engine works
 * from the function and from a layer alike.
 *
 * Prisma 5.0.0 assigns that one directory; later versions try each of their `alternativePaths`. A client generated with
 * a query engine and neither shape fails the build, because it would deploy and then find no schema. Only a client
 * whose configuration names a query engine ({@link getPrismaClientEngine}) is rewritten, the same decision
 * `resolvePrisma` copies the engine by. The query compiler is left alone: it finds its `query_compiler_bg.wasm` where
 * the build copied it, under the generator output. A client whose engine cannot be told fails the build too.
 */
export const createPrismaLambdaClientPlugin = (): BunPlugin => ({
  name: 'stacktape-prisma-lambda-client',
  setup(build) {
    build.onLoad({ filter: /[\\/]index\.js$/ }, async ({ path }) => {
      const clientDirectory = dirname(path);
      if (!existsSync(join(clientDirectory, 'schema.prisma'))) return undefined;
      const source = await readFile(path, 'utf8');
      const engine = getPrismaClientEngine(source);
      const version = source.match(/["']?clientVersion["']?\s*:\s*["']([^"']+)["']/)?.[1];
      const description = `The Prisma client generated in ${clientDirectory} (${version ? `Prisma ${version}` : 'unknown Prisma version'})`;
      // Every generated client records its version; a file of the project's own beside a schema does not.
      if (engine === undefined && !/\bclientVersion\b/.test(source)) return undefined;
      if (engine === undefined) {
        throw new Error(
          `${description} does not record which engine it uses in a form Stacktape reads, so Stacktape cannot tell which files the Lambda needs. ` +
            'Regenerate it with prisma generate from Prisma 5.0 to 6.19 and bundle the generated files unchanged.'
        );
      }
      if (engine !== 'query-engine') return undefined;
      const location = JSON.stringify(PRISMA_LAMBDA_CLIENT_DIRECTORY);
      const contents = source
        .replace(
          /(const alternativePaths = \[)([^\]]*)\]/,
          (_match, opening, paths: string) => `${opening}${paths.replace(/"(?:[^"\\]|\\.)*"/g, location)}]`
        )
        .replace(
          /(config\.dirname = path\.join\(process\.cwd\(\), )"(?:[^"\\]|\\.)*"\)/,
          (_match, opening) => `${opening}${location})`
        );
      if (contents === source) {
        throw new Error(
          `${description} looks for its query engine in a way Stacktape cannot redirect, so the Lambda would deploy and then fail to find schema.prisma. ` +
            'Use Prisma 5.0 to 6.19, or generate the client with engineType = "client" and a driver adapter, which needs no query engine.'
        );
      }
      return { contents, loader: 'js' };
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
