import { dirname, join, resolve } from 'node:path';
import { pathExists, readFile, stat } from 'fs-extra';

async function isGitRoot(dir: string): Promise<boolean> {
  const gitPath = join(dir, '.git');

  if (!(await pathExists(gitPath))) {
    return false;
  }

  try {
    const stats = await stat(gitPath);

    // If .git is a directory, this is the git root
    if (stats.isDirectory()) {
      return true;
    }

    // If .git is a file, it might be a git submodule or worktree
    // Read the file to get the actual git directory location
    if (stats.isFile()) {
      const content = await readFile(gitPath, 'utf8');
      // Git submodules/worktrees have format: "gitdir: <path>"
      if (content.startsWith('gitdir:')) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

async function isMonorepoRoot(dir: string): Promise<boolean> {
  const monorepoIndicators = ['lerna.json', 'pnpm-workspace.yaml', 'turbo.json', 'nx.json', 'rush.json'];

  for (const file of monorepoIndicators) {
    if (await pathExists(join(dir, file))) {
      return true;
    }
  }

  const pkgPath = join(dir, 'package.json');
  if (await pathExists(pkgPath)) {
    try {
      const pkgContent = await readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(pkgContent);
      if (
        pkg.workspaces &&
        (Array.isArray(pkg.workspaces) ||
          (typeof pkg.workspaces === 'object' && pkg.workspaces !== null && Array.isArray(pkg.workspaces.packages)))
      ) {
        return true;
      }
      if (pkg.lerna) {
        return true;
      }
    } catch {
      // Invalid JSON or other error, not a root
      return false;
    }
  }

  return false;
}

export async function findProjectRoot(
  startDir: string = process.cwd(),
  logDebug: (message: string) => void = () => {}
): Promise<string | null> {
  // look for monorepo root indicator by traversing up
  let dir = resolve(startDir);
  while (dir !== dirname(dir)) {
    if (await isMonorepoRoot(dir)) {
      return dir;
    }
    dir = dirname(dir);
  }
  if (logDebug) {
    logDebug('No repository root found by monorepo indicators.');
  }

  // look for the nearest package.json
  dir = resolve(startDir);
  while (dir !== dirname(dir)) {
    if (await pathExists(join(dir, 'package.json'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  if (logDebug) {
    logDebug('No repository root found by package.json.');
  }

  // look for git repository root by traversing up
  dir = resolve(startDir);
  while (dir !== dirname(dir)) {
    if (await isGitRoot(dir)) {
      return dir;
    }
    dir = dirname(dir);
  }
  if (logDebug) {
    logDebug('No repository root found by git repository root.');
  }

  return null;
}
