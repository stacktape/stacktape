import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const hooksPath = path.join(publicRoot, '.githooks');
const privateRoot = path.join(publicRoot, 'apps', 'console');

// Installing from an exported copy of the sources (release tarball, CI artifact, container build context) is a
// supported state and has no repository to configure hooks for.
const repositories = [publicRoot, privateRoot].filter((directory) => existsSync(path.join(directory, '.git')));

const runGitConfig = (repository: string, args: string[], allowedStatuses = [0]) => {
  const result = spawnSync('git', ['config', ...args], {
    cwd: repository,
    encoding: 'utf8'
  });

  if (!allowedStatuses.includes(result.status ?? 1)) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result;
};

for (const repository of repositories) {
  // Linked worktrees share .git/config. Keeping an absolute hook path there makes whichever worktree runs
  // `pnpm install` last steal hook execution from every other worktree. Enable Git's per-worktree config and
  // keep the absolute path in config.worktree instead.
  runGitConfig(repository, ['--local', 'extensions.worktreeConfig', 'true']);

  // Existing worktrees may not have run this version of the installer yet. Preserve their current shared path,
  // or establish this checkout as the fallback during the migration to per-worktree configuration.
  const sharedHooksPath = runGitConfig(repository, ['--local', '--get', 'core.hooksPath'], [0, 1]);
  if (sharedHooksPath.status === 1) {
    runGitConfig(repository, ['--local', 'core.hooksPath', hooksPath]);
  }

  runGitConfig(repository, ['--worktree', 'core.hooksPath', hooksPath]);
}
