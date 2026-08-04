import { existsSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { assertInside, repositoryRoot, run, validateSliceId } from './shared.ts';

const args = process.argv.slice(2);
const sliceId = validateSliceId(args[0]);
const needsPrivate = args.includes('--private');
const dossierFlag = args.indexOf('--dossier');
const dossier = dossierFlag === -1 ? undefined : args[dossierFlag + 1];

if (dossierFlag !== -1 && !dossier) {
  throw new Error('--dossier requires a path.');
}

const root = repositoryRoot();
const worktreesRoot = path.resolve(root, '.worktrees');
const target = path.resolve(worktreesRoot, sliceId);
const publicBranch = `v4/slice/${sliceId}`;
const privateBranch = `v4/slice/${sliceId}`;
assertInside(worktreesRoot, target);

if (existsSync(target)) {
  throw new Error(`Refusing to reuse existing path: ${target}`);
}

const status = run('git', ['status', '--porcelain'], { cwd: root, capture: true });
if (status) {
  throw new Error('Create worktrees only from a clean integration checkout.');
}

const currentBranch = run('git', ['branch', '--show-current'], { cwd: root, capture: true });
if (currentBranch !== 'v4/integration') {
  throw new Error(`Create migration slices only from v4/integration, not ${currentBranch || 'detached HEAD'}.`);
}

const publicBase = run('git', ['rev-parse', 'HEAD'], { cwd: root, capture: true });
const integrationHead = run('git', ['rev-parse', 'refs/heads/v4/integration'], {
  cwd: root,
  capture: true
});
if (publicBase !== integrationHead) {
  throw new Error('HEAD does not match the local v4/integration ref.');
}

const publicLocalCollision = run('git', ['branch', '--list', publicBranch], {
  cwd: root,
  capture: true
});
const publicRemoteCollision = run('git', ['ls-remote', '--heads', 'origin', `refs/heads/${publicBranch}`], {
  cwd: root,
  capture: true
});
if (publicLocalCollision || publicRemoteCollision) {
  throw new Error(`Public branch already exists: ${publicBranch}`);
}

let dossierRelative: string | undefined;
if (dossier) {
  const dossierPath = path.resolve(root, dossier);
  assertInside(root, dossierPath);
  if (!existsSync(dossierPath) || !statSync(dossierPath).isFile()) {
    throw new Error(`Dossier must be an existing file inside the repository: ${dossierPath}`);
  }
  dossierRelative = path.relative(root, dossierPath);
}

if (needsPrivate) {
  const modules = path.join(root, '.gitmodules');
  if (!existsSync(modules)) {
    throw new Error('This integration commit does not declare apps/console as a submodule.');
  }
  const privateUrl = run('git', ['config', '--file', '.gitmodules', '--get', 'submodule.apps/console.url'], {
    cwd: root,
    capture: true
  });
  if (
    run('git', ['ls-remote', '--heads', privateUrl, `refs/heads/${privateBranch}`], {
      cwd: root,
      capture: true
    })
  ) {
    throw new Error(`Private remote branch already exists: ${privateBranch}`);
  }
}

await mkdir(worktreesRoot, { recursive: true });
run('git', ['worktree', 'add', '-b', publicBranch, target, publicBase], { cwd: root });

let privateBase: string | undefined;
if (needsPrivate) {
  run('git', ['submodule', 'update', '--init', 'apps/console'], { cwd: target });
  const privateRoot = path.join(target, 'apps', 'console');
  privateBase = run('git', ['rev-parse', 'HEAD'], { cwd: privateRoot, capture: true });

  if (
    run('git', ['branch', '--all', '--list', privateBranch, `remotes/origin/${privateBranch}`], {
      cwd: privateRoot,
      capture: true
    })
  ) {
    throw new Error(`Private branch already exists: ${privateBranch}`);
  }

  run('git', ['switch', '-c', privateBranch], { cwd: privateRoot });
}

run('pnpm', ['install', '--frozen-lockfile'], { cwd: target });

const metadata = {
  sliceId,
  createdAt: new Date().toISOString(),
  publicBase,
  privateBase,
  publicBranch,
  privateBranch: needsPrivate ? privateBranch : undefined,
  dossier: dossierRelative
};

await writeFile(path.join(target, '.stacktape-agent.json'), `${JSON.stringify(metadata, null, 2)}\n`);
await writeFile(
  path.join(target, '.stacktape-dossier.md'),
  dossierRelative
    ? `Read the assigned dossier before editing: ${dossierRelative}\n`
    : 'No dossier was passed. Obtain one from the orchestrator before editing.\n'
);

process.stdout.write(`Created ${target}\n`);
process.stdout.write(`Public: ${publicBranch} from ${publicBase}\n`);
if (privateBase) {
  process.stdout.write(`Private: v4/slice/${sliceId} from ${privateBase}\n`);
}
process.stdout.write(
  `Cleanup after integrating/pushing private commits and committing or discarding public changes: pnpm worktree:remove ${sliceId}\n`
);
