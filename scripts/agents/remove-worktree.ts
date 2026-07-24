import { existsSync } from 'node:fs';
import path from 'node:path';

import { assertInside, repositoryRoot, run, validateSliceId } from './shared.ts';

const sliceId = validateSliceId(process.argv[2]);
const root = repositoryRoot();
const worktreesRoot = path.resolve(root, '.worktrees');
const target = path.resolve(worktreesRoot, sliceId);
assertInside(worktreesRoot, target);

if (!existsSync(target)) {
  throw new Error(`Worktree does not exist: ${target}`);
}

const registered = run('git', ['worktree', 'list', '--porcelain'], { cwd: root, capture: true })
  .split(/\r?\n/)
  .filter((line) => line.startsWith('worktree '))
  .map((line) => path.resolve(line.slice('worktree '.length)));

if (!registered.some((candidate) => candidate.toLowerCase() === target.toLowerCase())) {
  throw new Error(`Path is not a registered worktree: ${target}`);
}

const privateRoot = path.join(target, 'apps', 'console');
if (existsSync(path.join(privateRoot, '.git'))) {
  const privateStatus = run('git', ['status', '--porcelain'], { cwd: privateRoot, capture: true });
  if (privateStatus) {
    throw new Error('Private Console worktree is dirty; commit or discard its changes explicitly first.');
  }
}

const publicStatus = run('git', ['status', '--porcelain'], { cwd: target, capture: true });
if (publicStatus) {
  throw new Error('Public worktree is dirty; commit or discard its changes explicitly first.');
}

if (existsSync(path.join(privateRoot, '.git'))) {
  run('git', ['submodule', 'deinit', '-f', 'apps/console'], { cwd: target });
}

run('git', ['worktree', 'remove', target], { cwd: root });
process.stdout.write(`Removed ${target}.\n`);
process.stdout.write(
  `Branches were preserved. Delete v4/slice/${sliceId} in each repository only after integration.\n`
);
