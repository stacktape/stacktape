/**
 * Walking the repository, and describing its shape compactly enough to put in a prompt.
 *
 * Both halves matter. The listing is what every other probe filters; the rendered tree is what an
 * agent reads to decide where to look first, and a tree that lists four hundred React components in
 * full costs a fortune and communicates less than one that says there are four hundred.
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { classifyFileAccess, isSkippedDirectoryName } from '../policy/file-access';

export type RepositoryListing = {
  /** Repository-relative POSIX paths, sorted, excluding anything the policy blocks. */
  files: string[];
  /** True when the walk stopped at `maxFiles`; the listing is a prefix, not the whole repository. */
  truncated: boolean;
};

export type ListRepositoryFilesOptions = {
  /**
   * Upper bound on returned paths.
   *
   * A generated-code monorepo or an accidentally-committed dataset can hold millions of files. The
   * cap keeps a pathological repository from turning the first ten seconds of the wizard into a
   * filesystem walk, at the cost of a truncated brief that we then say is truncated.
   */
  maxFiles?: number;
};

const DEFAULT_MAX_FILES = 20_000;

/**
 * List every file the policy permits, breadth-first.
 *
 * Breadth-first rather than depth-first so that hitting the cap yields a shallow view of the whole
 * repository instead of an exhaustive view of whichever directory happened to sort first. A
 * truncated brief that shows every top-level app is far more useful than one that shows all of
 * `apps/admin` and nothing else.
 */
export const listRepositoryFiles = async (
  root: string,
  options: ListRepositoryFilesOptions = {}
): Promise<RepositoryListing> => {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const files: string[] = [];
  let queue: string[] = [''];
  let truncated = false;

  while (queue.length > 0 && !truncated) {
    const nextQueue: string[] = [];

    for (const relativeDirectory of queue) {
      let entries;
      try {
        // The walk stops at the cap, so reading a whole level up front would read directories the
        // cap makes irrelevant.
        // oxlint-disable-next-line no-await-in-loop -- see above.
        entries = await readdir(join(root, relativeDirectory), { withFileTypes: true });
      } catch {
        // Unreadable directories are a fact of life on a developer's machine (permissions, broken
        // symlinks, files being written). Skipping one costs a little signal; failing the whole scan
        // costs the user the feature.
        continue;
      }

      // Sorted before the cap, not after. Sorting only the survivors would make *which* files
      // survive depend on filesystem enumeration order, so a truncated scan of the same repository
      // could describe a different project on two machines.
      entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));

      for (const entry of entries) {
        const relativePath = relativeDirectory === '' ? entry.name : `${relativeDirectory}/${entry.name}`;

        if (entry.isDirectory()) {
          if (!isSkippedDirectoryName(entry.name)) {
            nextQueue.push(relativePath);
          }
          continue;
        }
        if (!entry.isFile()) {
          continue;
        }
        if (classifyFileAccess(relativePath) === 'blocked') {
          continue;
        }
        if (files.length >= maxFiles) {
          truncated = true;
          break;
        }
        files.push(relativePath);
      }

      if (truncated) {
        break;
      }
    }

    queue = nextQueue.toSorted();
  }

  return { files: files.toSorted(), truncated };
};

export type RenderFileTreeOptions = {
  /**
   * How many files sharing an extension are listed per directory before the rest are counted.
   *
   * Three is enough to establish a naming convention, which is all the detail an agent needs from a
   * directory of components.
   */
  maxPerExtensionPerDirectory?: number;
};

const DEFAULT_MAX_PER_EXTENSION = 3;

type TreeDirectory = {
  directories: Map<string, TreeDirectory>;
  files: string[];
  /** Elided counts per extension, so the tree can say what it left out instead of hiding it. */
  elided: Map<string, number>;
};

const emptyDirectory = (): TreeDirectory => ({ directories: new Map(), files: [], elided: new Map() });

const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot) : '';
};

/**
 * Render a listing as an indented tree, capping repetitive files per directory.
 *
 * The cap is applied per extension per directory and the remainder is reported as a count. That is
 * the one thing the original scanner did not do: silently dropping files makes a 400-component
 * directory look like a 3-component directory, which is actively misleading about the size of the
 * codebase.
 */
export const renderFileTree = (files: readonly string[], options: RenderFileTreeOptions = {}): string => {
  const maxPerExtension = options.maxPerExtensionPerDirectory ?? DEFAULT_MAX_PER_EXTENSION;
  const root = emptyDirectory();

  for (const path of files) {
    const segments = path.split('/');
    const fileName = segments.pop();
    if (fileName === undefined) {
      continue;
    }

    let current = root;
    for (const segment of segments) {
      let child = current.directories.get(segment);
      if (child === undefined) {
        child = emptyDirectory();
        current.directories.set(segment, child);
      }
      current = child;
    }

    const extension = extensionOf(fileName);
    const shown = current.files.filter((name) => extensionOf(name) === extension).length;
    if (shown < maxPerExtension) {
      current.files.push(fileName);
    } else {
      current.elided.set(extension, (current.elided.get(extension) ?? 0) + 1);
    }
  }

  const lines: string[] = [];

  const write = (directory: TreeDirectory, indent: string): void => {
    for (const name of [...directory.directories.keys()].toSorted()) {
      lines.push(`${indent}${name}/`);
      write(directory.directories.get(name)!, `${indent}  `);
    }
    for (const name of [...directory.files].toSorted()) {
      lines.push(`${indent}${name}`);
    }
    for (const extension of [...directory.elided.keys()].toSorted()) {
      const count = directory.elided.get(extension)!;
      const label = extension === '' ? 'more files' : `more ${extension} files`;
      lines.push(`${indent}… ${count} ${label}`);
    }
  };

  write(root, '');
  return lines.join('\n');
};
