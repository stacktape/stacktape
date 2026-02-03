import { execSync } from 'node:child_process';

export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | null;

export type GitInfo = {
  provider: GitProvider;
  remoteUrl: string | null;
  branch: string | null;
  owner: string | null;
  repository: string | null;
};

/**
 * Detects git information from the current directory
 */
export const detectGitInfo = (cwd: string = process.cwd()): GitInfo => {
  const result: GitInfo = {
    provider: null,
    remoteUrl: null,
    branch: null,
    owner: null,
    repository: null
  };

  try {
    // Get remote URL
    result.remoteUrl = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
      .toString()
      .trim();
  } catch {
    // Not a git repo or no remote
    return result;
  }

  // Detect provider from URL
  if (result.remoteUrl) {
    result.provider = detectProviderFromUrl(result.remoteUrl);
    const parsed = parseGitUrl(result.remoteUrl);
    result.owner = parsed.owner;
    result.repository = parsed.repository;
  }

  // Get current branch
  try {
    result.branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
      .toString()
      .trim();
  } catch {
    // Ignore
  }

  return result;
};

/**
 * Detects git provider from remote URL
 */
export const detectProviderFromUrl = (url: string): GitProvider => {
  const normalizedUrl = url.toLowerCase();

  if (normalizedUrl.includes('github.com')) return 'github';
  if (normalizedUrl.includes('gitlab.com')) return 'gitlab';
  if (normalizedUrl.includes('bitbucket.org')) return 'bitbucket';

  return null;
};

/**
 * Parses owner and repository from git URL
 */
export const parseGitUrl = (url: string): { owner: string | null; repository: string | null } => {
  // Handle HTTPS URLs: https://github.com/owner/repo.git
  const httpsMatch = url.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repository: httpsMatch[2] };
  }

  // Handle SSH URLs: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@[^:]+:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repository: sshMatch[2] };
  }

  return { owner: null, repository: null };
};

/**
 * Checks if the directory is a git repository
 */
export const isGitRepository = (cwd: string = process.cwd()): boolean => {
  try {
    execSync('git rev-parse --git-dir', { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets the default branch name (tries to detect main/master/develop)
 */
export const getDefaultBranch = (cwd: string = process.cwd()): string | null => {
  try {
    // Try to get from remote HEAD
    const remoteBranch = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
      .toString()
      .trim()
      .replace('refs/remotes/origin/', '');

    if (remoteBranch) return remoteBranch;
  } catch {
    // Ignore
  }

  // Fall back to current branch
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
};
