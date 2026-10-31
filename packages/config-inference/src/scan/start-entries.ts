/**
 * The source files a JavaScript service's own start commands run, and the project modules each of them reaches.
 *
 * A file that calls `.listen(` proves a server only when the process runs it: a React hook (`history.listen()`), a
 * gateway helper or an end-to-end test server sits in the same package but in no process. The package's start script,
 * Procfile, Dockerfile command and framework conventions say what runs; a compiled path such as `dist/main.js` is read
 * back to its source through the build's output directory.
 */

import { posix } from 'node:path';
import { readText, type ProbeContext } from './probe';
import { maskFile } from './lexical';

/** Where a start file came from, strongest first: the order a service's entry is chosen in. */
export type StartEntryOrigin =
  | 'procfile'
  | 'dockerfile'
  | 'start-script'
  | 'production-script'
  | 'worker-script'
  | 'nest-convention'
  | 'npm-default'
  | 'main'
  | 'bin';

export type StartEntry = {
  /** Repository-relative source file. */
  file: string;
  origin: StartEntryOrigin;
  /** The Procfile process or script name, when it names a background process. */
  processName?: string;
};

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs', '.jsx'];
const MODULE_EXTENSIONS = ['', ...SOURCE_EXTENSIONS, ...SOURCE_EXTENSIONS.map((extension) => `/index${extension}`)];
/** Directories a build writes compiled JavaScript to. */
const OUTPUT_DIRECTORIES = new Set(['dist', 'build', 'out', 'lib', 'output', '.output', 'compiled']);
/** Flags of `node` and its wrappers that take the next word as their value. */
const VALUE_FLAGS = new Set([
  '-e',
  '--eval',
  '-p',
  '--print',
  '-r',
  '--require',
  '--import',
  '--loader',
  '--experimental-loader',
  '-i',
  '--env-file'
]);
/** Runners whose first non-flag word is the file they run. */
const FILE_RUNNER =
  /^(?:node|nodemon|ts-node|ts-node-dev|tsx|bun|babel-node|esno|esr|node-dev|deno\s+run|pm2-runtime\s+start|pm2\s+start|forever\s+start)(?:\s+(.*))?$/;
/** `npm run x`, `npm start`, `yarn x`, `pnpm x`, `pnpm run x`, `bun run x`: another script of the same package. */
const SCRIPT_REFERENCE = /^(?:npm|pnpm|yarn|bun)\s+(?:run(?:-script)?\s+)?([\w:.-]+)(?:\s|$)/;
const PACKAGE_MANAGER_COMMANDS = new Set(['install', 'add', 'exec', 'dlx', 'x', 'ci', 'run', 'test', 'build']);

const join = (root: string, path: string): string =>
  posix.normalize(root === '.' ? path : posix.join(root, path)).replace(/^\.\//, '');

const stripComments = (raw: string): string => {
  let out = '';
  let inString = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]!;
    if (inString) {
      out += char;
      if (char === '\\') {
        out += raw[index + 1] ?? '';
        index += 1;
      } else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
      out += char;
    } else if (char === '/' && raw[index + 1] === '/') {
      while (index < raw.length && raw[index] !== '\n') index += 1;
      out += '\n';
    } else if (char === '/' && raw[index + 1] === '*') {
      index = raw.indexOf('*/', index + 2);
      if (index === -1) break;
      index += 1;
    } else out += char;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
};

