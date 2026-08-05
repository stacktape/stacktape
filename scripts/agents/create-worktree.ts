import { existsSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { assertInside, repositoryRoot, run, validateSliceId } from './shared.ts';

const args = process.argv.slice(2);
const sliceId = validateSliceId(args[0]);
const needsPrivate = args.includes('--private');
const dossierFlag = args.indexOf('--dossier');
const dossier = dossierFlag === -1 ? undefined : args[dossierFlag + 1];
const baseFlag = args.indexOf('--base');
const baseRef = baseFlag === -1 ? 'main' : args[baseFlag + 1];

if (dossierFlag !== -1 && !dossier) {
  throw new Error('--dossier requires a path.');
}
if (baseFlag !== -1 && !baseRef) {
  throw new Error('--base requires a Git ref.');
}

const root = repositoryRoot();
const commonGitDirectory = run('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
  cwd: root,
  capture: true
});
const primaryRoot = path.dirname(commonGitDirectory);
const worktreesRoot = path.resolve(primaryRoot, '..', '.worktrees');
const target = path.resolve(worktreesRoot, `${path.basename(primaryRoot)}-${sliceId}`);
const publicBranch = `work/${sliceId}`;
const privateBranch = `work/${sliceId}`;
assertInside(worktreesRoot, target);

if (existsSync(target)) {
  throw new Error(`Refusing to reuse existing path: ${target}`);
}

const publicBase = run('git', ['rev-parse', '--verify', `${baseRef}^{commit}`], {
  cwd: root,
  capture: true
});

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
  const privateUrl = run(
    'git',
    ['config', '--blob', `${publicBase}:.gitmodules`, '--get', 'submodule.apps/console.url'],
    { cwd: root, capture: true }
  );
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
if (dossierRelative) {
  await writeFile(path.join(target, '.stacktape-dossier.md'), `Read the assigned dossier: ${dossierRelative}\n`);
}

process.stdout.write(`Created ${target}\n`);
process.stdout.write(`Public: ${publicBranch} from ${baseRef} (${publicBase})\n`);
if (privateBase) {
  process.stdout.write(`Private: ${privateBranch} from ${privateBase}\n`);
}
process.stdout.write(
  `Cleanup after integrating/pushing private commits and committing or discarding public changes: pnpm worktree:remove ${sliceId}\n`
);
