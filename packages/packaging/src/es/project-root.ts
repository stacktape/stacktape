import { dirname, join, resolve } from 'node:path';
import { pathExists, readFile, stat } from 'fs-extra';

/**
 * Whether `dir` is the top of a Git repository that is a project of its own: a clone or a worktree. A submodule is
 * not, because its superproject's workspace can include its packages (this repository's private Console is one).
 */
async function isRepositoryBoundary(dir: string): Promise<boolean> {
  const gitPath = join(dir, '.git');
  try {
    const stats = await stat(gitPath);
    if (stats.isDirectory()) return true;
    // Worktrees and submodules have a `.git` file naming their Git directory; a submodule's lives under `modules/`.
    const content = await readFile(gitPath, 'utf8');
    return content.startsWith('gitdir:') && !/[\\/]modules[\\/]/.test(content);
  } catch {
    return false;
  }
}

async function isMonorepoRoot(dir: string): Promise<boolean> {
  const monorepoIndicators = ['lerna.json', 'pnpm-workspace.yaml', 'turbo.json', 'nx.json', 'rush.json'];

  if ((await Promise.all(monorepoIndicators.map((file) => pathExists(join(dir, file))))).some(Boolean)) {
    return true;
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

/**
 * Whether `dir` is where `findProjectRoot` stops climbing: a workspace root or the top of a Git clone or worktree.
 * Nothing above it belongs to the project.
 */
export const isProjectBoundary = async (dir: string): Promise<boolean> =>
  (await isMonorepoRoot(dir)) || (await isRepositoryBoundary(dir));

/**
 * The root of the JavaScript project `startDir` belongs to: the nearest workspace root above it, otherwise its nearest
 * `package.json`. The search stops at the top of a Git clone or worktree, so a project checked out inside another
 * workspace (a benchmark clone, a nested worktree) never takes that workspace's lockfile or `node_modules`.
 */
export async function findProjectRoot(
  startDir: string = process.cwd(),
  logDebug: (message: string) => void = () => {}
): Promise<string | null> {
  let nearestPackage: string | null = null;
  let dir = resolve(startDir);
  while (true) {
    // oxlint-disable-next-line no-await-in-loop -- Root discovery must stop at the nearest matching ancestor.
    if (await isMonorepoRoot(dir)) return dir;
    // oxlint-disable-next-line no-await-in-loop -- see above.
    if (!nearestPackage && (await pathExists(join(dir, 'package.json')))) nearestPackage = dir;
    // oxlint-disable-next-line no-await-in-loop -- see above.
    if (await isRepositoryBoundary(dir)) return nearestPackage ?? dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (!nearestPackage) logDebug('No project root found by workspace, package.json or Git repository.');
  return nearestPackage;
}
