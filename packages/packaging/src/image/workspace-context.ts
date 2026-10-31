import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import fastGlob from 'fast-glob';
import json5 from 'json5';
import { withFileDescriptor } from '../artifact/archive-entries';

/**
 * Limits the build context of a Railpack image built from a JavaScript workspace root to the workspace packages its
 * commands can reach.
 *
 * A job or service in a monorepo is built from the repository root, so that its `workspace:` dependencies install.
 * Railpack copies the whole root into the image, so editing any other package (a function the image never runs)
 * changed the image digest, and every dev session start and deploy rebuilt and pushed the image (r2an 7).
 *
 * The packages the image needs follow from the plan's own commands: the packages a filtered command (`pnpm --filter
 * <name>`, `npm --workspace=<name>`, `yarn workspace <name>`, `bun --filter <name>`) runs, every package a
 * workspace-wide command (`turbo run build`, `pnpm -r build`) runs a script of, the packages the root manifest depends
 * on, and all their workspace dependencies. Every other package keeps its `package.json`, so the install sees the same
 * workspace and lockfile, but its other files leave the context. A package stays whole when the install runs its
 * scripts or links its executables, when a kept package imports one of its files by a relative path, or when a kept
 * TypeScript configuration points into it. A command this cannot account for (a root script that runs anything other
 * than a workspace command, a custom install command, a script that reaches outside its package) leaves the whole
 * context in place: an image that changes too often is slower, one that misses a file is broken.
 */

type Manifest = {
  name?: unknown;
  scripts?: Record<string, unknown>;
  bin?: unknown;
  workspaces?: unknown;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
  optionalDependencies?: Record<string, unknown>;
  peerDependencies?: Record<string, unknown>;
};

type WorkspacePackage = { directory: string; name: string; manifest: Manifest };

export type WorkspaceContextScope = {
  /** `.dockerignore` patterns, relative to the workspace root, that remove the unused packages. */
  exclude: string[];
  /** Workspace package names the image is built from. */
  keptPackages: string[];
  /** Workspace package names reduced to their manifest. */
  reducedPackages: string[];
};

