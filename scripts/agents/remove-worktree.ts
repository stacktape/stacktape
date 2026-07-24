import { existsSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
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
let privateRemoteRefs: string | undefined;
if (existsSync(path.join(privateRoot, '.git'))) {
  const privateStatus = run('git', ['status', '--porcelain'], { cwd: privateRoot, capture: true });
  if (privateStatus) {
    throw new Error('Private Console worktree is dirty; commit or discard its changes explicitly first.');
  }

  privateRemoteRefs = run('git', ['branch', '--remotes', '--contains', 'HEAD', '--format=%(refname:short)'], {
    cwd: privateRoot,
    capture: true
  });
  if (!privateRemoteRefs) {
    throw new Error(
      'Private HEAD is not reachable from a remote-tracking ref. Push or integrate the private commit before cleanup.'
    );
  }
}

const publicStatus = run('git', ['status', '--porcelain'], { cwd: target, capture: true });
if (publicStatus) {
  throw new Error('Public worktree is dirty; commit or discard its changes explicitly first.');
}

const removeInstallDirectories = async (directory: string): Promise<void> => {
  const directories = (await readdir(directory, { withFileTypes: true })).filter(
    (entry) => entry.isDirectory() && entry.name !== '.git'
  );

  await Promise.all(
    directories.map((entry) => {
      const child = path.join(directory, entry.name);
      return entry.name === 'node_modules'
        ? rm(child, { force: true, maxRetries: 3, recursive: true })
        : removeInstallDirectories(child);
    })
  );
};

await removeInstallDirectories(target);

if (existsSync(path.join(privateRoot, '.git'))) {
  run('git', ['submodule', 'deinit', '-f', 'apps/console'], { cwd: target });
}

run('git', ['worktree', 'remove', '--force', target], { cwd: root });
process.stdout.write(`Removed ${target}.\n`);
process.stdout.write(`Public branch v4/slice/${sliceId} was preserved.\n`);
if (privateRemoteRefs) {
  process.stdout.write(
    `The private checkout was removed after confirming HEAD is recoverable from: ${privateRemoteRefs.replaceAll('\n', ', ')}.\n`
  );
}
