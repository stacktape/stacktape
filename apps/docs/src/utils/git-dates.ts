import { execFileSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';

type GitDates = { datePublished: string; dateModified: string };

/** Repository-relative prefix of the canonical corpus, as Git reports it. */
const CONTENT_PREFIX = 'apps/docs/content';

let datesByRepoPath: Map<string, GitDates> | undefined;

const normalize = (value: string) => value.replace(/\\/g, '/');

/** Monorepo root. `process.cwd()` is `apps/docs` for every Astro dev/build invocation. */
const repoRoot = () => resolve(process.cwd(), '..', '..');

/**
 * First and last commit date of every canonical MDX file, read once per process.
 *
 * Publication/modification dates come from Git rather than the filesystem so that a fresh checkout
 * does not restamp every page and the built HTML stays reproducible for a given commit.
 */
const loadGitDates = (): Map<string, GitDates> => {
  if (datesByRepoPath) return datesByRepoPath;

  const result = new Map<string, GitDates>();

  try {
    const output = execFileSync('git', ['log', '--format=@@%cI', '--name-only', '--', CONTENT_PREFIX], {
      cwd: repoRoot(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    let commitDate: string | undefined;
    for (const rawLine of output.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line.startsWith('@@')) {
        commitDate = line.slice(2);
      } else if (line && commitDate) {
        const path = normalize(line);
        const existing = result.get(path);
        if (existing) {
          // git log is newest-first, so each later occurrence moves the publication date back.
          existing.datePublished = commitDate;
        } else {
          result.set(path, { datePublished: commitDate, dateModified: commitDate });
        }
      }
    }
  } catch {
    // Source archives and some CI checkouts have no Git history. Omitting the dates is more
    // accurate than substituting a checkout/build timestamp.
  }

  datesByRepoPath = result;
  return result;
};

/** @param appRelativePath content file path relative to `apps/docs` (Astro's `entry.filePath`). */
export const getGitDates = (appRelativePath?: string): GitDates | undefined => {
  if (!appRelativePath) return undefined;
  const absolutePath = join(process.cwd(), appRelativePath);
  return loadGitDates().get(normalize(relative(repoRoot(), absolutePath)));
};

export const getGitLastModified = (appRelativePath?: string): string | undefined =>
  getGitDates(appRelativePath)?.dateModified;
