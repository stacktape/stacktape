/**
 * The text of a repository file the wizard page may show: the files the analysis actually looked at.
 *
 * The page shows the code being read while the analysis runs, and later the line each resource came from. That is a
 * read of the user's repository over HTTP, so it is fenced in on every side:
 *
 * - **Only files this session has seen.** A path the scan timeline named, or one cited as evidence by the facts or
 *   the composition. Anything else is refused before the disk is touched, so the endpoint cannot be used to browse.
 * - **Only inside the repository.** The path is relative, has no `..`, and its real path (symlinks resolved) is under
 *   the repository's real path. A symlink in the repository pointing at `~/.ssh` is refused, not followed.
 * - **Only regular UTF-8 text, and not much of it.** Binary files, directories, devices and anything over the size
 *   cap are named and "not shown". Long files are cut at a line cap.
 * - **No secret values.** Every value in a `.env*` file is masked; the keys stay, because the keys are what the page is
 *   pointing at. In every file, the user and password of a URL (`postgres://app:hunter2@db.example/app`) are masked too: a
 *   connection string in a compose file is a password on a screen that may be shared.
 */

import { readFile, realpath, stat } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, sep } from 'node:path';

/** Larger files are named but not shown. */
export const FILE_VIEW_MAX_BYTES = 200 * 1024;
/** Longer files are cut here; the evidence the page points at is near the top of almost every file. */
export const FILE_VIEW_MAX_LINES = 2000;

/** What a masked `.env` value is shown as. */
export const MASKED_VALUE = '••••';

export type FileView =
  | {
      path: string;
      status: 'shown';
      text: string;
      /** Lines in the whole file, which is more than `text` holds when `truncated`. */
      lineCount: number;
      truncated: boolean;
      /** Values in it were replaced with `••••`: everything in a `.env` file, URL credentials anywhere. */
      masked: boolean;
    }
  | {
      path: string;
      status: 'not-shown';
      reason: 'not-seen' | 'outside' | 'missing' | 'not-a-file' | 'too-large' | 'binary';
    };

/** A repository-relative path in the one spelling the allow-list and the page use: forward slashes, no `./`. */
export const normaliseRepositoryPath = (path: string): string | undefined => {
  const forward = path.replaceAll('\\', '/').replace(/^(\.\/)+/, '');
  if (
    forward === '' ||
    forward.includes('\0') ||
    forward.startsWith('/') ||
    isAbsolute(path) ||
    /^[A-Za-z]:/.test(forward) ||
    forward.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')
  ) {
    return undefined;
  }
  return forward;
};

/**
 * Every file path the session has seen: `read_file` entries in the timeline, and every `{ file, line }` citation
 * anywhere in the facts and the composition. Walked generically, so a new kind of evidence is covered without a
 * change here, and a path that only appears as prose is never on the list.
 */
export const seenFilePaths = ({
  timeline,
  evidenceSources
}: {
  timeline: ReadonlyArray<{ kind: string; label: string }>;
  evidenceSources: readonly unknown[];
}): Set<string> => {
  const seen = new Set<string>();
  const add = (path: string) => {
    const normalised = normaliseRepositoryPath(path);
    if (normalised !== undefined) seen.add(normalised);
  };
  for (const entry of timeline) {
    if (entry.kind === 'tool' && entry.label.startsWith('read_file ')) add(entry.label.slice('read_file '.length));
  }
  const visit = (value: unknown, depth: number) => {
    if (depth > 12 || value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.file === 'string' && typeof record.line === 'number') add(record.file);
    for (const child of Object.values(record)) visit(child, depth + 1);
  };
  for (const source of evidenceSources) visit(source, 0);
  return seen;
};

const isEnvironmentFile = (path: string): boolean => /^\.env($|\.)/i.test(basename(path));

/**
 * `.env` text with every value replaced: `KEY=value` becomes `KEY=••••`, `export KEY="a"` becomes `export KEY=••••`,
 * and a commented-out assignment keeps its comment marker. An empty value stays empty: there is nothing to hide, and
 * "this is not set" is what the page may be pointing at. Any other non-comment line (the rest of a multi-line value) is
 * masked whole. Line count and numbering are unchanged, so evidence line numbers still land on the right line.
 */
