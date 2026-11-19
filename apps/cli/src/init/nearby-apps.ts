import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Files that mark a folder as an app of its own. */
const APP_MARKERS = new Set([
  'package.json',
  'go.mod',
  'pyproject.toml',
  'requirements.txt',
  'Gemfile',
  'composer.json',
  'Cargo.toml',
  'pom.xml',
  'build.gradle',
  'Dockerfile',
  'manage.py'
]);

/** What a marker file says the app is written in, most telling first: a Dockerfile only says how it runs. */
const KIND_BY_MARKER: ReadonlyArray<readonly [marker: string, kind: string]> = [
  ['package.json', 'Node.js'],
  ['go.mod', 'Go'],
  ['pyproject.toml', 'Python'],
  ['requirements.txt', 'Python'],
  ['manage.py', 'Python'],
  ['Gemfile', 'Ruby'],
  ['composer.json', 'PHP'],
  ['Cargo.toml', 'Rust'],
  ['pom.xml', 'Java'],
  ['build.gradle', 'Java'],
  ['Dockerfile', 'Dockerfile']
];

const SKIPPED = new Set(['node_modules', 'vendor', 'dist', 'build', 'target', 'venv', '__pycache__', 'coverage']);

/**
 * Folders up to two levels below the project that look like apps, for a run that found nothing to deploy here.
 *
 * Someone who runs init one level too high (a monorepo root, a folder of projects) gets told where to run it instead
 * of a dead end. Only names are read: nothing inside a folder is opened beyond its directory listing. A folder's kind
 * ("Node.js", "Go") comes from which marker files it has, so the page can tell two candidates apart.
 */
export const findNearbyApps = async (
  root: string,
  { limit = 6 }: { limit?: number } = {}
): Promise<Array<{ path: string; kind?: string }>> => {
  const found: Array<{ path: string; kind?: string }> = [];
  const visit = async (relative: string, depth: number) => {
    if (found.length >= limit || depth > 2) return;
    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
    try {
      entries = await readdir(join(root, relative), { withFileTypes: true });
    } catch {
      return;
    }
    if (depth > 0 && entries.some((entry) => entry.isFile() && APP_MARKERS.has(entry.name))) {
      const files = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));
      const kind = KIND_BY_MARKER.find(([marker]) => files.has(marker))?.[1];
      found.push(kind === undefined ? { path: relative } : { path: relative, kind });
      return;
    }
    for (const entry of entries.toSorted((left, right) => left.name.localeCompare(right.name))) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || SKIPPED.has(entry.name)) continue;
      await visit(relative === '' ? entry.name : `${relative}/${entry.name}`, depth + 1);
    }
  };
  await visit('', 0);
  return found;
};
