import { posix } from 'node:path';
import { readText, type ProbeContext } from './probe';

/**
 * The files that make a directory a service of its own: package and build manifests. A Dockerfile beside a `Gemfile` in
 * `api/` builds the Rails app there, not the root `package.json`'s. Entry scripts such as `manage.py` are not on the
 * list: a root `requirements.txt` whose Procfile runs `gunicorn --chdir src` owns the Django project in `src/`.
 */
const MANIFEST_NAMES = new Set([
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'Gemfile',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'go.mod',
  'Cargo.toml',
  'mix.exs',
  'composer.json'
]);
const PROJECT_FILE = /\.(?:cs|fs|vb)proj$/;

const isManifest = (fileName: string): boolean => MANIFEST_NAMES.has(fileName) || PROJECT_FILE.test(fileName);

const within = (directory: string, root: string): boolean =>
  root === '.' || directory === root || directory.startsWith(`${root}/`);

/**
 * Finds the closest manifest-owned service root containing a repository-relative file. A directory the root service's
 * start command enters (`entered`) belongs to the root service, whatever manifest it holds.
 */
export const nearestManifestRoot = (
  file: string,
  files: readonly string[],
  entered: ReadonlySet<string> = new Set()
): string | undefined => {
  const directory = posix.dirname(file);
  const candidates = files
    .filter((candidate) => isManifest(posix.basename(candidate)))
    .map((candidate) => posix.dirname(candidate))
    .filter((root) => within(directory, root))
    .toSorted((left, right) => right.length - left.length);
  if (![...entered].some((target) => within(directory, target))) return candidates[0];
  return candidates.find((root) => ![...entered].some((target) => within(root, target))) ?? '.';
};

/** `cd api`, `--chdir src`, `--chdir=src`, `-C api`, `--app-dir src`, `--cwd web`, `--prefix web`, `pushd api`. */
const ENTERS_DIRECTORY =
  /(?:^|[\s;&|(])(?:cd|pushd)\s+(?:\.\/)?([\w.-]+(?:\/[\w.-]+)*)|--(?:chdir|app-dir|cwd|prefix)(?:=|\s+)(?:\.\/)?([\w.-]+(?:\/[\w.-]+)*)|\s-C\s+(?:\.\/)?([\w.-]+(?:\/[\w.-]+)*)/g;

/**
 * The directories the repository root's own start commands run in: its Procfile's processes and its `package.json`
 * start script. `web: gunicorn --chdir src config.wsgi:application` is the root service running `src/`, not a second
 * service there.
 */
export const directoriesEnteredByRoot = async (context: ProbeContext): Promise<ReadonlySet<string>> => {
  const commands: string[] = [];
  if (context.files.includes('Procfile')) {
    const procfile = await readText(context, 'Procfile');
    for (const line of (procfile ?? '').split(/\r?\n/)) {
      const command = /^[\w-]+\s*:\s*(.+)$/.exec(line.trim())?.[1];
      if (command !== undefined) commands.push(command);
    }
  }
  if (context.files.includes('package.json')) {
    try {
      const start = (JSON.parse((await readText(context, 'package.json')) ?? '{}') as { scripts?: { start?: unknown } })
        .scripts?.start;
      if (typeof start === 'string') commands.push(start);
    } catch {
      // A manifest that does not parse states no command.
    }
  }
  const entered = new Set<string>();
  for (const command of commands) {
    for (const match of command.matchAll(ENTERS_DIRECTORY)) {
      const directory = (match[1] ?? match[2] ?? match[3])!.replace(/\/$/, '');
      if (directory !== '.' && directory !== '..' && !directory.startsWith('../')) entered.add(directory);
    }
  }
  return entered;
};

/**
 * Directories that show how to use a project rather than hold what it deploys: a monorepo's `examples/`, starter
 * `templates/`, test fixtures. Probes skip them unless the repository holds nothing else.
 */
export const SAMPLE_DIRECTORY =
  /(?:^|\/)(?:examples?|samples?|demos?|extras?|fixtures?|__fixtures__|templates?|playgrounds?)\//i;

/**
 * A path without the package directories under a JVM source root: `src/main/java/com/example/App.java` becomes
 * `src/main/java/App.java`. `com.example` is the conventional package of real applications, not a sample, and no package
 * name says what a directory is for.
 */
export const outsidePackageNamespace = (path: string): string =>
  path.replace(/((?:^|\/)src\/(?:main|test)\/(?:java|kotlin|scala|groovy)\/)(?:[^/]+\/)+/, '$1');

export const withoutSampleDirectories = (paths: readonly string[]): readonly string[] => {
  const own = paths.filter((path) => !SAMPLE_DIRECTORY.test(outsidePackageNamespace(path)));
  return own.length > 0 ? own : paths;
};
