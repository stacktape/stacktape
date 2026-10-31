/**
 * The source file a JavaScript package's start command runs, when the command says so without ambiguity.
 *
 * A file that calls `.listen(` proves a server only when the process runs it: a dev mock, a helper or a test server sits
 * in the same package but in no process. Init only changes its first-file choice when the start file is certain.
 */

import { posix } from 'node:path';
import { readText, type ProbeContext } from './probe';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs', '.jsx'];
const MODULE_EXTENSIONS = ['', ...SOURCE_EXTENSIONS, ...SOURCE_EXTENSIONS.map((extension) => `/index${extension}`)];
/** Directories a build writes compiled JavaScript to. */
const OUTPUT_DIRECTORIES = new Set(['dist', 'build', 'out', 'lib', 'output', '.output', 'compiled']);

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

type TsconfigOptions = { directory: string; outDir: string | undefined; rootDir: string | undefined };

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
  return {
    directory,
    outDir: relative(options.outDir) ?? base?.outDir,
    rootDir: relative(options.rootDir) ?? base?.rootDir
  };
};

/**
 * The source file a package-relative module path names among `files`, trying TypeScript and JavaScript extensions (a
 * compiled `server.js` for `server.ts`); a directory's `index` only when `directories` allows it.
 */
const existingSource = (files: ReadonlySet<string>, base: string, directories: boolean): string | undefined => {
  const normalized = posix.normalize(base).replace(/^\.\//, '');
  const stem = normalized.replace(/\.[cm]?jsx?$/, '');
  return [normalized, stem]
    .flatMap((candidate) =>
      (directories ? MODULE_EXTENSIONS : ['', ...SOURCE_EXTENSIONS]).map((extension) => `${candidate}${extension}`)
    )
    .find((candidate) => files.has(candidate) && /\.[cm]?[jt]sx?$/.test(candidate));
};

/**
 * Runners init reads, with the flags each takes. A flag outside these lists, a working-directory flag (`--cwd`),
 * inline code (`-e`) or a preloaded project file (`-r ./x`) makes the command one init does not read.
 */
type Runner = {
  command: string;
  /** Words that must or may come before the file: `deno run`, `bun run`, `tsx watch`. */
  modes: readonly string[];
  modeRequired?: true;
  /** Flags that take the next word (or `=value`) as their value. */
  values: ReadonlySet<string>;
  /** Flags that take no value. */
  switches: RegExp;
};
const NODE_SWITCHES =
  /^--(?:enable-source-maps|no-[\w-]+|trace-[\w-]+|experimental-[\w-]+|inspect(?:-brk)?|watch|expose-gc|preserve-symlinks|abort-on-uncaught-exception|max-old-space-size=\d+|max-semi-space-size=\d+|max-http-header-size=\d+|unhandled-rejections=[\w-]+|stack-trace-limit=\d+|harmony[\w-]*|frozen-intrinsics|throw-deprecation|pending-deprecation|inspect(?:-brk)?=[\w.:]+)$/;
const NODE_VALUES = ['-r', '--require', '--import', '--loader', '--experimental-loader', '--env-file', '--title'];
const RUNNERS: readonly Runner[] = [
  { command: 'node', modes: [], values: new Set(NODE_VALUES), switches: NODE_SWITCHES },
  {
    command: 'nodemon',
    modes: [],
    values: new Set([...NODE_VALUES, '-w', '--watch', '-e', '--ext', '-i', '--ignore', '-d', '--delay', '--signal']),
    switches: new RegExp(
      `${NODE_SWITCHES.source}|^(?:-L|--legacy-watch|-q|--quiet|-V|--verbose|--no-colors|--no-stdin)$`
    )
  },
  {
    command: 'ts-node',
    modes: [],
    values: new Set(['-r', '--require', '-P', '--project', '-O', '--compiler-options', '-C', '--compiler']),
    switches: /^(?:-T|--transpile-only|--files|-H|--compiler-host|--swc|--esm|--prefer-ts-exts|--pretty)$/
  },
  {
    command: 'tsx',
    modes: ['watch'],
    values: new Set([...NODE_VALUES, '--tsconfig', '--include', '--exclude']),
    switches: new RegExp(`${NODE_SWITCHES.source}|^(?:--no-cache|--clear-screen=false)$`)
  },
  {
    command: 'bun',
    modes: ['run'],
    values: new Set(['--env-file', '-r', '--preload', '--tsconfig-override', '-c', '--config']),
    switches: /^(?:--smol|--hot|--watch|--bun|-b|--silent|--no-clear-screen)$/
  },
  {
    command: 'deno',
    modes: ['run'],
    modeRequired: true,
    values: new Set(['-c', '--config', '--import-map']),
    switches:
      /^(?:-A|--allow-[\w-]+(?:=\S+)?|--deny-[\w-]+(?:=\S+)?|--unstable[\w-]*|--watch|--no-check|--check|--env(?:-file)?(?:=\S+)?|--node-modules-dir(?:=\S+)?|--cached-only|--no-prompt|-q|--quiet)$/
  }
];
const PRELOAD_FLAGS = new Set(['-r', '--require', '--import', '--preload']);
/** Shell syntax that runs more than one process, moves it, or computes its words. */
const SHELL_SYNTAX = /["'`$&|;<>()*?\\\n]/;
const ENVIRONMENT_ASSIGNMENT = /^[A-Za-z_]\w*=\S*$/;

type Manifest = { scripts: Record<string, string>; raw: Record<string, unknown> };

/**
 * The one file a command runs, when it is a single simple process: a runner with known flags and a file (`node
 * --enable-source-maps dist/main.mjs`), a package script that is one (`npm start`, `yarn start:prod`), or `nest start`.
 * Chains, background jobs, `cd`, quoting, shell scripts, process managers and parallel runners are not read.
 * `undefined` when the command is anything else.
 */
const simpleCommandFile = (
  command: string,
  manifest: Manifest | undefined,
  nestEntry: string | undefined,
  depth = 0
): string | undefined => {
  if (depth > 3 || SHELL_SYNTAX.test(command)) return undefined;
  const words = command.trim().split(/\s+/).filter(Boolean);
  if (words[0] === 'cross-env') words.shift();
  while (words.length > 0 && ENVIRONMENT_ASSIGNMENT.test(words[0]!)) words.shift();
  const [first, second, third] = words;
  if (first === undefined) return undefined;
  if (first === 'nest' && second === 'start' && words.length === 2) return nestEntry;
  // `npm start`, `npm run x`, `yarn x`, `pnpm run x`, `bun run x`; words after the name are the script's arguments.
  if (['npm', 'yarn', 'pnpm', 'bun'].includes(first)) {
    const runs = second === 'run' || second === 'run-script';
    const name = runs
      ? third
      : first === 'npm'
        ? second === 'start'
          ? 'start'
          : undefined
        : first === 'bun'
          ? undefined
          : second;
    // `bun run src/index.ts` and `bun src/index.ts` run a file.
    const bunFile = first === 'bun' && /[./]/.test((runs ? third : second) ?? '');
    if (!bunFile) {
      const script = name === undefined ? undefined : manifest?.scripts[name];
      return script === undefined ? undefined : simpleCommandFile(script, manifest, nestEntry, depth + 1);
    }
  }
  const runner = RUNNERS.find((candidate) => candidate.command === first);
  if (runner === undefined) return undefined;
  let index = 1;
  if (runner.modes.includes(words[index] ?? '')) index += 1;
  else if (runner.modeRequired === true) return undefined;
  for (; index < words.length; index += 1) {
    const word = words[index]!;
    if (!word.startsWith('-')) {
      if (word === '.' || word === './') return stringOf(manifest?.raw.main) ?? 'index.js';
      return /^[\w@][\w@./-]*$/.test(word.replace(/^\.\//, '')) ? word.replace(/^\.\//, '') : undefined;
    }
    const [flag, inline] = word.split('=', 2) as [string, string | undefined];
    if (runner.values.has(flag)) {
      const value = inline ?? words[index + 1];
      if (inline === undefined) index += 1;
      // A preloaded project file runs too; which one is the entry is then not one file.
      if (value === undefined || (PRELOAD_FLAGS.has(flag) && /^[./]/.test(value))) return undefined;
    } else if (!runner.switches.test(word)) return undefined;
  }
  return undefined;
};

/** The single `CMD` or `ENTRYPOINT` of a Dockerfile's last stage, in exec form, as words. */
const dockerfileExecCommand = (raw: string): string | undefined => {
  const lines = raw.replace(/\\\r?\n/g, ' ').split(/\r?\n/);
  const lastStage = lines.slice(lines.findLastIndex((line) => /^\s*FROM\s/i.test(line)) + 1);
  const instructions = lastStage.filter((line) => /^\s*(?:CMD|ENTRYPOINT)\s/i.test(line));
  if (instructions.length !== 1) return undefined;
  const value = instructions[0]!.replace(/^\s*(?:CMD|ENTRYPOINT)\s+/i, '').trim();
  if (!value.startsWith('[')) return undefined;
  try {
    const parts: unknown = JSON.parse(value);
    return Array.isArray(parts) && parts.every((part) => typeof part === 'string' && !/\s/.test(part))
      ? parts.join(' ')
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The one source file the JavaScript package at `root` starts with, when its start commands say so without ambiguity.
 *
 * The commands are the package's `start` and `start:prod` scripts, a Procfile whose only process is `web`, and the
 * exec-form `CMD` or `ENTRYPOINT` of the Dockerfile's last stage. Each one present must be a single simple process, and
 * they must all name the same file. A compiled path (`dist/main.js`) is read back to its source through the tsconfig
 * `outDir`/`rootDir` or a conventional output directory. Anything else, including a path with no source, a directory
 * or disagreeing commands, gives `undefined`, and the scan keeps its earlier behavior for the package.
 */
export const unambiguousStartFile = async (root: string, context: ProbeContext): Promise<string | undefined> => {
  const files = new Set(context.files);
  const read = async (name: string) =>
    files.has(join(root, name)) ? readText(context, join(root, name), { fullFile: true }) : undefined;
  const manifestRaw = parseJson(await read('package.json'));
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
  const nestCli = parseJson(await read('nest-cli.json'));
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
  /** The source a package-relative path runs from; a directory only when it is the package's own `main`. */
  const toSource = (file: string): string | undefined => {
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
      const found = existingSource(files, base, directories);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  const commands = ['start', 'start:prod']
    .map((name) => manifest?.scripts[name])
    .filter((command): command is string => command !== undefined);
  const procfile = await read('Procfile');
  if (procfile !== undefined) {
    const processes = procfile
      .split(/\r?\n/)
      .map((line) => /^([\w-]+)\s*:\s*(.+)$/.exec(line.trim()))
      .filter((match): match is RegExpExecArray => match !== null && match[1] !== 'release');
    if (processes.length !== 1 || processes[0]![1] !== 'web') return undefined;
    commands.push(processes[0]![2]!);
  }
  const dockerfile = await read('Dockerfile');
  if (dockerfile !== undefined) {
    const command = dockerfileExecCommand(dockerfile);
    if (command === undefined) return undefined;
    commands.push(command);
  }
  if (commands.length === 0) return undefined;
  const sources = commands.map((command) => {
    const file = simpleCommandFile(command, manifest, nestEntry);
    return file === undefined ? undefined : toSource(file);
  });
  const [file] = sources;
  return file !== undefined && sources.every((source) => source === file) ? file : undefined;
};
