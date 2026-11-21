/**
 * The repository's file names, for the wizard page to draw the project while the analysis reads it.
 *
 * Names only, never contents, and only what a developer would call the project: the walk skips what the file-access
 * policy skips (`.git`, `node_modules`, build output, virtualenvs, caches, credential files) and whatever the
 * repository's own `.gitignore` files exclude. It reads `.gitignore` itself rather than asking git, so it works where
 * git is not installed and starts no process inside the user's repository (`detect-host.ts` reads `.git/config` for
 * the same reason). Bounded in files, directories and time, so a huge repository costs the page a truncated tree, not
 * a slow one.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { classifyFileAccess, isSkippedDirectory } from '@stacktape/config-inference/policy';

/** More files than this, and the tree is cut (breadth-first, so every top-level folder is still there). */
export const REPOSITORY_TREE_MAX_FILES = 5000;
/** Directories read at most, for a repository of many small folders. */
const MAX_DIRECTORIES = 20_000;
/** The walk stops after this long and returns what it has, marked truncated. */
const MAX_WALK_MS = 2000;

/**
 * Folders with nothing a person would call the project, beyond the policy's: tool caches and deploy tools' output.
 * Usually gitignored as well; listed so a repository without a `.gitignore` is not drawn as a cache.
 */
const EXTRA_SKIPPED_DIRECTORIES: ReadonlySet<string> = new Set([
  '.angular',
  '.aws-sam',
  '.cache',
  '.docusaurus',
  '.expo',
  '.mypy_cache',
  '.netlify',
  '.output',
  '.parcel-cache',
  '.ruff_cache',
  '.serverless',
  '.tox',
  '.vercel',
  '.yarn'
]);

export type RepositoryTree = {
  /** Repository-relative POSIX paths of files, sorted. */
  files: string[];
  /** The walk stopped at a limit: `files` is the shallow part of the repository, not all of it. */
  truncated: boolean;
};

type IgnoreRule = {
  /** The folder whose `.gitignore` holds the rule, `''` for the root. */
  base: string;
  pattern: RegExp;
  negated: boolean;
  directoryOnly: boolean;
};

/** One `.gitignore` glob as a regular expression over a path relative to `base`. */
const globToRegExp = (glob: string, anchored: boolean): RegExp => {
  let source = '';
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index]!;
    if (character === '*') {
      if (glob[index + 1] === '*') {
        // `**/` matches any number of folders, `/**` everything inside, a lone `**` anything.
        if (glob[index + 2] === '/') {
          source += '(?:.*/)?';
          index += 2;
        } else {
          source += '.*';
          index += 1;
        }
      } else {
        source += '[^/]*';
      }
    } else if (character === '?') {
      source += '[^/]';
    } else if (character === '[') {
      const end = glob.indexOf(']', index + 1);
      if (end < 0) {
        source += '\\[';
      } else {
        const body = glob
          .slice(index + 1, end)
          .replace(/^!/, '^')
          .replaceAll('\\', '\\\\');
        source += `[${body}]`;
        index = end;
      }
    } else if (character === '\\' && index + 1 < glob.length) {
      index += 1;
      source += glob[index]!.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    } else {
      source += character.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    }
  }
  // An unanchored pattern (no slash before its end) matches a name at any depth below its `.gitignore`.
  return new RegExp(`^${anchored ? '' : '(?:.*/)?'}${source}$`);
};

/** The rules of one `.gitignore`, in file order (the last match wins). */
export const parseGitignore = (text: string, base: string): IgnoreRule[] =>
  text.split(/\r?\n/).flatMap((raw): IgnoreRule[] => {
    let line = raw.replace(/(?<!\\)\s+$/, '');
    if (line === '' || line.startsWith('#')) return [];
    const negated = line.startsWith('!');
    if (negated) line = line.slice(1);
    if (line.startsWith('\\#') || line.startsWith('\\!')) line = line.slice(1);
    const directoryOnly = line.endsWith('/');
    if (directoryOnly) line = line.slice(0, -1);
    const anchored = line.includes('/');
    if (line.startsWith('/')) line = line.slice(1);
    if (line === '') return [];
    return [{ base, pattern: globToRegExp(line, anchored), negated, directoryOnly }];
  });

/** Whether the rules in force at a path exclude it. */
export const isIgnored = (rules: readonly IgnoreRule[], path: string, isDirectory: boolean): boolean => {
  let ignored = false;
  for (const rule of rules) {
    if (rule.directoryOnly && !isDirectory) continue;
    if (rule.base !== '' && !path.startsWith(`${rule.base}/`)) continue;
    const relativePath = rule.base === '' ? path : path.slice(rule.base.length + 1);
    if (rule.pattern.test(relativePath)) ignored = !rule.negated;
  }
  return ignored;
};

const byName = (left: { name: string }, right: { name: string }) =>
  left.name < right.name ? -1 : left.name > right.name ? 1 : 0;

/**
 * Lists the repository's files breadth-first, the way the page draws them. Never throws: an unreadable folder is
 * skipped, and a missing repository is an empty tree.
 */
export const readRepositoryTree = async ({
  repositoryRoot,
  maxFiles = REPOSITORY_TREE_MAX_FILES,
  now = () => performance.now()
}: {
  repositoryRoot: string;
  maxFiles?: number;
  now?: () => number;
}): Promise<RepositoryTree> => {
  const deadline = now() + MAX_WALK_MS;
  const files: string[] = [];
  let truncated = false;
  let directoriesRead = 0;
  // Each folder carries the rules of every `.gitignore` above it and its own.
  let queue: Array<{ path: string; rules: IgnoreRule[] }> = [{ path: '', rules: [] }];

  walk: while (queue.length > 0) {
    const next: typeof queue = [];
    for (const directory of queue) {
      if (files.length >= maxFiles || directoriesRead >= MAX_DIRECTORIES || now() > deadline) {
        truncated = true;
        break walk;
      }
      directoriesRead += 1;
      const absolute = join(repositoryRoot, directory.path);
      // Breadth-first: each folder waits for the one before it, so a cut keeps the top of every branch.
      const entries = await readdir(absolute, { withFileTypes: true }).catch(() => undefined);
      if (entries === undefined) continue;
      const ownIgnore = entries.some((entry) => entry.name === '.gitignore' && entry.isFile())
        ? await readFile(join(absolute, '.gitignore'), 'utf8').catch(() => '')
        : '';
      const rules =
        ownIgnore === '' ? directory.rules : [...directory.rules, ...parseGitignore(ownIgnore, directory.path)];
      for (const entry of entries.toSorted(byName)) {
        const path = directory.path === '' ? entry.name : `${directory.path}/${entry.name}`;
        if (entry.isDirectory()) {
          if (
            isSkippedDirectory(entry.name, directory.path.split('/').at(-1)) ||
            EXTRA_SKIPPED_DIRECTORIES.has(entry.name) ||
            isIgnored(rules, path, true)
          ) {
            continue;
          }
          next.push({ path, rules });
        } else if (entry.isFile() && classifyFileAccess(path) !== 'blocked' && !isIgnored(rules, path, false)) {
          if (files.length >= maxFiles) {
            truncated = true;
            break walk;
          }
          files.push(path);
        }
        // Symbolic links are left out: a link can point outside the repository, and its name is not the project.
      }
    }
    queue = next;
  }

  return { files: files.toSorted(), truncated };
};
