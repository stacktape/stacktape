/**
 * Walking the repository, and describing its shape compactly enough to put in a prompt.
 *
 * Both halves matter. The listing is what every other probe filters; the rendered tree is what an
 * agent reads to decide where to look first, and a tree that lists four hundred React components in
 * full costs a fortune and communicates less than one that says there are four hundred.
 */

import { lstat, readFile, readdir, readlink, realpath } from 'node:fs/promises';
import { isAbsolute, join, posix, relative, resolve } from 'node:path';
import { classifyFileAccess, isDockerfilePath, isSkippedDirectoryName } from '../policy/file-access';
import { MAX_DOCKERFILE_LINK_DEPTH } from './dockerfile-definition';

export type RepositoryListing = {
  /** Repository-relative POSIX paths, sorted, excluding anything the policy blocks. */
  files: string[];
  /** True when the walk stopped at `maxFiles`; the listing is a prefix, not the whole repository. */
  truncated: boolean;
  /** Dockerfiles inside normally-generated directories, admitted by an explicit release descriptor. */
  descriptorDockerfiles: string[];
  /** Contained Dockerfile symlinks and their immediate repository-local targets. */
  dockerfileSymlinks: Array<{ path: string; target: string }>;
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
const RELEASE_DESCRIPTOR =
  /^(?:\.github\/workflows\/[^/]+\.ya?ml|\.github\/actions\/[^/]+\/action\.ya?ml|\.gitlab-ci\.ya?ml|Makefile|Taskfile\.ya?ml|justfile)$/i;
const MAX_RELEASE_DESCRIPTORS = 64;
const MAX_DESCRIPTOR_BYTES = 1_000_000;
const MAX_DESCRIPTOR_DOCKERFILES = 32;

const containedDockerfileSymlinkTarget = async (
  root: string,
  resolvedRoot: string,
  relativePath: string
): Promise<string | undefined> => {
  if (!isDockerfilePath(relativePath)) return undefined;
  try {
    const resolvedTarget = await realpath(join(root, relativePath));
    const relativeTarget = relative(resolvedRoot, resolvedTarget);
    if (
      relativeTarget === '' ||
      relativeTarget === '..' ||
      relativeTarget.startsWith(`..\\`) ||
      relativeTarget.startsWith('../') ||
      isAbsolute(relativeTarget)
    ) {
      return undefined;
    }
    const normalizedTarget = relativeTarget.replaceAll('\\', '/');
    if (!isDockerfilePath(normalizedTarget) || classifyFileAccess(normalizedTarget) === 'blocked') return undefined;
    const targetEntry = await lstat(resolvedTarget);
    if (!targetEntry.isFile()) return undefined;

    // Retain each hop rather than jumping to realpath's final target. Otherwise a real link could
    // skip an intermediate file excluded by maxFiles while its Windows pointer representation cannot.
    const link = await readlink(join(root, relativePath));
    // Absolute checkout-local links are not portable when Git materializes their bytes elsewhere.
    if (isAbsolute(link) || /^[A-Za-z]:/.test(link)) return undefined;
    const immediateTarget = relative(resolve(root), resolve(root, posix.dirname(relativePath), link)).replaceAll(
      '\\',
      '/'
    );
    if (
      immediateTarget === '..' ||
      immediateTarget.startsWith('../') ||
      isAbsolute(immediateTarget) ||
      !isDockerfilePath(immediateTarget) ||
      classifyFileAccess(immediateTarget) === 'blocked'
    ) {
      return undefined;
    }
    return immediateTarget;
  } catch {
    // Broken links and links whose final target cannot be inspected contribute no repository fact.
    return undefined;
  }
};

const normalizeDockerfileReference = (value: string): string | undefined => {
  const normalized = posix.normalize(value.replaceAll('\\', '/').replace(/^\.\//, ''));
  if (
    normalized === '' ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:/.test(normalized) ||
    /[$*?{}[\]]/.test(normalized) ||
    !isDockerfilePath(normalized)
  ) {
    return undefined;
  }
  return normalized;
};

const descriptorDockerfiles = async (root: string, listedFiles: readonly string[]): Promise<string[]> => {
  const references = new Set<string>();
  descriptorLoop: for (const descriptor of listedFiles
    .filter((file) => RELEASE_DESCRIPTOR.test(file))
    .slice(0, MAX_RELEASE_DESCRIPTORS)) {
    let raw: string;
    try {
      // Descriptor discovery is bounded separately from ordinary source reads because it runs before
      // the probe context exists. Oversized CI files contribute no exception to the generated-tree policy.
      // oxlint-disable-next-line no-await-in-loop -- deliberately bounded descriptor discovery.
      const descriptorStat = await lstat(join(root, descriptor));
      if (!descriptorStat.isFile() || descriptorStat.size > MAX_DESCRIPTOR_BYTES) continue;
      // oxlint-disable-next-line no-await-in-loop -- deliberately bounded descriptor discovery.
      raw = await readFile(join(root, descriptor), 'utf8');
    } catch {
      continue;
    }
    const patterns = [
      /(?:^|\s)(?:--file(?:=|\s+)|-f\s+)(["']?)([A-Za-z0-9_./\\-]+)\1/g,
      /^\s*(?:file|dockerfile)\s*:\s*(["']?)([A-Za-z0-9_./\\-]+)\1\s*$/gim
    ];
    for (const pattern of patterns) {
      for (const match of raw.matchAll(pattern)) {
        const normalized = normalizeDockerfileReference(match[2] ?? '');
        if (normalized !== undefined) {
          references.add(normalized);
          // Stop while parsing, before even one filesystem lookup. The descriptor and byte bounds
          // limit input size; this separate cardinality bound limits work caused by that input.
          if (references.size >= MAX_DESCRIPTOR_DOCKERFILES) break descriptorLoop;
        }
      }
    }
  }

  const existing: string[] = [];
  let resolvedRoot: string;
  try {
    resolvedRoot = await realpath(root);
  } catch {
    return [];
  }
  for (const reference of [...references].toSorted()) {
    try {
      const absolute = join(root, reference);
      // oxlint-disable-next-line no-await-in-loop -- at most the bounded reference set above.
      const finalEntry = await lstat(absolute);
      if (!finalEntry.isFile() || finalEntry.isSymbolicLink()) continue;
      // oxlint-disable-next-line no-await-in-loop -- checks parent-directory symlink escapes.
      const resolved = await realpath(absolute);
      const fromRoot = relative(resolvedRoot, resolved);
      if (fromRoot === '..' || fromRoot.startsWith(`..\\`) || fromRoot.startsWith('../') || isAbsolute(fromRoot)) {
        continue;
      }
      // Resolve every parent too: a plain file reached through a symlinked directory must not let a
      // release descriptor escape the repository boundary.
      existing.push(reference);
    } catch {
      // A stale release reference contributes no readable path.
    }
  }
  return existing;
};

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
  const dockerfileSymlinks: Array<{ path: string; target: string }> = [];
  let queue: string[] = [''];
  let truncated = false;
  let resolvedRoot: string | undefined;
  try {
    resolvedRoot = await realpath(root);
  } catch {
    // The ordinary walk can still report readable entries. It simply cannot prove symlink containment.
  }

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
        if (entry.isSymbolicLink()) {
          if (resolvedRoot === undefined) continue;
          // Only Dockerfile aliases affect deployment selection. Follow their final target after
          // proving it is a regular Dockerfile inside this repository; never traverse linked directories.
          // oxlint-disable-next-line no-await-in-loop -- one bounded lookup per top-level file alias.
          const target = await containedDockerfileSymlinkTarget(root, resolvedRoot, relativePath);
          if (target === undefined || classifyFileAccess(relativePath) === 'blocked') continue;
          if (files.length >= maxFiles) {
            truncated = true;
            break;
          }
          files.push(relativePath);
          dockerfileSymlinks.push({ path: relativePath, target });
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

  const referencedDockerfiles = await descriptorDockerfiles(root, files);
  for (const dockerfile of referencedDockerfiles) {
    if (files.includes(dockerfile)) continue;
    if (files.length >= maxFiles) {
      truncated = true;
      break;
    }
    files.push(dockerfile);
  }

  const listedFiles = new Set(files);
  const symlinkTargets = new Map(dockerfileSymlinks.map(({ path, target }) => [path, target]));
  const admittedDockerfileSymlinks = dockerfileSymlinks.filter(({ path }) => {
    let current = path;
    const visited = new Set<string>();
    for (let depth = 0; depth < MAX_DOCKERFILE_LINK_DEPTH; depth += 1) {
      if (!listedFiles.has(current) || visited.has(current)) return false;
      visited.add(current);
      const target = symlinkTargets.get(current);
      if (target === undefined) return true;
      current = target;
    }
    return false;
  });
  const admittedDockerfileAliases = new Set(admittedDockerfileSymlinks.map(({ path }) => path));
  const unadmittedDockerfileAliases = new Set(
    dockerfileSymlinks.filter(({ path }) => !admittedDockerfileAliases.has(path)).map(({ path }) => path)
  );
  const admittedFiles = files.filter((file) => !unadmittedDockerfileAliases.has(file));

  return {
    files: admittedFiles.toSorted(),
    truncated,
    descriptorDockerfiles: referencedDockerfiles.filter((file) => admittedFiles.includes(file)),
    dockerfileSymlinks: admittedDockerfileSymlinks.toSorted((left, right) => left.path.localeCompare(right.path))
  };
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
