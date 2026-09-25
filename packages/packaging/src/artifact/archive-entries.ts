import type { Stats } from 'node:fs';
import { createHash } from 'node:crypto';
import { lstat, open, readdir, readlink, realpath, stat } from 'node:fs/promises';
import { basename, isAbsolute, join } from 'node:path';

/**
 * The rules every Lambda ZIP Stacktape builds follows, for functions and layers alike. Each such artifact's cache
 * identity includes this value, so an artifact zipped under earlier rules is rebuilt instead of reused. Change it
 * whenever `listArchiveEntries` can describe a different set of entries, modes or links for the same input.
 *
 * The first format was never named. Its fallback archiver stored every file as 0644, while native zip and 7-Zip stored
 * raw host modes and followed symbolic links, so a cached artifact from that format may be unusable.
 */
export const LAMBDA_ARCHIVE_FORMAT = 'stacktape-lambda-archive-2';

export const ARCHIVE_DIRECTORY_MODE = 0o755;
export const ARCHIVE_FILE_MODE = 0o644;
export const ARCHIVE_EXECUTABLE_FILE_MODE = 0o755;
export const ARCHIVE_SYMLINK_MODE = 0o777;

/** One archive entry. `path` is relative to the archive root, uses `/` and has no trailing slash. */
export type ArchiveEntry =
  | { type: 'directory'; path: string; mode: number }
  | { type: 'file'; path: string; sourcePath: string; size: number; mode: number }
  | { type: 'symlink'; path: string; target: string; mode: number };

/** A file or link the archive cannot represent faithfully, reported before anything is written. */
export class UnsupportedArchiveEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedArchiveEntryError';
  }
}

const MAX_SYMLINK_HOPS = 40;

/** Runs at most `limit` operations at once; a finishing operation hands its slot to the next one waiting, in order. */
const createLimiter = (limit: number) => {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async <T>(operation: () => Promise<T>): Promise<T> => {
    if (active < limit) {
      active += 1;
    } else {
      await new Promise<void>((wake) => waiting.push(wake));
    }
    try {
      return await operation();
    } finally {
      const next = waiting.shift();
      if (next) {
        next();
      } else {
        active -= 1;
      }
    }
  };
};

/**
 * Directory and file reads hold a file descriptor while they run. Every listing in the process shares this bound, so a
 * wide tree, many listings at once or a low descriptor limit cannot exhaust descriptors. `lstat` and friends use none.
 */
export const withFileDescriptor = createLimiter(32);

/**
 * ZIP readers treat a backslash as a path separator, so a POSIX name or link target containing one cannot be archived
 * so that every backend and extractor agrees on it. Windows names cannot contain one.
 */
const hasBackslash = (value: string, platform: NodeJS.Platform) => platform !== 'win32' && value.includes('\\');

/**
 * Matches an archive-relative path against the patterns release archives use: `*` stands for any run of characters in
 * an anchored pattern; a pattern without `*` matches that path or a path ending in `/<pattern>`.
 */
export const matchesExecutablePattern = (path: string, patterns: string[]): boolean =>
  patterns.some((pattern) => {
    if (pattern.includes('*')) {
      const source = pattern
        .split('*')
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');
      return new RegExp(`^${source}$`).test(path);
    }
    return path === pattern || path.endsWith(`/${pattern}`);
  });

/**
 * Whether a build input's execute bit reaches the archive: any execute bit (owner, group or other) on every host except
 * Windows. Lambda runs code as a different user from the file's owner, and generated, downloaded or copied files can be
 * executable for group or other only, so no single bit stands for the intent. Windows reports no execute bits, so there
 * the archive decides from file contents instead; see `getHostExecutableRule`.
 */
export const hasHostExecutableBit = (mode: number, platform: NodeJS.Platform = process.platform): boolean =>
  platform !== 'win32' && (mode & 0o111) !== 0;

/**
 * Names the rule a host follows to decide that a file is executable: any execute bit on POSIX, an ELF or `#!` header on
 * Windows. Identical bytes can get different modes under the two rules: a `#!` script with mode 0644 is archived as 0644
 * on Linux but 0755 on Windows. A cache identity that records executable state from the host therefore records this
 * name too, so an artifact built under one rule is never reused under the other. Rename a rule whenever it changes.
 */
export const getHostExecutableRule = (platform: NodeJS.Platform = process.platform) =>
  platform === 'win32' ? 'windows-elf-or-shebang-header-1' : 'posix-any-execute-bit-1';

