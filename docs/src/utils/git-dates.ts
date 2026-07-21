import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';

export type GitDates = { datePublished: string; dateModified: string };

let datesByRepoPath: Map<string, GitDates> | undefined;

const normalize = (value: string) => value.replace(/\\/g, '/');

const loadGitDates = (): Map<string, GitDates> => {
  if (datesByRepoPath) return datesByRepoPath;

  const result = new Map<string, GitDates>();
  const repoRoot = join(process.cwd(), '..');

  try {
    const output = execFileSync('git', ['log', '--format=@@%cI', '--name-only', '--', 'docs/docs'], {
      cwd: repoRoot,
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
    // Source archives and some CI checkouts have no Git history. Omitting dateModified is more
    // accurate than substituting a checkout/build timestamp.
  }

  datesByRepoPath = result;
  return result;
};

export const getGitDates = (contentFilePath?: string): GitDates | undefined => {
  if (!contentFilePath) return undefined;
  const repoRoot = join(process.cwd(), '..');
  const absolutePath = join(process.cwd(), contentFilePath);
  return loadGitDates().get(normalize(relative(repoRoot, absolutePath)));
};

export const getGitLastModified = (contentFilePath?: string): string | undefined =>
  getGitDates(contentFilePath)?.dateModified;
