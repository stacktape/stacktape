/**
 * What may be read out of a user's repository, and in what form.
 *
 * Two very different consumers share this module, and they must never disagree: the deterministic
 * probes that build the project brief, and the tools handed to the coding agent. If the agent could
 * reach a file the probes refuse to open, the guarantee we make to the user would be decoration.
 *
 * The guarantee is: environment values never leave the machine, and credential material is never
 * opened at all. Everything below exists to make that true by construction rather than by asking an
 * agent to behave.
 */

import { basename, posix } from 'node:path';

/**
 * Directories whose contents are never interesting and frequently enormous.
 *
 * Skipped by name at any depth. This is a cost and noise measure, not a security one — nothing here
 * is dangerous to read, there is just no reason to.
 */
export const SKIPPED_DIRECTORY_NAMES: ReadonlySet<string> = new Set([
  '.git',
  '.gradle',
  '.idea',
  '.next',
  '.nuxt',
  '.pytest_cache',
  '.stacktape',
  '.svelte-kit',
  '.terraform',
  '.turbo',
  '.venv',
  '.vs',
  '__pycache__',
  '__stacktape-dist',
  'bin',
  'bower_components',
  'build',
  'coverage',
  'dist',
  'obj',
  'node_modules',
  'out',
  'target',
  'venv',
  'vendor'
]);

/**
 * Files that are never opened, in any form, by any consumer.
 *
 * These hold credential material whose *names* are as useless to us as their contents are dangerous,
 * so unlike environment files there is nothing to salvage by reading them partially. Matched on the
 * basename so a deploy key is caught wherever someone happened to leave it.
 */
const CREDENTIAL_BASENAMES: ReadonlySet<string> = new Set([
  '.git-credentials',
  '.htpasswd',
  '.netrc',
  '.npmrc',
  '.pgpass',
  '.pypirc',
  '.yarnrc',
  '.yarnrc.yml',
  '_netrc',
  'credentials',
  'credentials.json',
  // Registry, cloud and CI credential carriers that look like ordinary configuration and are not.
  // `config.json` is deliberately absent: it is an ordinary application filename far more often
  // than it is a Docker credential store, so `.docker` is skipped as a directory instead.
  'gradle.properties',
  'service-account.json',
  'serviceaccount.json',
  'secrets.json',
  'secrets.yaml',
  'secrets.yml',
  'terraform.tfvars',
  'kubeconfig'
]);

const CREDENTIAL_BASENAME_PREFIXES: readonly string[] = ['id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519'];

const CREDENTIAL_EXTENSIONS: readonly string[] = [
  '.asc',
  '.gpg',
  '.jks',
  '.key',
  '.keystore',
  '.p12',
  '.pem',
  '.pfx',
  '.ppk'
];

/**
 * Path segments that mean "there are secrets in here" strongly enough to skip the whole subtree.
 *
 * Deliberately short. A long list of guesses invites false confidence; the extension and basename
 * rules above are what actually carry the guarantee.
 */
const CREDENTIAL_DIRECTORY_NAMES: ReadonlySet<string> = new Set(['.aws', '.docker', '.gnupg', '.kube', '.ssh']);

/**
 * How a file may be used.
 *
 * - `read` — contents may be opened, quoted, and cited.
 * - `names-only` — the file may be parsed for the identifiers it declares, never for their values.
 * - `blocked` — the file is not opened.
 */
export type FileAccess = 'read' | 'names-only' | 'blocked';

/**
 * Environment files are `names-only` with no exceptions, including `.env.example`.
 *
 * The tempting rule is to allow `.env.example` in full, since by convention it holds placeholders.
 * Convention is not enforcement: example files pick up real values by accident all the time, and a
 * rule with an exception is a rule someone has to get right at every call site. The names are the
 * entire signal we need — `DATABASE_URL` tells us there is a database, and its value would tell us
 * nothing further — so nothing is lost by refusing to look at the right-hand side anywhere.
 */