/** An ELF binary or a `#!` script: what a Windows host can still recognize as executable without mode bits. */
const hasExecutableContent = async (path: string): Promise<boolean> => {
  const file = await open(path, 'r');
  try {
    const head = Buffer.alloc(4);
    const { bytesRead } = await file.read(head, 0, 4, 0);
    return (
      (bytesRead >= 2 && head[0] === 0x23 && head[1] === 0x21) ||
      (bytesRead === 4 && head[0] === 0x7f && head.toString('latin1', 1, 4) === 'ELF')
    );
  } finally {
    await file.close();
  }
};

const isExecutableFile = async ({
  path,
  sourcePath,
  hostMode,
  executablePatterns,
  platform
}: {
  path: string;
  sourcePath: string;
  hostMode: number;
  executablePatterns: string[];
  platform: NodeJS.Platform;
}) => {
  // Lambda executes a custom runtime's root `bootstrap` directly, whichever host built it.
  if (path === 'bootstrap' || matchesExecutablePattern(path, executablePatterns)) {
    return true;
  }
  return platform === 'win32'
    ? withFileDescriptor(() => hasExecutableContent(sourcePath))
    : hasHostExecutableBit(hostMode, platform);
};

const splitLinkTarget = (target: string, platform: NodeJS.Platform) =>
  (platform === 'win32' ? target.replace(/\\/g, '/') : target).split('/');

const isAbsoluteLinkTarget = (target: string) => /^([/\\]|[A-Za-z]:)/.test(target);

/**
 * The raw components of an absolute target below one of the root's spellings, or null when it does not start there.
 * Only the prefix is matched, component by component, so a sibling such as `/work/source-old` never matches
 * `/work/source`. Empty and `.` components are no-ops in the prefix; a `..` there is refused rather than resolved on the
 * host. Everything after the prefix is returned as written, so the caller resolves each `..` after the links before
 * it, as the kernel does, instead of collapsing it lexically.
 */
const rawComponentsBelowRoot = ({
  absolutePath,
  roots,
  platform
}: {
  absolutePath: string;
  roots: string[];
  platform: NodeJS.Platform;
}): string[] | null => {
  // Windows reports junction targets with the \\?\ long-path prefix and separates components with backslashes.
  const normalizeSeparators = (path: string) =>
    platform === 'win32' ? path.replace(/^\\\\\?\\/, '').replace(/\\/g, '/') : path;
  const comparable = (component: string) => (platform === 'win32' ? component.toLowerCase() : component);
  const targetComponents = normalizeSeparators(absolutePath).split('/');
  for (const root of roots) {
    const rootComponents = normalizeSeparators(root)
      .split('/')
      .filter((component) => component !== '' && component !== '.');
    let matched = 0;
    let index = 0;
    for (; index < targetComponents.length && matched < rootComponents.length; index++) {
      const component = targetComponents[index]!;
      if (component === '' || component === '.') {
        continue;
      }
      if (component === '..' || comparable(component) !== comparable(rootComponents[matched]!)) {
        break;
      }
      matched += 1;
    }
    if (matched === rootComponents.length) {
      return targetComponents.slice(index);
    }
  }
  return null;
};

/** The relative link text that leads from directory `from` to `to`, both given as components below the root. */
const relativeLinkTarget = (from: string[], to: string[]) => {
  let common = 0;
  while (common < from.length && common < to.length && from[common] === to[common]) {
    common += 1;
  }
  const parts = [...Array.from({ length: from.length - common }, () => '..'), ...to.slice(common)];
  return parts.length > 0 ? parts.join('/') : '.';
};

/**
 * How a link is stored, or why it cannot be. The target is followed one component at a time, through any other links
 * in the tree, as the kernel would resolve it after extraction: every `..` applies to the directory that the components
 * before it resolved to, a link is expanded before anything after it, and a component after a file, even an empty one
 * or `.`, makes the target invalid. The target must never leave the root and must name an existing entry.
 *
 * A relative target is kept as written. An absolute one below the root, as Windows junctions and some tools write, is
 * stored relative to the link's directory, pointing at the entry it resolved to, so it still resolves after extraction.
 * Nothing outside the root is ever read.
 */
