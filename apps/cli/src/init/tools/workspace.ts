/**
 * The single boundary between an agent and the user's filesystem.
 *
 * Every path an agent supplies is resolved, checked and opened *here*, in that order, with nothing
 * in between. That ordering is the whole point. An earlier arrangement checked the path as a string
 * in one place and opened it somewhere else, which is not equivalent: between the check and the
 * open, a symlink can be replaced, and a path that passed a lexical test can resolve outside the
 * repository by the time it is read.
 *
 * So containment lives with the file handle. There is no exported "check this path" function to
 * call separately, because having one invites exactly the split that fails.
 */

import { open, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { classifyFileAccess, extractEnvironmentVariableNames } from '@stacktape/config-inference/policy';

export type WorkspaceReadFailure = {
  ok: false;
  /** Distinguishes a policy refusal from a missing file, because the agent should react differently. */
  reason: 'escapes-repository' | 'blocked-by-policy' | 'not-found' | 'not-a-file';
  message: string;
};

export type WorkspaceReadSuccess = {
  ok: true;
  /** Normalised repository-relative POSIX path, safe to cite. */
  path: string;
  contents: string;
};

export type WorkspaceNamesOnly = {
  ok: true;
  path: string;
  /** Environment variable names. The file's values are never returned. */
  environmentVariableNames: string[];
};

const toPosix = (path: string): string => path.split(sep).join('/');

const escapes = (message: string): WorkspaceReadFailure => ({
  ok: false,
  reason: 'escapes-repository',
  message
});

/**
 * A workspace rooted at one directory, from which nothing can be read outside that directory.
 *
 * The root is resolved through symlinks once, at construction. Repository roots on macOS commonly
 * sit behind `/tmp` → `/private/tmp`, so comparing a resolved target against an unresolved root
 * would reject the repository's own files.
 */
export class Workspace {
  #realRoot: string | undefined;

  constructor(private readonly root: string) {}

  async #resolvedRoot(): Promise<string> {
    if (this.#realRoot === undefined) {
      this.#realRoot = await realpath(resolve(this.root)).catch(() => resolve(this.root));
    }
    return this.#realRoot;
  }

  /**
   * Resolve a caller-supplied path and open it, refusing anything outside the repository.
   *
   * Rejects absolute paths, Windows drive letters and backslashes before touching the filesystem —
   * not as the security check, but so the common mistake gets a clear message instead of a
   * containment error. The real check is the realpath comparison after opening.
   */
  async #openContained(
    repoRelativePath: string
  ): Promise<{ handle: Awaited<ReturnType<typeof open>>; path: string } | WorkspaceReadFailure> {
    if (repoRelativePath === '' || isAbsolute(repoRelativePath) || /^[A-Za-z]:/.test(repoRelativePath)) {
      return escapes(`"${repoRelativePath}" must be a path relative to the project root.`);
    }
    if (repoRelativePath.includes('\\')) {
      return escapes(`"${repoRelativePath}" must use forward slashes.`);
    }

    const realRoot = await this.#resolvedRoot();
    const candidate = resolve(realRoot, repoRelativePath);

    // A lexical check on the *resolved* path, before any filesystem access. This is not the security
    // boundary — the realpath comparison below is — but without it the answer to "may I read
    // ../../etc/passwd" depends on whether that file happens to exist, which turns error messages
    // into a probe for what is on the machine.
    const lexical = relative(realRoot, candidate);
    if (lexical.startsWith('..') || isAbsolute(lexical)) {
      return escapes(`"${repoRelativePath}" is outside the project.`);
    }

    let handle: Awaited<ReturnType<typeof open>>;
    try {
      handle = await open(candidate, 'r');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return { ok: false, reason: 'not-found', message: `"${repoRelativePath}" does not exist.` };
      }
      if (code === 'EISDIR') {
        return { ok: false, reason: 'not-a-file', message: `"${repoRelativePath}" is a directory.` };
      }
      return { ok: false, reason: 'not-found', message: `"${repoRelativePath}" could not be opened.` };
    }

    // `open` succeeds on a directory on some platforms and only fails at read time, which surfaces
    // the problem far from its cause. Asking the handle settles it here, before anything is read.
    const stats = await handle.stat().catch(() => undefined);
    if (stats !== undefined && !stats.isFile()) {
      await handle.close();
      return {
        ok: false,
        reason: 'not-a-file',
        message: `"${repoRelativePath}" is ${stats.isDirectory() ? 'a directory' : 'not a regular file'}.`
      };
    }

    // Containment is decided by re-resolving the path after the open, which defeats the attack this
    // feature actually faces: a symlink checked into the repository pointing at `~/.ssh` or an
    // absolute path. It does not defeat a process racing the swap between open and resolve — but
    // that adversary is already running as the user and can read the target directly, so the race
    // buys them nothing.
    let realTarget: string;
    try {
      realTarget = await realpath(candidate);
    } catch {
      await handle.close();
      return escapes(`"${repoRelativePath}" could not be resolved.`);
    }

    const within = relative(realRoot, realTarget);
    if (within.startsWith('..') || isAbsolute(within)) {
      await handle.close();
      return escapes(`"${repoRelativePath}" resolves outside the project.`);
    }

    return { handle, path: toPosix(within) };
  }

  /**
   * Read a file, honouring the access policy.
   *
   * Environment files come back as names. Credential material does not come back at all. The policy
   * is consulted on the *resolved* path, so a symlink pointing at `.env` is classified as `.env`
   * rather than as whatever the link was called.
   */
  async read(repoRelativePath: string): Promise<WorkspaceReadSuccess | WorkspaceNamesOnly | WorkspaceReadFailure> {
    const opened = await this.#openContained(repoRelativePath);
    if ('ok' in opened) {
      return opened;
    }

    const { handle, path } = opened;
    try {
      const access = classifyFileAccess(path);
      if (access === 'blocked') {
        return {
          ok: false,
          reason: 'blocked-by-policy',
          message: `"${path}" may hold credentials and is never opened.`
        };
      }

      const contents = await handle.readFile('utf8');
      if (access === 'names-only') {
        return { ok: true, path, environmentVariableNames: extractEnvironmentVariableNames(contents) };
      }
      return { ok: true, path, contents };
    } finally {
      await handle.close();
    }
  }
}
