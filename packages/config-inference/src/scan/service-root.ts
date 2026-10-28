import { posix } from 'node:path';
import { isLanguageMarker } from './language';

/**
 * Finds the closest manifest-owned service root containing a repository-relative file. Every language's project file
 * counts: a Dockerfile beside a `Gemfile` in `api/` builds the Rails app there, not the root `package.json`'s.
 */
export const nearestManifestRoot = (file: string, files: readonly string[]): string | undefined => {
  const directory = posix.dirname(file);
  return files
    .filter((candidate) => isLanguageMarker(posix.basename(candidate)))
    .map((candidate) => posix.dirname(candidate))
    .filter((root) => root === '.' || directory === root || directory.startsWith(`${root}/`))
    .toSorted((left, right) => right.length - left.length)[0];
};

/**
 * Directories that show how to use a project rather than hold what it deploys: a monorepo's `examples/`, starter
 * `templates/`, test fixtures. Probes skip them unless the repository holds nothing else.
 */
export const SAMPLE_DIRECTORY =
  /(?:^|\/)(?:examples?|samples?|demos?|extras?|fixtures?|__fixtures__|templates?|playgrounds?)\//i;

export const withoutSampleDirectories = (paths: readonly string[]): readonly string[] => {
  const own = paths.filter((path) => !SAMPLE_DIRECTORY.test(path));
  return own.length > 0 ? own : paths;
};
