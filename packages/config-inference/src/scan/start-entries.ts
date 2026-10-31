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
/** `npm run x`, `npm start`, `yarn x`, `pnpm x`, `pnpm run x`, `bun run x`: another script of the same package. */
const SCRIPT_REFERENCE = /^(?:npm|pnpm|yarn|bun)\s+(?:run(?:-script)?\s+)?([\w:.-]+)(?:\s|$)/;

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

/** The `*` position of a tsconfig `paths` pattern; an exact pattern sorts before every wildcard. */
const prefixLength = (pattern: string): number =>
  pattern.includes('*') ? pattern.indexOf('*') : Number.POSITIVE_INFINITY;

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
  /** The source file a module path names; a directory's `index` only when `directories` allows it. */
  const existing = (base: string, directories = true): string | undefined => {
    const normalized = posix.normalize(base).replace(/^\.\//, '');
    // A TypeScript source imports `./socket.js` for `./socket.ts`.
    const stem = normalized.replace(/\.[cm]?jsx?$/, '');
    return [normalized, stem]
      .flatMap((candidate) =>
        (directories ? MODULE_EXTENSIONS : ['', ...SOURCE_EXTENSIONS]).map((extension) => `${candidate}${extension}`)
      )
      .find((candidate) => files.has(candidate) && /\.[cm]?[jt]sx?$/.test(candidate));
  };
  const resolve = async (from: string, specifier: string): Promise<string | undefined> => {
    if (specifier.startsWith('.')) return existing(posix.join(posix.dirname(from), specifier));
    if (specifier.startsWith('/') || specifier.startsWith('node:')) return undefined;
    const tsconfig = await nearestTsconfig(posix.dirname(from));
    if (tsconfig === undefined) return undefined;
    const base = tsconfig.baseUrl ?? tsconfig.directory;
    // TypeScript tries an exact pattern first, then the wildcard with the longest prefix, whatever the declared order.
    const patterns = Object.entries(tsconfig.paths ?? {}).toSorted(
      ([left], [right]) => prefixLength(right) - prefixLength(left)
    );
    for (const [pattern, targets] of patterns) {
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
/** A module named at run time (`import(file)`, `require(name)`, a template literal): the graph is incomplete. */
const COMPUTED_IMPORT = /\b(?:import|require)\s*\(\s*(?!['"\s)])/;

/**
 * The project files reachable from `entry` through imports, in breadth-first order (`entry` first), so the first
 * listener found is the one closest to what the start command runs. `complete` is false when a reached file loads a
 * module whose name is computed at run time: that module may be anything.
 */
export const reachableFrom = async (
  entry: string,
  context: ProbeContext,
  resolver: ModuleResolver,
  importsCache: Map<string, Promise<{ targets: string[]; computed: boolean }>>
): Promise<{ order: string[]; complete: boolean }> => {
  const importsOf = (path: string): Promise<{ targets: string[]; computed: boolean }> => {
    const cached = importsCache.get(path);
    if (cached !== undefined) return cached;
    const found = (async () => {
      const raw = await readText(context, path, { fullFile: true });
      if (raw === undefined) return { targets: [], computed: false };
      const keep = maskFile(path, raw, 'keep');
      const targets = await Promise.all(
        [...keep.matchAll(MODULE_SPECIFIER)].map((match) => resolver.resolve(path, match[1]!))
      );
      return {
        targets: targets.filter((target): target is string => target !== undefined),
        computed: COMPUTED_IMPORT.test(keep)
      };
    })();
    importsCache.set(path, found);
    return found;
  };
  const order = [entry];
  const seen = new Set(order);
  let complete = true;
  for (let index = 0; index < order.length; index += 1) {
    // oxlint-disable-next-line no-await-in-loop -- breadth-first order decides which listener is closest.
    const { targets, computed } = await importsOf(order[index]!);
    if (computed) complete = false;
    for (const target of targets) {
      if (!seen.has(target)) {
        seen.add(target);
        order.push(target);
      }
    }
  }
  return { order, complete };
};

/** The words of a command after environment assignments and `cross-env`/`dotenv --` wrappers. */
const commandWords = (segment: string): string[] => {
  const words = segment.trim().split(/\s+/).filter(Boolean);
  while (words.length > 0) {
    const first = words[0]!;
    if (/^[A-Z_][A-Z0-9_]*=/.test(first) || first === 'cross-env' || first === 'env' || first === 'exec') words.shift();
    else if ((first === 'dotenv' || first === 'env-cmd') && words.includes('--'))
      words.splice(0, words.indexOf('--') + 1);
    else break;
  }
  return words;
};

/**
 * Runners whose first operand is the file they run: the flags of each that take the next word as their value
 * (`--flag=value` needs no entry), the mode words that come before the file (`tsx watch`, `pm2 start`), and whether
 * `-e`/`-p` runs inline code instead of a file. Flags that load a module first (`-r`, `--import`, `--preload`) name
 * files that run too.
 */
const NODE_FLAGS = [
  '-r',
  '--require',
  '--import',
  '--loader',
  '--experimental-loader',
  '--env-file',
  '-C',
  '--conditions',
  '--title',
  '--inspect-port',
  '--stack-size'
];
type Runner = { command: RegExp; values: ReadonlySet<string>; modes: ReadonlySet<string>; evaluates: boolean };
const RUNNERS: readonly Runner[] = [
  { command: /^node$/, values: new Set(NODE_FLAGS), modes: new Set(), evaluates: true },
  {
    command: /^nodemon$/,
    values: new Set([
      ...NODE_FLAGS,
      '-w',
      '--watch',
      '-e',
      '--ext',
      '-x',
      '--exec',
      '-i',
      '--ignore',
      '-d',
      '--delay',
      '--signal',
      '--config'
    ]),
    modes: new Set(),
    evaluates: false
  },
  {
    command: /^(?:ts-node|ts-node-dev|tsnd)$/,
    values: new Set([
      ...NODE_FLAGS,
      '-P',
      '--project',
      '-O',
      '--compiler-options',
      '--compiler',
      '-I',
      '--ignore',
      '--cwd',
      '--scope-dir',
      '--respawn-delay',
      '--watch',
      '--ignore-watch'
    ]),
    modes: new Set(),
    evaluates: true
  },
  {
    command: /^(?:tsx|esno|esr|babel-node|node-dev)$/,
    values: new Set([...NODE_FLAGS, '--tsconfig', '--include', '--exclude', '--ignore', '--config-file']),
    modes: new Set(['watch']),
    evaluates: true
  },
  {
    command: /^bun$/,
    values: new Set(['-r', '--preload', '--cwd', '-c', '--config', '--env-file', '--tsconfig-override', '--port']),
    modes: new Set(['run']),
    evaluates: true
  },
  {
    command: /^deno$/,
    values: new Set(['-c', '--config', '--import-map', '--env-file', '--location', '--seed', '--v8-flags', '--lock']),
    modes: new Set(['run']),
    evaluates: false
  },
  {
    command: /^(?:pm2|pm2-runtime)$/,
    values: new Set([
      '-n',
      '--name',
      '-i',
      '--instances',
      '--max-memory-restart',
      '--node-args',
      '--interpreter',
      '--interpreter-args',
      '--env',
      '-o',
      '--output',
      '-e',
      '--error',
      '-l',
      '--log',
      '--cwd',
      '--cron',
      '--restart-delay',
      '--max-restarts',
      '--namespace',
      '--kill-timeout'
    ]),
    modes: new Set(['start']),
    evaluates: false
  },
  {
    command: /^forever$/,
    values: new Set(['-l', '-o', '-e', '-c', '-p', '-m', '--uid', '--minUptime', '--spinSleepTime', '--sourceDir']),
    modes: new Set(['start']),
    evaluates: false
  }
];
const EVAL_FLAGS = new Set(['-e', '--eval', '-p', '--print']);
const PRELOAD_FLAGS = new Set(['-r', '--require', '--import', '--preload']);
/** Commands that start a framework's own server, so no project file of the package is its entry. */
const FRAMEWORK_SERVER =
  /^(?:next|nuxt|nuxi|remix-serve|react-router-serve|astro|vite|svelte-kit|gatsby|serve|http-server|docusaurus|ng|react-scripts|strapi|sails|meteor|blitz|rw|redwood|medusa|keystone|payload|directus|vinxi)$/;

type RunnerFiles = { files: string[]; resolved: boolean };

const relativeModule = (value: string | undefined): string | undefined =>
  value !== undefined && /^\.\.?\//.test(value) ? value.replace(/^\.\//, '') : undefined;

/**
 * The files a runner command runs (`node --enable-source-maps dist/main.mjs` runs `dist/main.mjs`), or `undefined` when
 * the command is no runner. `.` names the package itself.
 */
const runnerFiles = (words: readonly string[]): RunnerFiles | undefined => {
  const runner = RUNNERS.find(({ command }) => command.test(words[0] ?? ''));
  if (runner === undefined) return undefined;
  const files: string[] = [];
  let modes = true;
  for (let index = 1; index < words.length; index += 1) {
    const word = words[index]!;
    if (word.startsWith('-')) {
      const [flag, inline] = word.split('=', 2) as [string, string | undefined];
      if (runner.evaluates && EVAL_FLAGS.has(flag)) return { files: [], resolved: false };
      const value = inline ?? (runner.values.has(flag) ? words[index + 1] : undefined);
      if (inline === undefined && runner.values.has(flag)) index += 1;
      const preload = PRELOAD_FLAGS.has(flag) ? relativeModule(value) : undefined;
      if (preload !== undefined) files.push(preload);
      continue;
    }
    if (modes && runner.modes.has(word)) {
      modes = false;
      continue;
    }
    // `bun run start` runs a script, not a file.
    if (words[0] === 'bun' && !/[./]/.test(word)) return undefined;
    if (word === '.' || word === './') return { files: [...files, '.'], resolved: true };
    if (!/^[\w./@-]+$/.test(word) || word.includes('node_modules')) return { files, resolved: false };
    return { files: [...files, word.replace(/^\.\//, '')], resolved: true };
  }
  return { files, resolved: false };
};

type Manifest = { scripts: Record<string, string>; raw: Record<string, unknown> };

/** What a command runs: the package-relative files of its long-running process, and whether all of it was read. */
type CommandFiles = { files: string[]; resolved: boolean };

/**
 * The files one command runs, relative to the package: runner commands, references to the package's other scripts,
 * and `nest start`. In `a && b; c` only the last statement is the process that keeps running; the ones before it
 * finish first (a build, a migration), except `cd`, which moves the rest. `a & b` runs both. Anything else (`sh
 * start.sh`, a process-manager configuration, inline code) leaves the command unresolved.
 */
const filesOfCommand = (
  command: string,
  manifest: Manifest | undefined,
  nestEntry: string | undefined,
  depth = 0
): CommandFiles => {
  if (depth > 3) return { files: [], resolved: false };
  const unwrapped = command.trim().replace(/^(?:\/bin\/)?(?:sh|bash)\s+-c\s+(["']?)([\s\S]*)\1$/, '$2');
  const statements = unwrapped
    .split(/&&|;|\n/)
    .map((statement) => statement.trim())
    .filter(Boolean);
  let directory = '';
  for (const statement of statements.slice(0, -1)) {
    const cd = /^cd\s+(?:\.\/)?([\w./-]+)$/.exec(statement);
    if (cd !== null) directory = posix.join(directory, cd[1]!);
  }
  const last = statements.at(-1);
  if (last === undefined) return { files: [], resolved: false };
  const results = last.split(/\|\||(?<![&>])&(?!&)/).map((part): CommandFiles => {
    const words = commandWords(part);
    const runner = runnerFiles(words);
    if (runner !== undefined) {
      return {
        // `node .` runs the package's `main`.
        files: runner.files.map((file) =>
          file === '.' ? (stringOf(manifest?.raw.main) ?? 'index.js') : posix.join(directory, file)
        ),
        resolved: runner.resolved
      };
    }
    if (words[0] === 'nest' && words[1] === 'start') {
      return nestEntry === undefined ? { files: [], resolved: false } : { files: [nestEntry], resolved: true };
    }
    if (FRAMEWORK_SERVER.test(words[0] ?? '')) return { files: [], resolved: true };
    const reference = SCRIPT_REFERENCE.exec(words.join(' '));
    // `npm run --prefix server start` runs another package.
    if (
      reference === null ||
      directory !== '' ||
      words.some((word) => word.startsWith('--prefix') || word === '--filter')
    ) {
      return { files: [], resolved: false };
    }
    const name = reference[1]!;
    const script = manifest?.scripts[name];
    if (script === undefined) return { files: [], resolved: false };
    return filesOfCommand(script, manifest, nestEntry, depth + 1);
  });
  return { files: results.flatMap((result) => result.files), resolved: results.every((result) => result.resolved) };
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
    return Array.isArray(parts) && parts.every((part) => typeof part === 'string')
      ? parts.map((part) => (/\s/.test(part) ? `"${part}"` : part)).join(' ')
      : undefined;
  } catch {
    return undefined;
  }
};

const WORKER_SCRIPT = /(?:^|:)(?:worker|workers|queue|queue-worker|consumer|jobs?)(?::prod(?:uction)?)?$/i;

/**
 * The start files of the JavaScript package at `root`, strongest first, and whether every start command was read
 * (`resolved`). Compiled paths are read back to their source (`dist/main.js` to `src/main.ts`) through the tsconfig
 * `outDir`/`rootDir`, or a conventional output directory; a path with no source in the repository is left out rather
 * than guessed, and leaves the command unresolved.
 */
export const startEntriesOf = async (
  root: string,
  context: ProbeContext,
  resolver: ModuleResolver
): Promise<{ entries: StartEntry[]; resolved: boolean }> => {
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
  const main = manifest === undefined ? undefined : stringOf(manifest.raw.main);
  /**
   * The source a package-relative path runs from, when the repository holds it. A directory is no entry, except the
   * package's own `main`, which Node resolves like a module.
   */
  const toSource = (file: string): string | undefined => {
    // A process manager's configuration (`pm2-runtime start ecosystem.config.js`) names no application file.
    if (/(?:^|\/)(?:ecosystem|[\w-]+\.config)\.[cm]?js$/.test(file)) return undefined;
    const directories = main !== undefined && posix.normalize(file) === posix.normalize(main);
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
      const found = resolver.existing(base, directories);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  const entries: StartEntry[] = [];
  let resolved = true;
  const add = (origin: StartEntryOrigin, command: CommandFiles, processName?: string) => {
    if (!command.resolved) resolved = false;
    for (const file of command.files) {
      const source = toSource(file);
      if (source === undefined) {
        resolved = false;
        continue;
      }
      if (!entries.some((entry) => entry.file === source && entry.origin === origin)) {
        entries.push({ file: source, origin, ...(processName === undefined ? {} : { processName }) });
      }
    }
  };
  /** A convention file: added when it exists, and no command is left unread when it does not. */
  const addConvention = (origin: StartEntryOrigin, conventionFiles: readonly string[]) => {
    for (const file of conventionFiles) {
      const source = toSource(file);
      if (source !== undefined && !entries.some((entry) => entry.file === source && entry.origin === origin)) {
        entries.push({ file: source, origin });
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
    if (nestEntry !== undefined) addConvention('nest-convention', [nestEntry]);
    // Without a start script, `npm start` runs `node server.js`.
    if (scripts.start === undefined) addConvention('npm-default', ['server.js']);
    if (main !== undefined) addConvention('main', [main]);
    const bin = manifest.raw.bin;
    addConvention(
      'bin',
      typeof bin === 'string' ? [bin] : Object.values(recordOf(bin)).filter((value) => typeof value === 'string')
    );
  }
  return { entries, resolved };
};