/** Lifecycle scripts a package manager runs for every workspace package while installing. */
const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish'];
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const;
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|astro|vue|svelte)$/;
const RELATIVE_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)["'](\.\.?\/[^"'\n]+)["']/g;
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', '.stacktape', '.turbo', '.next', '.astro', 'dist']);
const MAX_SCANNED_FILE_BYTES = 1024 * 1024;
/** Characters that mean something in a `.dockerignore` pattern; a directory named with one is never reduced. */
const PATTERN_CHARACTERS = /[*?[\]\\!#\s]/;
const PACKAGE_NAME = /^(?:@[\w.-]+\/)?[\w.-]+$/;

class Unscoped extends Error {}
const unscoped = (reason: string): never => {
  throw new Unscoped(reason);
};

const readJson = async (path: string, parse: (text: string) => unknown = JSON.parse) => {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
  try {
    return parse(text) as Record<string, unknown>;
  } catch {
    return unscoped(`${path} cannot be parsed`);
  }
};

/** The `packages` list of `pnpm-workspace.yaml`; only the plain block list form is read. */
const readPnpmWorkspacePatterns = async (root: string) => {
  let text: string;
  try {
    text = await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8');
  } catch {
    return undefined;
  }
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => /^packages\s*:/.test(line));
  if (start === -1) return undefined;
  if (!/^packages\s*:\s*(#.*)?$/.test(lines[start]!)) return unscoped('pnpm-workspace.yaml lists packages inline');
  const patterns: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) break;
    const item = /^\s+-\s+(["']?)([^"'#]+?)\1\s*(#.*)?$/.exec(line);
    if (!item) return unscoped('pnpm-workspace.yaml has a package entry that is not a plain string');
    patterns.push(item[2]!);
  }
  return patterns;
};

const getWorkspacePatterns = async (root: string, rootManifest: Manifest) => {
  const pnpm = await readPnpmWorkspacePatterns(root);
  if (pnpm) return pnpm;
  const { workspaces } = rootManifest;
  const list = Array.isArray(workspaces)
    ? workspaces
    : workspaces && typeof workspaces === 'object'
      ? (workspaces as { packages?: unknown }).packages
      : undefined;
  if (list === undefined) return undefined;
  if (!Array.isArray(list) || !list.every((entry) => typeof entry === 'string')) {
    return unscoped('the workspaces field is not a list of strings');
  }
  return list as string[];
};

const toPosix = (path: string) => path.split(sep).join('/');
const isWithin = (parent: string, child: string) => child === parent || child.startsWith(`${parent}/`);

/** A command with `sh -c '<command>'` unwrapped, split at `&&`, `||` and `;`, each part split into words. */
const splitCommand = (command: string): string[][] => {
  const wrapped = /^sh -c '([^']*)'$/.exec(command.trim());
  const text = wrapped ? wrapped[1]! : command;
  if (/["'`$|<>(){}\\]/.test(text)) return unscoped(`cannot read the command \`${command}\``);
  return text
    .split(/&&|\|\||;/)
    .map((part) => part.trim().split(/\s+/).filter(Boolean))
    .filter((words) => words.length);
};

type CommandEffect = {
  /** Packages a filtered command runs in. */
  targets: Set<string>;
  /** Script names a workspace-wide command runs in every package that has them. */
  workspaceScripts: Set<string>;
};

const INSTALLS: Record<string, string[]> = {
  pnpm: ['install', 'i'],
  npm: ['ci', 'install', 'i'],
  yarn: ['install'],
  bun: ['install', 'i']
};
const GLOBAL_INSTALLS: Record<string, string[]> = { pnpm: ['add'], npm: ['install', 'i'], bun: ['add'] };
const RUN_SUBCOMMANDS = new Set(['run', 'run-script']);
const DIRECT_SCRIPTS = new Set(['start', 'test']);

const filterTarget = (value: string | undefined) => {
  const name = value?.replace(/\.\.\.$/, '');
  if (!name || !PACKAGE_NAME.test(name)) return unscoped(`cannot follow the workspace filter \`${value}\``);
  return name;
};

const readTurboTasks = async (root: string, tasks: string[]) => {
  const turbo = await readJson(join(root, 'turbo.json'), json5.parse);
  const definitions = ((turbo?.tasks ?? turbo?.pipeline) || {}) as Record<string, { dependsOn?: unknown }>;
  const all = new Set<string>();
  const visit = (task: string) => {
    if (task.includes('#')) unscoped(`turbo task \`${task}\` names a package`);
    if (all.has(task)) return;
    all.add(task);
    const dependsOn = definitions[task]?.dependsOn;
    if (dependsOn !== undefined && !Array.isArray(dependsOn))
      unscoped(`turbo task \`${task}\` has unreadable dependsOn`);
    for (const dependency of (dependsOn as unknown[] | undefined) ?? []) {
      if (typeof dependency !== 'string') unscoped(`turbo task \`${task}\` has unreadable dependsOn`);
      else if (!dependency.startsWith('$')) visit(dependency.replace(/^\^/, ''));
    }
  };
  tasks.forEach(visit);
  return [...all];
};

const classifyCommands = async ({
  root,
  rootManifest,
  commands
}: {
  root: string;
  rootManifest: Manifest;
  commands: string[];
}): Promise<CommandEffect> => {
  const effect: CommandEffect = { targets: new Set(), workspaceScripts: new Set() };
  const rootScripts = (rootManifest.scripts ?? {}) as Record<string, unknown>;

  const runRootScript = async (script: string | undefined, depth: number) => {
    const body = script === undefined ? undefined : rootScripts[script];
    if (typeof body !== 'string') return unscoped(`the root package has no script \`${script}\``);
    if (depth > 4) return unscoped('root scripts call each other too deeply');
    await Promise.all(splitCommand(body).map((words) => classify(words, depth + 1)));
  };

  const classify = async (words: string[], depth: number): Promise<void> => {
    let [tool, ...rest] = words;
    if (tool === 'npx' || tool === 'bunx' || (tool === 'pnpm' && (rest[0] === 'exec' || rest[0] === 'dlx'))) {
      if (tool === 'pnpm') rest = rest.slice(1);
      [tool, ...rest] = rest;
    }
    if (tool === 'mise' || tool === 'mkdir' || tool === 'apt-get' || tool === 'corepack') return;
    if (tool === 'turbo') {
      const tasks = rest[0] === 'run' ? rest.slice(1) : rest;
      if (!tasks.length || tasks.some((task) => task.startsWith('-'))) {
        return unscoped(`cannot follow \`${words.join(' ')}\``);
      }
      for (const task of await readTurboTasks(root, tasks)) effect.workspaceScripts.add(task);
      return;
    }
    if (tool !== 'pnpm' && tool !== 'npm' && tool !== 'yarn' && tool !== 'bun') {
      return unscoped(`cannot follow \`${words.join(' ')}\``);
    }
    const flags = rest.filter((word) => word.startsWith('-'));
    const isGlobal = flags.includes('-g') || flags.includes('--global');
    if (isGlobal && GLOBAL_INSTALLS[tool]?.includes(rest[0]!)) return;
    if (tool === 'yarn' && rest[0] === 'global' && rest[1] === 'add') return;
    // A dependency install of the whole workspace: its scripts are accounted for with the packages' manifests.
    if ((INSTALLS[tool]!.includes(rest[0]!) || (tool === 'yarn' && !rest.length)) && !isGlobal) {
      if (rest.slice(1).some((word) => !word.startsWith('-'))) return unscoped(`\`${words.join(' ')}\` adds packages`);
      return;
    }

    // Filtered commands: the package they run in.
    const valueOf = (names: string[]) => {
      for (const [index, word] of rest.entries()) {
        for (const name of names) {
          if (word === name) return { value: rest[index + 1], consumed: [index, index + 1] };
          if (word.startsWith(`${name}=`)) return { value: word.slice(name.length + 1), consumed: [index] };
        }
      }
      return undefined;
    };
    if (tool === 'yarn' && rest[0] === 'workspace') {
      effect.targets.add(filterTarget(rest[1]));
      return;
    }
    if (tool === 'yarn' && rest[0] === 'workspaces') {
      const script = rest[1] === 'foreach' ? rest.findLast((word) => !word.startsWith('-')) : rest[2];
      if (rest[1] !== 'run' && rest[1] !== 'foreach') return unscoped(`cannot follow \`${words.join(' ')}\``);
      if (!script) return unscoped(`cannot follow \`${words.join(' ')}\``);
      effect.workspaceScripts.add(script);
      return;
    }
    const filter =
      tool === 'pnpm'
        ? valueOf(['--filter', '-F'])
        : tool === 'npm'
          ? valueOf(['--workspace', '-w'])
          : tool === 'bun'
            ? valueOf(['--filter', '-F'])
            : undefined;
    if (filter) {
      if (valueOf(['--filter', '-F', '--workspace', '-w'])?.consumed[0] !== filter.consumed[0]) {
        return unscoped('a command filters more than once');
      }
      const remaining = rest.filter((_, index) => !filter.consumed.includes(index));
      if (remaining.some((word) => word === '--workspaces' || word === '-ws' || word === '-r')) {
        return unscoped(`cannot follow \`${words.join(' ')}\``);
      }
      effect.targets.add(filterTarget(filter.value));
      return;
    }

    // Workspace-wide commands: every package with the script.
    const positional = rest.filter((word) => !word.startsWith('-'));
    const script = RUN_SUBCOMMANDS.has(positional[0]!) ? positional[1] : positional[0];
    const allPackages =
      (tool === 'pnpm' && (flags.includes('-r') || flags.includes('--recursive'))) ||
      (tool === 'npm' && (flags.includes('--workspaces') || flags.includes('-ws')));
    if (allPackages) {
      if (!script) return unscoped(`cannot follow \`${words.join(' ')}\``);
      effect.workspaceScripts.add(script);
      return;
    }
    if (flags.length) return unscoped(`cannot follow \`${words.join(' ')}\``);
    // A root script: what it runs decides.
    if (tool === 'npm' && !RUN_SUBCOMMANDS.has(positional[0]!) && !DIRECT_SCRIPTS.has(positional[0]!)) {
      return unscoped(`cannot follow \`${words.join(' ')}\``);
    }
    if (tool === 'bun' && positional[0] !== 'run') return unscoped(`cannot follow \`${words.join(' ')}\``);
    return runRootScript(script, depth);
  };

  await Promise.all(commands.flatMap(splitCommand).map((words) => classify(words, 0)));
  return effect;
};

type PlanCommand = { cmd?: unknown; src?: unknown };

/** Every command the plan runs, and every file it copies from the context. */
const readPlanCommands = (plan: { steps?: unknown[] | undefined; deploy?: { startCommand?: unknown } | undefined }) => {
  const commands: string[] = [];
  const copiedPaths: string[] = [];
  for (const step of plan.steps ?? []) {
    for (const command of ((step as { commands?: unknown })?.commands as PlanCommand[] | undefined) ?? []) {
      if (typeof command?.cmd === 'string') commands.push(command.cmd);
      if (typeof command?.src === 'string') copiedPaths.push(posix.normalize(command.src));
    }
  }
  const start = plan.deploy?.startCommand;
  if (typeof start === 'string') commands.push(start);
  else if (start !== undefined) unscoped('the start command is not a string');
  return { commands, copiedPaths };
};

/**
 * Paths the TypeScript configurations of a directory point at: the targets of its path mappings and, unless only the
 * mappings are wanted, the configurations it extends or references.
 */
const readTypescriptReferences = async ({
  root,
  directory,
  names,
  pathsOnly
}: {
  root: string;
  directory: string;
  names: string[];
  pathsOnly: boolean;
}) => {
  const absoluteDirectory = join(root, directory);
  const toWorkspacePath = (from: string, target: string) => toPosix(relative(root, resolve(from, target)));
  const configs = await Promise.all(names.map((name) => readJson(join(absoluteDirectory, name), json5.parse)));
  return configs.flatMap((config) => {
    const referenced: string[] = [];
    const compilerOptions = (config?.compilerOptions ?? {}) as { paths?: Record<string, unknown>; baseUrl?: unknown };
    const base = join(absoluteDirectory, typeof compilerOptions.baseUrl === 'string' ? compilerOptions.baseUrl : '.');
    for (const targets of Object.values(compilerOptions.paths ?? {})) {
      for (const target of Array.isArray(targets) ? targets : []) {
        if (typeof target === 'string') referenced.push(toWorkspacePath(base, target.replace(/\*.*$/, '')));
      }
    }
    if (pathsOnly) return referenced;
    if (typeof config?.extends === 'string' && config.extends.startsWith('.')) {
      referenced.push(toWorkspacePath(absoluteDirectory, config.extends));
    }
    for (const reference of Array.isArray(config?.references) ? config.references : []) {
      const path = (reference as { path?: unknown })?.path;
      if (typeof path === 'string') referenced.push(toWorkspacePath(absoluteDirectory, path));
    }
    return referenced;
  });
};

/** The source files of a package, without installed dependencies, caches and build output. */
const listSourceFiles = async (absoluteDirectory: string) => {
  const files: string[] = [];
  let directories = [absoluteDirectory];
  while (directories.length) {
    // oxlint-disable-next-line no-await-in-loop -- One directory level at a time; the reads within it run together.
    const listings = await Promise.all(
      directories.map(async (directory) => ({
        directory,
        entries: await withFileDescriptor(() => readdir(directory, { withFileTypes: true }))
      }))
    );
    directories = [];
    for (const { directory, entries } of listings) {
      for (const entry of entries) {
        if (entry.isDirectory() && !SKIPPED_DIRECTORIES.has(entry.name)) directories.push(join(directory, entry.name));
        else if (entry.isFile() && SOURCE_FILE.test(entry.name)) files.push(join(directory, entry.name));
      }
    }
  }
  return files;
};

/** Paths outside a kept package that its relative imports or TypeScript configurations reach. */
const findReferencedPaths = async (root: string, directory: string): Promise<string[]> => {
  const absoluteDirectory = join(root, directory);
  const tsconfigNames = (await readdir(absoluteDirectory)).filter((name) => /^tsconfig.*\.json$/.test(name));
  const [typescriptReferences, files] = await Promise.all([
    readTypescriptReferences({ root, directory, names: tsconfigNames, pathsOnly: false }),
    listSourceFiles(absoluteDirectory)
  ]);
  const imports = await Promise.all(
    files.map(async (path) => {
      if ((await stat(path)).size > MAX_SCANNED_FILE_BYTES) return [];
      const text = await withFileDescriptor(() => readFile(path, 'utf8'));
      return [...text.matchAll(RELATIVE_SPECIFIER)].map(([, specifier]) =>
        toPosix(relative(root, resolve(dirname(path), specifier!)))
      );
    })
  );
  return [...typescriptReferences, ...imports.flat()].filter((path) => !isWithin(directory, path));
};

/**
 * The exclusions that reduce a workspace root build context to the packages the plan's commands reach, or undefined
 * when the source directory is not a JavaScript workspace root or the commands cannot be accounted for.
 */
export const getWorkspaceContextScope = async ({
  sourceDirectoryPath,
  plan
}: {
  sourceDirectoryPath: string;
  plan: { steps?: unknown[] | undefined; deploy?: { startCommand?: unknown } | undefined };
}): Promise<WorkspaceContextScope | undefined> => {
  try {
    return await scopeWorkspace(sourceDirectoryPath, plan);
  } catch (error) {
    if (error instanceof Unscoped) return undefined;
    throw error;
  }
};

const scopeWorkspace = async (
  root: string,
  plan: { steps?: unknown[] | undefined; deploy?: { startCommand?: unknown } | undefined }
): Promise<WorkspaceContextScope | undefined> => {
  const rootManifest = (await readJson(join(root, 'package.json'))) as Manifest | undefined;
  if (!rootManifest) return undefined;
  const patterns = await getWorkspacePatterns(root, rootManifest);
  if (!patterns?.length) return undefined;
  const positive = patterns.filter((pattern) => !pattern.startsWith('!'));
  const negative = patterns.filter((pattern) => pattern.startsWith('!')).map((pattern) => pattern.slice(1));
  const directories = (
    await fastGlob(
      positive.map((pattern) => pattern.replace(/^\.\//, '').replace(/\/$/, '')),
      { cwd: root, onlyDirectories: true, ignore: ['**/node_modules/**', ...negative], dot: false }
    )
  )
    .map((directory) => posix.normalize(directory))
    .filter((directory) => directory !== '.' && !directory.startsWith('..'))
    .toSorted();

  const manifests = await Promise.all(
    directories.map(async (directory) => ({
      directory,
      manifest: (await readJson(join(root, directory, 'package.json'))) as Manifest | undefined
    }))
  );
  const packages: WorkspacePackage[] = [];
  const otherDirectories: string[] = [];
  for (const { directory, manifest } of manifests) {
    if (!manifest) otherDirectories.push(directory);
    else if (typeof manifest.name === 'string') packages.push({ directory, name: manifest.name, manifest });
    else return unscoped(`${directory}/package.json has no name`);
  }
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  if (byName.size !== packages.length) return unscoped('two workspace packages have the same name');

  const { commands, copiedPaths } = readPlanCommands(plan);
  const effect = await classifyCommands({ root, rootManifest, commands });
  if (!effect.targets.size) return undefined;
  for (const target of effect.targets) if (!byName.has(target)) return unscoped(`no workspace package is ${target}`);

  const kept = new Set<string>();
  const workspaceDependencies = (manifest: Manifest) =>
    DEPENDENCY_FIELDS.flatMap((field) => Object.keys(manifest[field] ?? {})).filter((name) => byName.has(name));
  const scanned = new Set<string>();
  const overlapping = (paths: string[]) =>
    packages
      .filter(({ directory }) => paths.some((path) => isWithin(directory, path) || isWithin(path, directory)))
      .map(({ name }) => name);
  /** Keeps the packages, their workspace dependencies, and what their imports and TypeScript configurations reach. */
  const keep = async (names: string[]) => {
    let queue = names;
    while (queue.length) {
      while (queue.length) {
        const name = queue.pop()!;
        if (kept.has(name)) continue;
        kept.add(name);
        queue.push(...workspaceDependencies(byName.get(name)!.manifest));
      }
      const unscanned = [...kept].filter((name) => !scanned.has(name));
      unscanned.forEach((name) => scanned.add(name));
      // oxlint-disable-next-line no-await-in-loop -- Each round scans the packages the previous round kept.
      const reached = await Promise.all(
        unscanned.map((name) => findReferencedPaths(root, byName.get(name)!.directory))
      );
      queue = overlapping(reached.flat());
    }
  };
  await keep([
    ...effect.targets,
    ...workspaceDependencies(rootManifest),
    ...packages
      .filter(({ manifest }) => [...effect.workspaceScripts].some((script) => manifest.scripts?.[script] !== undefined))
      .map(({ name }) => name),
    // The install runs these packages' scripts or links their executables.
    ...packages
      .filter(
        ({ manifest }) => manifest.bin !== undefined || INSTALL_SCRIPTS.some((script) => manifest.scripts?.[script])
      )
      .map(({ name }) => name)
  ]);
  // Root source files run only through root scripts, which the commands above already accounted for; the root's
  // TypeScript path mappings still decide where kept packages' imports resolve.
  await keep(
    overlapping(
      await readTypescriptReferences({
        root,
        directory: '.',
        names: ['tsconfig.json', 'tsconfig.base.json'],
        pathsOnly: true
      })
    )
  );

  const keptDirectories = packages.filter(({ name }) => kept.has(name)).map(({ directory }) => directory);
  const overlapsKept = (directory: string) =>
    keptDirectories.some((keptDirectory) => isWithin(directory, keptDirectory) || isWithin(keptDirectory, directory));
  const reducible = (directory: string) => !PATTERN_CHARACTERS.test(directory) && !overlapsKept(directory);
  const reduced = packages.filter(({ name, directory }) => !kept.has(name) && reducible(directory));
  const removed = otherDirectories.filter(
    (directory) =>
      reducible(directory) &&
      !packages.some(
        ({ directory: packageDirectory }) =>
          isWithin(directory, packageDirectory) || isWithin(packageDirectory, directory)
      )
  );
  if (!reduced.length && !removed.length) return undefined;
  for (const path of copiedPaths) {
    const lostDirectory = [...reduced.map(({ directory }) => directory), ...removed].find((directory) =>
      isWithin(directory, path)
    );
    if (lostDirectory && path !== `${lostDirectory}/package.json`) return unscoped(`the plan copies ${path}`);
  }
  return {
    exclude: [...reduced.flatMap(({ directory }) => [`${directory}/**`, `!${directory}/package.json`]), ...removed],
    keptPackages: [...kept].toSorted(),
    reducedPackages: reduced.map(({ name }) => name).toSorted()
  };
};