const parseJson = (raw: string | undefined): Record<string, unknown> | undefined => {
  if (raw === undefined) return undefined;
  try {
    const value: unknown = JSON.parse(stripComments(raw));
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const stringOf = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const recordOf = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

type TsconfigOptions = {
  directory: string;
  outDir: string | undefined;
  rootDir: string | undefined;
  baseUrl: string | undefined;
  paths: Record<string, string[]> | undefined;
};

/**
 * A tsconfig's compiler options with relative `extends` followed, as directories relative to the repository. Package
 * `extends` (`@tsconfig/node20`) are not read: they set no project paths.
 */
const readTsconfig = async (
  context: ProbeContext,
  path: string,
  files: ReadonlySet<string>,
  depth = 0
): Promise<TsconfigOptions | undefined> => {
  if (!files.has(path) || depth > 3) return undefined;
  const parsed = parseJson(await readText(context, path, { fullFile: true }));
  if (parsed === undefined) return undefined;
  const directory = posix.dirname(path);
  const extended = stringOf(parsed.extends);
  const base =
    extended !== undefined && extended.startsWith('.')
      ? await readTsconfig(
          context,
          join(directory, extended.endsWith('.json') ? extended : `${extended}.json`),
          files,
          depth + 1
        )
      : undefined;
  const options = recordOf(parsed.compilerOptions);
  const relative = (value: unknown) => (typeof value === 'string' ? join(directory, value) : undefined);
  const paths = recordOf(options.paths);
  const ownPaths = Object.keys(paths).length === 0 ? undefined : (paths as Record<string, string[]>);
  return {
    directory: ownPaths === undefined && options.baseUrl === undefined ? (base?.directory ?? directory) : directory,
    outDir: relative(options.outDir) ?? base?.outDir,
    rootDir: relative(options.rootDir) ?? base?.rootDir,
    baseUrl: relative(options.baseUrl) ?? base?.baseUrl,
    paths: ownPaths ?? base?.paths
  };
};

/**
 * Resolves the modules a file imports to project files: relative specifiers, and the aliases the nearest tsconfig's
 * `paths` and `baseUrl` declare (`@server/*`, `src/...`).
 */
export const createModuleResolver = (context: ProbeContext) => {
  const files = new Set(context.files);
  const tsconfigs = new Map<string, Promise<TsconfigOptions | undefined>>();
  const nearestTsconfig = (directory: string): Promise<TsconfigOptions | undefined> => {
    const cached = tsconfigs.get(directory);
    if (cached !== undefined) return cached;
    const path = join(directory, 'tsconfig.json');
    const found = files.has(path)
      ? readTsconfig(context, path, files)
      : directory === '.'
        ? Promise.resolve(undefined)
        : nearestTsconfig(posix.dirname(directory));
    tsconfigs.set(directory, found);
    return found;
  };
  const existing = (base: string): string | undefined => {
    const normalized = posix.normalize(base).replace(/^\.\//, '');
    // A TypeScript source imports `./socket.js` for `./socket.ts`.
    const stem = normalized.replace(/\.[cm]?jsx?$/, '');
    return [normalized, stem]
      .flatMap((candidate) => MODULE_EXTENSIONS.map((extension) => `${candidate}${extension}`))
      .find((candidate) => files.has(candidate) && /\.[cm]?[jt]sx?$/.test(candidate));
  };
  const resolve = async (from: string, specifier: string): Promise<string | undefined> => {
    if (specifier.startsWith('.')) return existing(posix.join(posix.dirname(from), specifier));
    if (specifier.startsWith('/') || specifier.startsWith('node:')) return undefined;
    const tsconfig = await nearestTsconfig(posix.dirname(from));
    if (tsconfig === undefined) return undefined;
    const base = tsconfig.baseUrl ?? tsconfig.directory;
    for (const [pattern, targets] of Object.entries(tsconfig.paths ?? {})) {
      const star = pattern.indexOf('*');
      const matched =
        star === -1
          ? specifier === pattern
            ? ''
            : undefined
          : specifier.startsWith(pattern.slice(0, star)) && specifier.endsWith(pattern.slice(star + 1))
            ? specifier.slice(star, specifier.length - (pattern.length - star - 1))
            : undefined;
      if (matched === undefined || !Array.isArray(targets)) continue;
      for (const target of targets) {
        if (typeof target !== 'string') continue;
        const found = existing(join(base, target.replace('*', matched)));
        if (found !== undefined) return found;
      }
    }
    return tsconfig.baseUrl === undefined ? undefined : existing(join(tsconfig.baseUrl, specifier));
  };
  return { resolve, nearestTsconfig, existing };
};

export type ModuleResolver = ReturnType<typeof createModuleResolver>;

/** Every module a file names: `import ... from`, `export ... from`, `import('...')`, `require('...')`. */
const MODULE_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"\n]+)['"]/g;

/**
 * The project files reachable from `entry` through imports, in breadth-first order (`entry` first), so the first
 * listener found is the one closest to what the start command runs.
 */
export const reachableFrom = async (
  entry: string,
  context: ProbeContext,
  resolver: ModuleResolver,
  importsCache: Map<string, Promise<string[]>>
): Promise<string[]> => {
  const importsOf = (path: string): Promise<string[]> => {
    const cached = importsCache.get(path);
    if (cached !== undefined) return cached;
    const found = (async () => {
      const raw = await readText(context, path, { fullFile: true });
      if (raw === undefined) return [];
      const targets = await Promise.all(
        [...maskFile(path, raw, 'keep').matchAll(MODULE_SPECIFIER)].map((match) => resolver.resolve(path, match[1]!))
      );
      return targets.filter((target): target is string => target !== undefined);
    })();
    importsCache.set(path, found);
    return found;
  };
  const order = [entry];
  const seen = new Set(order);
  for (let index = 0; index < order.length; index += 1) {
    // oxlint-disable-next-line no-await-in-loop -- breadth-first order decides which listener is closest.
    for (const target of await importsOf(order[index]!)) {
      if (!seen.has(target)) {
        seen.add(target);
        order.push(target);
      }
    }
  }
  return order;
};

/** The words of a command after environment assignments and `cross-env`/`dotenv --` wrappers. */
const commandWords = (segment: string): string[] => {
  const words = segment.trim().split(/\s+/).filter(Boolean);
  while (words.length > 0) {
    const first = words[0]!;
    if (/^[A-Z_][A-Z0-9_]*=/.test(first) || first === 'cross-env' || first === 'env') words.shift();
    else if ((first === 'dotenv' || first === 'env-cmd') && words.includes('--'))
      words.splice(0, words.indexOf('--') + 1);
    else break;
  }
  return words;
};

/** The file a runner command names (`node --enable-source-maps dist/main.mjs` names `dist/main.mjs`). */
const runnerFile = (words: readonly string[]): string | undefined => {
  const match = FILE_RUNNER.exec(words.join(' '));
  if (match === null) return undefined;
  const rest = (match[1] ?? '').split(/\s+/).filter(Boolean);
  for (let index = 0; index < rest.length; index += 1) {
    const word = rest[index]!;
    if (word.startsWith('-')) {
      if (VALUE_FLAGS.has(word)) index += 1;
      continue;
    }
    // `tsx watch src/index.ts`, `bun run src/index.ts`.
    if (word === 'watch' || word === 'run') continue;
    if (word === '.' || word === './') return '';
    return /^[\w./@-]+$/.test(word) && !word.includes('node_modules') ? word.replace(/^\.\//, '') : undefined;
  }
  return undefined;
};

type Manifest = { scripts: Record<string, string>; raw: Record<string, unknown> };

/**
 * The files one command runs, relative to the package: runner commands, references to the package's other scripts,
 * and `nest start`. Shell chains are split; each part may run a file.
 */
const filesOfCommand = (
  command: string,
  manifest: Manifest | undefined,
  nestEntry: string | undefined,
  depth = 0
): string[] => {
  if (depth > 3) return [];
  return command.split(/&&|\|\||;/).flatMap((segment): string[] => {
    const words = commandWords(
      segment.replace(/^\s*exec\s+/, '').replace(/^\s*(?:sh|bash)\s+-c\s+["']?|["']\s*$/g, '')
    );
    const file = runnerFile(words);
    // `node .` runs the package's `main`.
    if (file === '.' || file === '') return [stringOf(manifest?.raw.main) ?? 'index.js'];
    if (file !== undefined) return [file];
    if (words[0] === 'nest' && words[1] === 'start') return nestEntry === undefined ? [] : [nestEntry];
    const reference = SCRIPT_REFERENCE.exec(words.join(' '));
    // `npm run --prefix server start` runs another package.
    if (reference === null || words.some((word) => word.startsWith('--prefix') || word === '--filter')) return [];
    const name = reference[1]!;
    if (PACKAGE_MANAGER_COMMANDS.has(name) && manifest?.scripts[name] === undefined) return [];
    const script = manifest?.scripts[name];
    return script === undefined ? [] : filesOfCommand(script, manifest, nestEntry, depth + 1);
  });
};

/** The last `CMD`/`ENTRYPOINT` of a Dockerfile as a shell command (exec form joined with spaces). */
const dockerfileCommand = (raw: string): string | undefined => {
  const lines = raw.replace(/\\\r?\n/g, ' ').split(/\r?\n/);
  const instruction = lines.findLast((line) => /^\s*(?:CMD|ENTRYPOINT)\s/i.test(line));
  if (instruction === undefined) return undefined;
  const value = instruction.replace(/^\s*(?:CMD|ENTRYPOINT)\s+/i, '').trim();
  if (!value.startsWith('[')) return value;
  try {
    const parts: unknown = JSON.parse(value);
    return Array.isArray(parts) && parts.every((part) => typeof part === 'string') ? parts.join(' ') : undefined;
  } catch {
    return undefined;
  }
};

const WORKER_SCRIPT = /(?:^|:)(?:worker|workers|queue|queue-worker|consumer|jobs?)(?::prod(?:uction)?)?$/i;

/**
 * The start files of the JavaScript package at `root`, strongest first. Compiled paths are read back to their source
 * (`dist/main.js` to `src/main.ts`) through the tsconfig `outDir`/`rootDir`, or a conventional output directory; a path
 * with no source in the repository is left out rather than guessed.
 */
export const startEntriesOf = async (
  root: string,
  context: ProbeContext,
  resolver: ModuleResolver
): Promise<StartEntry[]> => {
  const files = new Set(context.files);
  const manifestRaw = parseJson(
    files.has(join(root, 'package.json'))
      ? await readText(context, join(root, 'package.json'), { fullFile: true })
      : undefined
  );
  const manifest: Manifest | undefined =
    manifestRaw === undefined
      ? undefined
      : {
          raw: manifestRaw,
          scripts: Object.fromEntries(
            Object.entries(recordOf(manifestRaw.scripts)).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string'
            )
          )
        };
  const nestCli = files.has(join(root, 'nest-cli.json'))
    ? (parseJson(await readText(context, join(root, 'nest-cli.json'), { fullFile: true })) ?? {})
    : undefined;
  const nestEntry =
    nestCli === undefined
      ? undefined
      : `${stringOf(nestCli.sourceRoot) ?? 'src'}/${stringOf(nestCli.entryFile) ?? 'main'}.ts`;

  const tsconfigs = (
    await Promise.all(
      ['tsconfig.build.json', 'tsconfig.json'].map((name) => readTsconfig(context, join(root, name), files))
    )
  ).filter((entry): entry is TsconfigOptions => entry !== undefined);
  /** The source a package-relative path runs from, when the repository holds it. */
  const toSource = (file: string): string | undefined => {
    // A process manager's configuration (`pm2-runtime start ecosystem.config.js`) names no application file.
    if (/(?:^|\/)(?:ecosystem|[\w-]+\.config)\.[cm]?js$/.test(file)) return undefined;
    const path = join(root, file);
    const compiled: string[] = [];
    for (const tsconfig of tsconfigs) {
      if (tsconfig.outDir !== undefined && path.startsWith(`${tsconfig.outDir}/`)) {
        compiled.push(join(tsconfig.rootDir ?? tsconfig.directory, path.slice(tsconfig.outDir.length + 1)));
      }
    }
    const [first, ...rest] = posix.normalize(file).split('/');
    if (first !== undefined && OUTPUT_DIRECTORIES.has(first) && rest.length > 0) {
      compiled.push(join(root, rest.join('/')), join(root, `src/${rest.join('/')}`));
    }
    // The source of a compiled path comes first; the path itself only when it is a source (`lib/` often is).
    for (const base of [...compiled, path]) {
      const found = resolver.existing(base);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  const entries: StartEntry[] = [];
  const add = (origin: StartEntryOrigin, commandFiles: readonly string[], processName?: string) => {
    for (const file of commandFiles) {
      const source = toSource(file);
      if (source !== undefined && !entries.some((entry) => entry.file === source && entry.origin === origin)) {
        entries.push({ file: source, origin, ...(processName === undefined ? {} : { processName }) });
      }
    }
  };

  const procfile = join(root, 'Procfile');
  if (files.has(procfile)) {
    for (const line of ((await readText(context, procfile, { fullFile: true })) ?? '').split(/\r?\n/)) {
      const match = /^([\w-]+)\s*:\s*(.+)$/.exec(line.trim());
      if (match === null || match[1] === 'release') continue;
      add('procfile', filesOfCommand(match[2]!, manifest, nestEntry), match[1] === 'web' ? undefined : match[1]);
    }
  }
  const dockerfile = join(root, 'Dockerfile');
  if (files.has(dockerfile)) {
    const command = dockerfileCommand((await readText(context, dockerfile, { fullFile: true })) ?? '');
    if (command !== undefined) add('dockerfile', filesOfCommand(command, manifest, nestEntry));
  }
  if (manifest !== undefined) {
    const { scripts } = manifest;
    if (scripts.start !== undefined) add('start-script', filesOfCommand(scripts.start, manifest, nestEntry));
    for (const name of ['start:prod', 'start:production', 'prod']) {
      if (scripts[name] !== undefined) add('production-script', filesOfCommand(scripts[name], manifest, nestEntry));
    }
    for (const [name, script] of Object.entries(scripts)) {
      if (WORKER_SCRIPT.test(name)) add('worker-script', filesOfCommand(script, manifest, nestEntry), name);
    }
    // NestJS builds `sourceRoot/entryFile` and `nest start` runs it.
    if (nestEntry !== undefined) add('nest-convention', [nestEntry]);
    // Without a start script, `npm start` runs `node server.js`.
    if (scripts.start === undefined) add('npm-default', ['server.js']);
    const main = stringOf(manifest.raw.main);
    if (main !== undefined) add('main', [main]);
    const bin = manifest.raw.bin;
    add(
      'bin',
      typeof bin === 'string' ? [bin] : Object.values(recordOf(bin)).filter((value) => typeof value === 'string')
    );
  }
  return entries;
};