export const isEnvironmentFileName = (name: string): boolean => {
  const lower = name.toLowerCase();
  // Matched case-insensitively, and on both shapes people actually use. `.ENV` on a case-insensitive
  // filesystem is the same file as `.env`; `prod.env` and `.envrc` carry the same values under
  // different names. A guarantee about environment values that a rename defeats is not a guarantee.
  return lower === '.env' || lower.startsWith('.env.') || lower === '.envrc' || lower.endsWith('.env');
};

const hasCredentialExtension = (name: string): boolean => {
  const lower = name.toLowerCase();
  return CREDENTIAL_EXTENSIONS.some((extension) => lower.endsWith(extension));
};

const hasCredentialPrefix = (name: string): boolean => {
  const lower = name.toLowerCase();
  return CREDENTIAL_BASENAME_PREFIXES.some((prefix) => lower === prefix || lower.startsWith(`${prefix}.`));
};

/**
 * Whether a directory should be descended into, given its own name.
 *
 * Callers walk trees, so this is asked per segment rather than per full path.
 */
export const isSkippedDirectoryName = (name: string): boolean =>
  SKIPPED_DIRECTORY_NAMES.has(name) || CREDENTIAL_DIRECTORY_NAMES.has(name.toLowerCase());

/**
 * Classify a repository-relative POSIX path.
 *
 * Containment is *not* checked here — that belongs to whoever resolves the path against a root, and
 * doing it in two places would let the two drift. This answers only "given that this path is inside
 * the repository, how may it be used".
 */
export const classifyFileAccess = (repoRelativePath: string): FileAccess => {
  const segments = repoRelativePath.split('/');
  if (segments.slice(0, -1).some((segment) => isSkippedDirectoryName(segment))) {
    return 'blocked';
  }

  const name = basename(repoRelativePath);
  if (CREDENTIAL_BASENAMES.has(name.toLowerCase()) || hasCredentialPrefix(name) || hasCredentialExtension(name)) {
    return 'blocked';
  }
  if (isEnvironmentFileName(name)) {
    return 'names-only';
  }
  return 'read';
};

/**
 * Environment variable names declared by an environment file, without their values.
 *
 * Written to be boring on purpose: it never evaluates, never expands, and never retains anything to
 * the right of the first `=`. Quoted and `export`-prefixed forms are recognised because they are
 * common, not because the parser is trying to be complete — an unrecognised line yields no name,
 * which costs us a signal and leaks nothing.
 */
export const extractEnvironmentVariableNames = (fileContents: string): string[] => {
  const names: string[] = [];
  const seen = new Set<string>();
  /**
   * The quote character holding a value open across lines, when one is.
   *
   * Multi-line values are common — PEM blocks, JSON blobs, private keys — and skipping them is not
   * cosmetic. A continuation line that happens to contain `=` would otherwise be read as a
   * declaration, so a wrapped secret could emit fragments of *itself* as variable names, which is
   * precisely the leak this function exists to prevent.
   */
  let openQuote: string | undefined;

  for (const rawLine of fileContents.split(/\r?\n/)) {
    if (openQuote !== undefined) {
      if (rawLine.includes(openQuote)) {
        openQuote = undefined;
      }
      continue;
    }

    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const withoutExport = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
    const separator = withoutExport.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const value = withoutExport.slice(separator + 1);
    const quote = value.startsWith('"') ? '"' : value.startsWith("'") ? "'" : undefined;
    if (quote !== undefined && !value.slice(1).includes(quote)) {
      openQuote = quote;
    }

    const name = withoutExport.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || seen.has(name)) {
      continue;
    }
    seen.add(name);
    names.push(name);
  }

  return names;
};

/**
 * Whether a repository-relative path is inside one of the declared roots.
 *
 * Lexical only, and POSIX only. Real-path resolution (the symlink-escape case) needs the filesystem
 * and therefore belongs to the tool layer that already has it open.
 */
export const isWithinRoots = (repoRelativePath: string, roots: readonly string[]): boolean =>
  roots.some((root) => {
    const normalized = posix.normalize(root);
    if (normalized === '.' || normalized === '') {
      return true;
    }
    const prefix = normalized.endsWith('/') ? normalized : `${normalized}/`;
    return repoRelativePath === normalized || repoRelativePath.startsWith(prefix);
  });