export const maskEnvironmentText = (text: string): string =>
  text
    .split('\n')
    .map((line) => {
      // `KEY=value` or `KEY: value`; in a comment only `# KEY=value`, so prose like "# Note: ..." stays readable.
      const assignment =
        /^(\s*(?:export\s+)?[A-Za-z_][\w.-]*\s*[=:])(.*?)(\r?)$/.exec(line) ??
        /^(\s*#\s*(?:export\s+)?[A-Za-z_][\w.-]*\s*=)(.*?)(\r?)$/.exec(line);
      if (assignment !== null) {
        const [, key, value, carriageReturn] = assignment;
        return value!.trim() === '' ? line : `${key}${MASKED_VALUE}${carriageReturn}`;
      }
      if (line.trim() === '' || line.trimStart().startsWith('#')) return line;
      return MASKED_VALUE;
    })
    .join('\n');

/**
 * A URL's user and password masked together: `scheme://<user>:<password>@host` becomes `scheme://••••@host`. Greedy
 * up to the last `@` before the path, so a password that itself contains `@` is masked whole. A URL without a password
 * (`ssh://git@host`) stays.
 */
export const maskUrlCredentials = (text: string): string =>
  text.replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^/\s"'`]*:[^/\s"'`]*@/gi, `$1${MASKED_VALUE}@`);

const isInside = (root: string, candidate: string): boolean => {
  const fromRoot = relative(root, candidate);
  return fromRoot !== '' && !fromRoot.startsWith(`..${sep}`) && fromRoot !== '..' && !isAbsolute(fromRoot);
};

/** Reads one file for the page, or says why it is not shown. Never throws for a refused or unreadable file. */
export const readSeenFile = async ({
  repositoryRoot,
  path,
  seen
}: {
  repositoryRoot: string;
  path: string;
  seen: ReadonlySet<string>;
}): Promise<FileView> => {
  const normalised = normaliseRepositoryPath(path);
  if (normalised === undefined) return { path, status: 'not-shown', reason: 'outside' };
  if (!seen.has(normalised)) return { path: normalised, status: 'not-shown', reason: 'not-seen' };

  let root: string;
  let resolved: string;
  try {
    root = await realpath(repositoryRoot);
    resolved = await realpath(join(root, normalised));
  } catch {
    return { path: normalised, status: 'not-shown', reason: 'missing' };
  }
  if (!isInside(root, resolved)) return { path: normalised, status: 'not-shown', reason: 'outside' };

  const info = await stat(resolved).catch(() => undefined);
  if (info === undefined) return { path: normalised, status: 'not-shown', reason: 'missing' };
  if (!info.isFile()) return { path: normalised, status: 'not-shown', reason: 'not-a-file' };
  if (info.size > FILE_VIEW_MAX_BYTES) return { path: normalised, status: 'not-shown', reason: 'too-large' };

  const bytes = await readFile(resolved).catch(() => undefined);
  if (bytes === undefined) return { path: normalised, status: 'not-shown', reason: 'missing' };
  if (bytes.length > FILE_VIEW_MAX_BYTES) return { path: normalised, status: 'not-shown', reason: 'too-large' };
  if (bytes.includes(0)) return { path: normalised, status: 'not-shown', reason: 'binary' };
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { path: normalised, status: 'not-shown', reason: 'binary' };
  }

  const isEnvironment = isEnvironmentFile(normalised);
  const shown = maskUrlCredentials(isEnvironment ? maskEnvironmentText(text) : text);
  const masked = isEnvironment || shown !== text;
  const lines = shown.split('\n');
  const truncated = lines.length > FILE_VIEW_MAX_LINES;
  return {
    path: normalised,
    status: 'shown',
    text: truncated ? lines.slice(0, FILE_VIEW_MAX_LINES).join('\n') : shown,
    lineCount: lines.length,
    truncated,
    masked
  };
};
