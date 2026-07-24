import { existsSync } from 'node:fs';
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
assertInside(worktreesRoot, target);

if (existsSync(target)) {
  throw new Error(`Refusing to reuse existing path: ${target}`);
}

const status = run('git', ['status', '--porcelain'], { cwd: root, capture: true });
if (status) {
  throw new Error('Create worktrees only from a clean integration checkout.');
}

if (run('git', ['branch', '--list', publicBranch], { cwd: root, capture: true })) {
  throw new Error(`Public branch already exists: ${publicBranch}`);
}

const publicBase = run('git', ['rev-parse', 'HEAD'], { cwd: root, capture: true });
await mkdir(worktreesRoot, { recursive: true });
run('git', ['worktree', 'add', '-b', publicBranch, target, publicBase], { cwd: root });

let privateBase: string | undefined;
if (needsPrivate) {
  const modules = path.join(target, '.gitmodules');
  if (!existsSync(modules)) {
    throw new Error('This integration commit does not declare apps/console as a submodule.');
  }

  run('git', ['submodule', 'update', '--init', 'apps/console'], { cwd: target });
  const privateRoot = path.join(target, 'apps', 'console');
  privateBase = run('git', ['rev-parse', 'HEAD'], { cwd: privateRoot, capture: true });
  const privateBranch = `v4/slice/${sliceId}`;

  if (run('git', ['branch', '--list', privateBranch], { cwd: privateRoot, capture: true })) {
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
  privateBranch: needsPrivate ? `v4/slice/${sliceId}` : undefined,
  dossier: dossier ? path.resolve(root, dossier) : undefined
};

await writeFile(path.join(target, '.stacktape-agent.json'), `${JSON.stringify(metadata, null, 2)}\n`);
await writeFile(
  path.join(target, '.stacktape-dossier.md'),
  dossier
    ? `Read the assigned dossier before editing: ${path.resolve(root, dossier)}\n`
    : 'No dossier was passed. Obtain one from the orchestrator before editing.\n'
);

process.stdout.write(`Created ${target}\n`);
process.stdout.write(`Public: ${publicBranch} from ${publicBase}\n`);
if (privateBase) {
  process.stdout.write(`Private: v4/slice/${sliceId} from ${privateBase}\n`);
}
process.stdout.write(`Cleanup after committing or discarding all changes: pnpm worktree:remove ${sliceId}\n`);
