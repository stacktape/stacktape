import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(process.argv[2] ?? process.cwd());
const consoleRoot = path.join(repositoryRoot, 'apps', 'console');

const runGit = (cwd: string, args: readonly string[]): string => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim() || 'unknown Git error'}`);
  }
  return result.stdout.trim();
};

try {
  if (!existsSync(path.join(consoleRoot, '.git'))) {
    throw new Error('apps/console is not initialized. Run: git submodule update --init apps/console');
  }

  runGit(consoleRoot, ['fetch', '--quiet', '--prune', 'origin']);
  const privateHead = runGit(consoleRoot, ['rev-parse', 'HEAD']);
  const containingRemoteBranches = runGit(consoleRoot, [
    'branch',
    '--remotes',
    '--contains',
    privateHead,
    '--format=%(refname:short)'
  ])
    .split(/\r?\n/)
    .filter((branch) => branch.startsWith('origin/') && branch !== 'origin/HEAD');

  if (containingRemoteBranches.length === 0) {
    throw new Error(
      `Console commit ${privateHead.slice(0, 8)} is not reachable from a remote branch. Push the private branch before committing the public submodule pointer.`
    );
  }

  process.stdout.write(
    `Console commit ${privateHead.slice(0, 8)} is recoverable from: ${containingRemoteBranches.join(', ')}.\n`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