const resolveSymlink = async ({
  root,
  roots,
  linkPath,
  target,
  platform,
  lstatCache
}: {
  root: string;
  /** The root's real path and the path it was given as: an absolute target may be written with either. */
  roots: string[];
  linkPath: string;
  target: string;
  platform: NodeJS.Platform;
  lstatCache: Map<string, Promise<Stats | null>>;
}): Promise<{ target: string } | { problem: string }> => {
  const lstatInsideRoot = (components: string[]) => {
    const key = components.join('/');
    if (!lstatCache.has(key)) {
      lstatCache.set(
        key,
        lstat(join(root, ...components)).catch(() => null)
      );
    }
    return lstatCache.get(key)!;
  };

  if (target === '') {
    return { problem: 'has an empty target' };
  }
  const linkDirectory = linkPath.split('/').slice(0, -1);
  const absolute = isAbsoluteLinkTarget(target);
  let pending: string[];
  // Physical components below the root: every link already expanded, so each is a real directory or the referent.
  let current: string[];
  if (absolute) {
    const components = rawComponentsBelowRoot({ absolutePath: target, roots, platform });
    if (!components) {
      return { problem: `points to the absolute path ${target}, outside the archived directory` };
    }
    pending = components;
    current = [];
  } else {
    pending = splitLinkTarget(target, platform);
    current = linkDirectory;
  }
  let hops = 0;
  while (pending.length > 0) {
    const component = pending.shift()!;
    if (component === '' || component === '.') {
      continue;
    }
    if (component === '..') {
      if (current.length === 0) {
        return { problem: `points to ${target}, outside the archived directory` };
      }
      current = current.slice(0, -1);
      continue;
    }
    const candidate = [...current, component];
    // oxlint-disable-next-line no-await-in-loop -- Each component depends on how the previous one resolved.
    const stats = await lstatInsideRoot(candidate);
    if (!stats) {
      return { problem: `points to ${target}, which does not exist` };
    }
    if (stats.isSymbolicLink()) {
      hops += 1;
      if (hops > MAX_SYMLINK_HOPS) {
        return { problem: `points to ${target}, which is part of a symbolic link loop` };
      }
      // oxlint-disable-next-line no-await-in-loop -- The next link's target decides the remaining components.
      const nestedTarget = await readlink(join(root, ...candidate));
      if (nestedTarget === '') {
        return { problem: `points to ${target}, which leads to a link with an empty target` };
      }
      if (isAbsoluteLinkTarget(nestedTarget)) {
        const components = rawComponentsBelowRoot({ absolutePath: nestedTarget, roots, platform });
        if (!components) {
          return { problem: `points to ${target}, which leads to ${nestedTarget}, outside the archived directory` };
        }
        pending.unshift(...components);
        current = [];
      } else {
        // A relative nested target starts from the directory holding that link, which is `current`.
        pending.unshift(...splitLinkTarget(nestedTarget, platform));
      }
      continue;
    }
    if (!stats.isDirectory() && pending.length > 0) {
      // `file/`, `file/.` and `file/x` all require a directory where there is a file.
      return { problem: `points to ${target}, which continues past the file ${candidate.join('/')}` };
    }
    current = candidate;
  }
  return {
    target: absolute ? relativeLinkTarget(linkDirectory, current) : splitLinkTarget(target, platform).join('/')
  };
};

const compareCodeUnits = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

/**
 * Everything an archive of `sourcePath` contains, in code-unit order, with the modes it must carry.
 *
 * A directory is archived as its contents: every regular file, directory and symbolic link below it, hidden ones
 * included. A single file becomes one entry named after it. Modes are normalized so the artifact means the same thing
 * on every host: directories 0755; files 0755 when executable, otherwise 0644; links 0777.
 *
 * A file is executable when it is the root `bootstrap`, when it matches an explicit executable pattern, or when the
 * host says so: any execute bit on POSIX, and an ELF or `#!` header on Windows, which has no execute bits.
 *
 * Symbolic links are stored as links and never followed. Only links to existing entries inside the root are supported;
 * an absolute one is stored relative to its directory. Any other link, any special file, and on POSIX hosts any name or
 * link target containing a backslash is an `UnsupportedArchiveEntryError` naming it.
 */
