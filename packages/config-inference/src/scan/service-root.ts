import { posix } from 'node:path';

const MANIFEST_NAMES = new Set([
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'go.mod',
  'Cargo.toml',
  'mix.exs',
  'composer.json'
]);

/** Finds the closest manifest-owned service root containing a repository-relative file. */
export const nearestManifestRoot = (file: string, files: readonly string[]): string | undefined => {
  const directory = posix.dirname(file);
  return files
    .filter((candidate) => MANIFEST_NAMES.has(posix.basename(candidate)))
    .map((candidate) => posix.dirname(candidate))
    .filter((root) => root === '.' || directory === root || directory.startsWith(`${root}/`))
    .toSorted((left, right) => right.length - left.length)[0];
};

/**
 * Directories that show how to use a project rather than hold what it deploys: a monorepo's `examples/`, starter
 * `templates/`, test fixtures. Probes skip them unless the repository holds nothing else.
 */
export const SAMPLE_DIRECTORY =
  /(?:^|\/)(?:examples?|samples?|demos?|fixtures?|__fixtures__|templates?|playgrounds?)\//i;

export const withoutSampleDirectories = (paths: readonly string[]): readonly string[] => {
  const own = paths.filter((path) => !SAMPLE_DIRECTORY.test(path));
  return own.length > 0 ? own : paths;
};
