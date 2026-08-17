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
