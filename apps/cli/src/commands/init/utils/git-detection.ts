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
  return parseGitRemote(url)?.provider || null;
};

/**
 * Parses owner and repository from git URL
 */
export const parseGitUrl = (url: string): { owner: string | null; repository: string | null } => {
  const parsed = parseGitRemote(url);
  return parsed ? { owner: parsed.owner, repository: parsed.repository } : { owner: null, repository: null };
};

const PROVIDER_BY_HOST: Readonly<Record<string, Exclude<GitProvider, null>>> = {
  'github.com': 'github',
  'gitlab.com': 'gitlab',
  'bitbucket.org': 'bitbucket'
};

const parseGitRemote = (
  remoteUrl: string
): { provider: Exclude<GitProvider, null>; owner: string; repository: string } | null => {
  const scpStyle = /^[^@\s]+@([^:\s]+):(.+)$/u.exec(remoteUrl);
  let host: string;
  let path: string;
  if (scpStyle) {
    host = scpStyle[1].toLowerCase();
    path = scpStyle[2];
  } else {
    try {
      const url = new URL(remoteUrl);
      host = url.hostname.toLowerCase();
      path = url.pathname.replace(/^\/+|\/+$/gu, '');
    } catch {
      return null;
    }
  }
  const provider = PROVIDER_BY_HOST[host];
  if (!provider) return null;
  const segments = path.split('/').filter(Boolean);
  const repositoryWithSuffix = segments.at(-1);
  const ownerSegments =
    provider === 'gitlab' ? segments.slice(0, -1) : segments.length === 2 ? segments.slice(0, 1) : [];
  if (!repositoryWithSuffix || !ownerSegments.length) return null;
  const repository = repositoryWithSuffix.endsWith('.git')
    ? repositoryWithSuffix.slice(0, -'.git'.length)
    : repositoryWithSuffix;
  if (!repository) return null;
  return { provider, owner: ownerSegments.join('/'), repository };
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
