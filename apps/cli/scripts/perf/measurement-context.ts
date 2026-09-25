/**
 * What a measurement report must record to be comparable later: the exact source it ran, the machine it ran on, the
 * load that machine was under, and an output directory the tool owns. Everything here is read locally; nothing
 * contacts a network service.
 */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import { arch, cpus, loadavg, platform, release, totalmem } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

/**
 * The source a measurement ran, relative to Git: the commit plus every uncommitted change under `scopes`. The identity
 * is all or nothing. If any Git query fails it is unavailable and carries only the reason, because partial data could
 * make two different trees look identical.
 */
export type SourceIdentity = {
  available: boolean;
  /** Why the identity could not be read; null when available. */
  reason: string | null;
  revision: string | null;
  /**
   * SHA-256 over the tracked working-tree difference from `revision` and every untracked entry under `scopes`: its path,
   * kind and executable intent, and a regular file's bytes or a symlink's target. Same revision and hash means the same
   * source.
   */
  changesSha256: string | null;
  /** For reading only: `git status` entries under the scopes, not part of the comparison. */
  changedPaths: string[];
  scopes: string[];
  /** Repository-relative output directories kept out of the identity. */
  excluded: string[];
};

/** `unavailable` whenever either side could not be read: a failed capture never counts as unchanged. */
export type SourceCheck = 'unchanged' | 'changed' | 'unavailable';

export type SourceIdentityOptions = {
  repoRoot: string;
  scopes: string[];
  /** Directories the tool writes into; outputs inside the checkout must not look like source changes. */
  excludePaths?: string[] | undefined;
};

export type HostEnvironment = {
  bun: string;
  platform: string;
  arch: string;
  osRelease: string;
  cpuModel: string;
  logicalCpus: number;
  totalMemoryBytes: number;
};

/** Read-only Git: no optional index lock, no colour, no external diff driver or text conversion. */
const runGit = (repoRoot: string, args: string[]): Buffer => {
  const result = Bun.spawnSync(['git', '--no-optional-locks', ...args], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe'
  });
  if (result.exitCode !== 0) {
    throw new Error(`git ${args[0]} exited with ${result.exitCode}: ${result.stderr.toString().trim()}`);
  }
  return result.stdout;
};

const toRepositoryPath = (repoRoot: string, path: string) => {
  const absolutePath = resolve(path);
  const realPath = existsSync(absolutePath) ? realpathSync(absolutePath) : absolutePath;
  return relative(realpathSync(repoRoot), realPath).split('\\').join('/');
};

/** One entry per changed path; a rename or copy is written as `R  new <- old`. */
const parseStatus = (output: Buffer): string[] => {
  const tokens = output.toString().split('\0');
  const entries: string[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    if (!token) continue;
    const code = token.slice(0, 2);
    const renamedFrom = code.includes('R') || code.includes('C') ? tokens[++index] : undefined;
    entries.push(`${code} ${token.slice(3)}${renamedFrom ? ` <- ${renamedFrom}` : ''}`);
  }
  return entries;
};

/** An untracked entry as Git would store it: a symlink by its target, a file by its bytes and executable intent. */
const describeUntrackedEntry = (repoRoot: string, path: string): { header: object; content?: Buffer } => {
  const absolutePath = join(repoRoot, path);
  const stats = lstatSync(absolutePath);
  if (stats.isSymbolicLink()) {
    return { header: { path, kind: 'symlink', target: readlinkSync(absolutePath) } };
  }
  if (stats.isFile()) {
    const content = readFileSync(absolutePath);
    return { header: { path, kind: 'file', executable: (stats.mode & 0o111) !== 0, bytes: content.length }, content };
  }
  return { header: { path, kind: stats.isDirectory() ? 'directory' : 'other' } };
};