export const listArchiveEntries = async ({
  sourcePath,
  executablePatterns = [],
  platform = process.platform
}: {
  /** A directory, archived as its contents, or a single file. A link given here is followed: the caller chose it. */
  sourcePath: string;
  executablePatterns?: string[] | undefined;
  /** The host whose file metadata is read. Tests pass another platform to exercise its rules. */
  platform?: NodeJS.Platform | undefined;
}): Promise<{ root: string; isDirectory: boolean; entries: ArchiveEntry[] }> => {
  // Checked first: Bun's own path handling reads a POSIX backslash as a separator, so such a path does not resolve.
  if (hasBackslash(basename(sourcePath), platform)) {
    throw new UnsupportedArchiveEntryError(
      `Cannot archive ${sourcePath}: its name has a backslash, which ZIP readers treat as a path separator. Rename it.`
    );
  }
  const root = await realpath(sourcePath);
  const rootStats = await stat(root);
  if (rootStats.isFile()) {
    const path = basename(sourcePath);
    const executable = await isExecutableFile({
      path,
      sourcePath: root,
      hostMode: rootStats.mode,
      executablePatterns,
      platform
    });
    return {
      root,
      isDirectory: false,
      entries: [
        {
          type: 'file',
          path,
          sourcePath: root,
          size: rootStats.size,
          mode: executable ? ARCHIVE_EXECUTABLE_FILE_MODE : ARCHIVE_FILE_MODE
        }
      ]
    };
  }
  if (!rootStats.isDirectory()) {
    throw new UnsupportedArchiveEntryError(`Cannot archive ${sourcePath}: it is neither a file nor a directory.`);
  }

  const entries: ArchiveEntry[] = [];
  const lstatCache = new Map<string, Promise<Stats | null>>();
  // The root's real path, and the spelling it was given as when that cannot mean anything else: an absolute link
  // target may be written with either. A given path with `..` could name another directory after a link, so it is not
  // used.
  const roots = [root, ...(isAbsolute(sourcePath) && !sourcePath.split(/[\\/]/).includes('..') ? [sourcePath] : [])];
  const collect = async (directoryPath: string, relativeDirectory: string): Promise<void> => {
    await Promise.all(
      (await withFileDescriptor(() => readdir(directoryPath))).map(async (name) => {
        const absolutePath = join(directoryPath, name);
        const path = relativeDirectory ? `${relativeDirectory}/${name}` : name;
        if (hasBackslash(name, platform)) {
          throw new UnsupportedArchiveEntryError(
            `Cannot archive ${sourcePath}: ${path} has a backslash in its name, which ZIP readers treat as a path separator. Rename it.`
          );
        }
        const stats = await lstat(absolutePath);
        if (stats.isSymbolicLink()) {
          const target = await readlink(absolutePath);
          const link = hasBackslash(target, platform)
            ? { problem: `points to ${target}, a target with a backslash, which ZIP readers treat as a path separator` }
            : await resolveSymlink({ root, roots, linkPath: path, target, platform, lstatCache });
          if ('problem' in link) {
            throw new UnsupportedArchiveEntryError(
              `Cannot archive ${sourcePath}: the symbolic link ${path} ${link.problem}. Only links to files or directories inside the archived directory are kept as links. Replace this link with the file it points to, or remove it.`
            );
          }
          entries.push({ type: 'symlink', path, target: link.target, mode: ARCHIVE_SYMLINK_MODE });
        } else if (stats.isDirectory()) {
          entries.push({ type: 'directory', path, mode: ARCHIVE_DIRECTORY_MODE });
          await collect(absolutePath, path);
        } else if (stats.isFile()) {
          const executable = await isExecutableFile({
            path,
            sourcePath: absolutePath,
            hostMode: stats.mode,
            executablePatterns,
            platform
          });
          entries.push({
            type: 'file',
            path,
            sourcePath: absolutePath,
            size: stats.size,
            mode: executable ? ARCHIVE_EXECUTABLE_FILE_MODE : ARCHIVE_FILE_MODE
          });
        } else {
          throw new UnsupportedArchiveEntryError(
            `Cannot archive ${sourcePath}: ${path} is a special file (such as a socket or pipe), which an archive cannot contain.`
          );
        }
      })
    );
  };
  await collect(root, '');
  entries.sort((left, right) => compareCodeUnits(left.path, right.path));
  return { root, isDirectory: true, entries };
};

/**
 * The part of an archive's identity its file contents leave out: the archive format and each entry's kind, path,
 * normalized mode and link target. Callers already hash the contents themselves.
 */
export const getArchiveLayoutDigest = (entries: ArchiveEntry[]): string => {
  const hash = createHash('sha256');
  hash.update(`${LAMBDA_ARCHIVE_FORMAT}\n`);
  for (const entry of entries) {
    // One JSON record per line: JSON escapes line breaks, so no path or target can fake a record boundary.
    const record =
      entry.type === 'symlink'
        ? [entry.type, entry.path, entry.mode, entry.target]
        : [entry.type, entry.path, entry.mode];
    hash.update(`${JSON.stringify(record)}\n`);
  }
  return hash.digest('hex');
};
