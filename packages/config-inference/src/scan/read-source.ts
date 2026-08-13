/**
 * Reading a file the way this pipeline needs it read: policy first, then a budget.
 *
 * The budget half is inherited from the pipeline this replaces, and it is the part most worth
 * keeping. A generic reader hands back a megabyte of lockfile and calls it context; this one knows
 * that a `package.json` is interesting for about fifteen of its keys, that a lockfile is interesting
 * for none of them, and that a Dockerfile is short and entirely load-bearing. That difference used
 * to matter for our own inference bill. Now it comes out of the user's subscription, so it matters
 * more.
 */

import { open, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { classifyFileAccess, extractEnvironmentVariableNames } from '../policy/file-access';

/** Files above this never land in memory whole; a bounded prefix is read instead. */
const MAX_BYTES_READ = 1_000_000;

/** Ceiling on returned text regardless of type, so one enormous minified line cannot blow the budget. */
const MAX_CHARACTERS_RETURNED = 200_000;

export type SourceRead =
  | {
      kind: 'contents';
      path: string;
      contents: string;
      /**
       * 1-based line number of the first returned line, and of the last.
       *
       * Returned so the caller can number the lines it shows. That numbering is what makes a
       * citation trustworthy: an agent quoting a line it saw numbered will cite the number the
       * verifier later resolves, and a paged read stays consistent with the whole file.
       */
      startLine: number;
      endLine: number;
      /** Lines in the file as it exists on disk, even when `contents` holds fewer. */
      totalLines: number;
      truncated: boolean;
      /** Why the content differs from the file on disk, when it does. */
      note?: string;
    }
  | { kind: 'names-only'; path: string; environmentVariableNames: string[] }
  | { kind: 'blocked'; path: string; reason: string }
  | { kind: 'unreadable'; path: string; reason: string };

export type ReadSourceFileOptions = {
  /** First line to return, 1-based inclusive. */
  startLine?: number;
  /** Last line to return, 1-based inclusive. */
  endLine?: number;
};

/**
 * Keys of a `package.json` worth spending tokens on.
 *
 * Everything here answers a question the pipeline actually asks — what runs this, what does it
 * depend on, how is it built, is it a workspace root. The keys left out (`eslintConfig`, `jest`,
 * `browserslist`, `lint-staged`, and the rest of the tool-configuration sprawl) answer none of them
 * and are frequently longer than the parts that do.
 */
const PACKAGE_JSON_KEYS: readonly string[] = [
  'name',
  'version',
  'private',
  'type',
  'main',
  'module',
  'exports',
  'bin',
  'scripts',
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'workspaces',
  'packageManager',
  'engines'
];

const LOCK_FILE_NAMES: ReadonlySet<string> = new Set([
  'bun.lock',
  'bun.lockb',
  'Cargo.lock',
  'composer.lock',
  'Gemfile.lock',
  'package-lock.json',
  'pnpm-lock.yaml',
  'poetry.lock',
  'uv.lock',
  'yarn.lock'
]);

/**
 * Line budget by file type.
 *
 * Files whose whole point is short and declarative are never cut. Application source is cut,
 * because the top of a file carries its imports, framework and entry shape, which is what we are
 * reading it for.
 */
const lineBudgetFor = (fileName: string): number => {
  if (/^Dockerfile/i.test(fileName) || /^(docker-)?compose\.ya?ml$/i.test(fileName)) {
    return Number.POSITIVE_INFINITY;
  }
  if (/^(Procfile|Makefile|\.gitlab-ci\.yml|fly\.toml|render\.yaml|vercel\.json)$/i.test(fileName)) {
    return Number.POSITIVE_INFINITY;
  }
  if (/\.(json|ya?ml|toml|ini|cfg|env|properties)$/i.test(fileName)) {
    return 400;
  }
  if (/^README/i.test(fileName)) {
    return 120;
  }
  if (/\.(ts|tsx|js|jsx|mjs|cjs|py|go|rb|rs|java|kt|cs|php|ex|exs|scala|swift)$/i.test(fileName)) {
    return 250;
  }
  return 150;
};

const digestPackageJson = (contents: string): string | undefined => {
  try {
    const parsed = JSON.parse(contents) as Record<string, unknown>;
    const digest: Record<string, unknown> = {};
    for (const key of PACKAGE_JSON_KEYS) {
      if (parsed[key] !== undefined) {
        digest[key] = parsed[key];
      }
    }
    return JSON.stringify(digest, null, 2);
  } catch {
    // Malformed package.json is itself a useful signal, and the raw text is the only way to see it.
    return undefined;
  }
};

const clampToCharacterCeiling = (text: string): { text: string; clamped: boolean } =>
  text.length > MAX_CHARACTERS_RETURNED
    ? { text: text.slice(0, MAX_CHARACTERS_RETURNED), clamped: true }
    : { text, clamped: false };

/**
 * Read one repository-relative file under `root`, applying access policy and the type budget.
 *
 * Containment is the caller's job — this trusts that `repoRelativePath` has already been resolved
 * and checked against the declared roots. Doing it in both places would let the two drift, and the
 * tool layer is the one holding the filesystem handles needed to catch a symlink escape.
 */
export const readSourceFile = async (
  root: string,
  repoRelativePath: string,
  options: ReadSourceFileOptions = {}
): Promise<SourceRead> => {
  const access = classifyFileAccess(repoRelativePath);
  if (access === 'blocked') {
    return {
      kind: 'blocked',
      path: repoRelativePath,
      reason: 'This file may hold credentials and is never opened.'
    };
  }

  const absolutePath = join(root, repoRelativePath);
  const fileName = basename(repoRelativePath);

  let sizeInBytes: number;
  try {
    sizeInBytes = (await stat(absolutePath)).size;
  } catch (error) {
    return {
      kind: 'unreadable',
      path: repoRelativePath,
      reason: error instanceof Error ? error.message : 'File could not be opened.'
    };
  }

  let raw: string;
  let prefixOnly = false;
  try {
    if (sizeInBytes > MAX_BYTES_READ) {
      // Stat before read so a multi-gigabyte file never lands in memory whole.
      const handle = await open(absolutePath, 'r');
      try {
        const buffer = Buffer.alloc(MAX_BYTES_READ);
        const { bytesRead } = await handle.read(buffer, 0, MAX_BYTES_READ, 0);
        raw = buffer.subarray(0, bytesRead).toString('utf8');
      } finally {
        await handle.close();
      }
      prefixOnly = true;
    } else {
      raw = await readFile(absolutePath, 'utf8');
    }
  } catch (error) {
    return {
      kind: 'unreadable',
      path: repoRelativePath,
      reason: error instanceof Error ? error.message : 'File could not be read.'
    };
  }

  if (access === 'names-only') {
    return {
      kind: 'names-only',
      path: repoRelativePath,
      environmentVariableNames: extractEnvironmentVariableNames(raw)
    };
  }

  if (LOCK_FILE_NAMES.has(fileName)) {
    // The manifest already names every direct dependency. A lockfile adds only the transitive
    // closure, which never changes what infrastructure a project needs.
    return {
      kind: 'contents',
      path: repoRelativePath,
      contents: '',
      // An empty range: `endLine` before `startLine` says "nothing returned" without inventing a line.
      startLine: 1,
      endLine: 0,
      totalLines: 0,
      truncated: true,
      note: 'Lock file omitted. Read the manifest for declared dependencies.'
    };
  }

  if (fileName === 'package.json') {
    const digest = digestPackageJson(raw);
    if (digest !== undefined) {
      const { text, clamped } = clampToCharacterCeiling(digest);
      const digestLines = digest.split(/\r?\n/).length;
      return {
        kind: 'contents',
        path: repoRelativePath,
        contents: text,
        startLine: 1,
        endLine: digestLines,
        totalLines: digestLines,
        truncated: clamped,
        // Said plainly because it is a trap: this is a rewritten document, so its line numbers do
        // not correspond to the file on disk. Citations into a manifest must be resolved by
        // matching the quote anywhere in the real file, never by line.
        note: 'Reduced to the fields describing how this package runs, builds and depends. Line numbers refer to this reduced view, not to the file on disk.'
      };
    }
  }

  const allLines = raw.split(/\r?\n/);
  const explicitRange = options.startLine !== undefined || options.endLine !== undefined;
  const startLine = Math.max(1, Math.min(options.startLine ?? 1, allLines.length));
  const budget = explicitRange ? Number.POSITIVE_INFINITY : lineBudgetFor(fileName);
  const requestedEnd = options.endLine ?? allLines.length;
  const budgetedEnd = Number.isFinite(budget) ? startLine + budget - 1 : requestedEnd;
  const endLine = Math.max(startLine, Math.min(requestedEnd, budgetedEnd, allLines.length));

  const selected = allLines.slice(startLine - 1, endLine).join('\n');
  const { text, clamped } = clampToCharacterCeiling(selected);
  const omittedLines = allLines.length - (endLine - startLine + 1);

  const notes: string[] = [];
  if (prefixOnly) {
    notes.push(`File is ${sizeInBytes} bytes; only the first ${MAX_BYTES_READ} were examined.`);
  }
  if (omittedLines > 0 && !explicitRange) {
    // The default budget is a first page, never an amputation: a caller that needs the line beyond
    // it has to be told the line exists and how to ask for it, or the budget quietly costs us the
    // one line a claim depended on.
    notes.push(`Showing lines ${startLine}-${endLine} of ${allLines.length}. Request a line range to read further.`);
  }
  if (clamped) {
    notes.push('Output reached the character ceiling and was cut.');
  }

  return {
    kind: 'contents',
    path: repoRelativePath,
    contents: text,
    startLine,
    endLine,
    totalLines: allLines.length,
    truncated: prefixOnly || clamped || omittedLines > 0,
    ...(notes.length > 0 ? { note: notes.join(' ') } : {})
  };
};