export const getSourceIdentity = ({ repoRoot, scopes, excludePaths = [] }: SourceIdentityOptions): SourceIdentity => {
  let excluded: string[] = [];
  try {
    // Outputs outside the checkout cannot affect Git, and an output at the checkout root would exclude everything.
    excluded = excludePaths
      .map((path) => toRepositoryPath(repoRoot, path))
      .filter((path) => path !== '' && !path.startsWith('..') && !isAbsolute(path));
    const pathspecs = [
      ...scopes.map((scope) => `:(literal)${scope}`),
      ...excluded.map((path) => `:(exclude,literal)${path}`)
    ];
    const revision = runGit(repoRoot, ['rev-parse', '--verify', 'HEAD']).toString().trim();
    const status = runGit(repoRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...pathspecs]);
    const diff = runGit(repoRoot, [
      'diff',
      '--no-color',
      '--no-ext-diff',
      '--no-textconv',
      '--binary',
      'HEAD',
      '--',
      ...pathspecs
    ]);
    const untracked = runGit(repoRoot, ['ls-files', '--others', '--exclude-standard', '-z', '--', ...pathspecs])
      .toString()
      .split('\0')
      .filter(Boolean)
      .toSorted();
    const hash = createHash('sha256');
    // Each section declares its length, so no concatenation of entries can alias another.
    hash.update(`tracked-diff ${diff.length}\n`);
    hash.update(diff);
    for (const path of untracked) {
      const { header, content } = describeUntrackedEntry(repoRoot, path);
      hash.update(`${JSON.stringify(header)}\n`);
      if (content) hash.update(content);
    }
    return {
      available: true,
      reason: null,
      revision,
      changesSha256: hash.digest('hex'),
      changedPaths: parseStatus(status),
      scopes,
      excluded
    };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : String(error),
      revision: null,
      changesSha256: null,
      changedPaths: [],
      scopes,
      excluded
    };
  }
};

/** The identity in one line of a report: revision and changes hash, or why it is unavailable. */
export const describeSourceIdentity = (identity: SourceIdentity) =>
  identity.available
    ? `${identity.revision} ${identity.changedPaths.length ? `with ${identity.changedPaths.length} changed paths in scope (changes SHA-256 ${identity.changesSha256})` : 'with no changes in scope'}`
    : `unavailable (${identity.reason})`;

export const compareSourceIdentities = (before: SourceIdentity, after: SourceIdentity): SourceCheck => {
  if (!before.available || !after.available) return 'unavailable';
  return before.revision === after.revision && before.changesSha256 === after.changesSha256 ? 'unchanged' : 'changed';
};

/** The least trustworthy of several checks: a known change first, then any capture that could not be read. */
export const combineSourceChecks = (checks: SourceCheck[]): SourceCheck =>
  checks.includes('changed') ? 'changed' : checks.includes('unavailable') ? 'unavailable' : 'unchanged';

/**
 * Captures the source once, then compares every later capture with that first one. A tool calls `check` after each
 * build or sample, so a result can be attributed to the source it started from.
 */
export const createSourceTracker = (options: SourceIdentityOptions) => {
  const before = getSourceIdentity(options);
  let after = before;
  return {
    before,
    get after() {
      return after;
    },
    check: (): SourceCheck => {
      after = getSourceIdentity(options);
      return compareSourceIdentities(before, after);
    }
  };
};

/**
 * Creates `directory`, or accepts it when it exists and is empty. The tool then owns everything it creates there and
 * removes only that. Any existing content is refused, so a mistyped `--out` never deletes or overwrites someone's files.
 */
export const claimOutputDirectory = async (directory: string) => {
  const entries = await readdir(directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw new Error(`Cannot use ${directory} as an output directory: ${error.message}`);
  });
  if (entries === null) {
    await mkdir(directory, { recursive: true });
  } else if (entries.length > 0) {
    throw new Error(`Refusing to write into ${directory}: it is not empty. Choose a new or empty output directory.`);
  }
};

export const getHostEnvironment = (): HostEnvironment => {
  const processors = cpus();
  return {
    bun: Bun.version,
    platform: platform(),
    arch: arch(),
    osRelease: release(),
    cpuModel: processors[0]?.model.trim() ?? 'unknown',
    logicalCpus: processors.length,
    totalMemoryBytes: totalmem()
  };
};

/** One-minute load average, so a report shows whether another workload competed with the measurement. */
export const getLoadAverage = (): number => Number(loadavg()[0].toFixed(2));

export type Distribution = { count: number; median: number; min: number; max: number };

/** Median and range; a report makes no tail-latency claim from a handful of samples. */
export const summarize = (values: number[]): Distribution | null => {
  if (values.length === 0) return null;
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  return { count: sorted.length, median, min: sorted[0], max: sorted.at(-1)! };
};
