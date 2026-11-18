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

const SKIPPED = new Set(['node_modules', 'vendor', 'dist', 'build', 'target', 'venv', '__pycache__', 'coverage']);

/**
 * Folders up to two levels below the project that look like apps, for a run that found nothing to deploy here.
 *
 * Someone who runs init one level too high (a monorepo root, a folder of projects) gets told where to run it instead
 * of a dead end. Only names are read: nothing inside a folder is opened beyond its directory listing.
 */
export const findNearbyApps = async (root: string, { limit = 6 }: { limit?: number } = {}): Promise<string[]> => {
  const found: string[] = [];
  const visit = async (relative: string, depth: number) => {
    if (found.length >= limit || depth > 2) return;
    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
    try {
      entries = await readdir(join(root, relative), { withFileTypes: true });
    } catch {
      return;
    }
    if (depth > 0 && entries.some((entry) => entry.isFile() && APP_MARKERS.has(entry.name))) {
      found.push(relative);
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
