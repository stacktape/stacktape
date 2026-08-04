import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const createScript = fileURLToPath(new URL('./create-worktree.ts', import.meta.url));
const removeScript = fileURLToPath(new URL('./remove-worktree.ts', import.meta.url));
let fixtureRoot = '';
let publicRepository = '';
let privateOrigin = '';

const run = ({ args, command, cwd = publicRepository }: { args: string[]; command: string; cwd?: string }) =>
  spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_ALLOW_PROTOCOL: 'file',
      GIT_CONFIG_COUNT: '2',
      GIT_CONFIG_KEY_0: 'user.email',
      GIT_CONFIG_KEY_1: 'user.name',
      GIT_CONFIG_VALUE_0: 'test@example.invalid',
      GIT_CONFIG_VALUE_1: 'Stacktape Test'
    }
  });

const mustRun = (command: string, args: string[], cwd?: string) => {
  const result = run({ args, command, ...(cwd ? { cwd } : {}) });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
};

const runAgentScript = (script: string, args: string[]) => run({ args: [script, ...args], command: process.execPath });

before(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'stacktape-worktree-'));
  publicRepository = path.join(fixtureRoot, 'public');
  const publicOrigin = path.join(fixtureRoot, 'public-origin.git');
  privateOrigin = path.join(fixtureRoot, 'private-origin.git');
  const privateSeed = path.join(fixtureRoot, 'private-seed');

  mustRun('git', ['init', '--bare', privateOrigin], fixtureRoot);
  mustRun('git', ['init', '--initial-branch=v4/integration', privateSeed], fixtureRoot);
  await writeFile(path.join(privateSeed, 'README.md'), '# Private fixture\n');
  mustRun('git', ['add', 'README.md'], privateSeed);
  mustRun('git', ['commit', '-m', 'Initialize private fixture'], privateSeed);
  mustRun('git', ['remote', 'add', 'origin', privateOrigin], privateSeed);
  mustRun('git', ['push', '--set-upstream', 'origin', 'v4/integration'], privateSeed);
  mustRun('git', ['symbolic-ref', 'HEAD', 'refs/heads/v4/integration'], privateOrigin);

  mustRun('git', ['init', '--initial-branch=v4/integration', publicRepository], fixtureRoot);
  await writeFile(
    path.join(publicRepository, 'package.json'),
    `${JSON.stringify({ packageManager: 'pnpm@11.17.0', private: true }, null, 2)}\n`
  );
  await writeFile(
    path.join(publicRepository, 'pnpm-workspace.yaml'),
    'autoInstallPeers: false\nsharedWorkspaceLockfile: false\nstrictPeerDependencies: true\n'
  );
  await writeFile(
    path.join(publicRepository, 'pnpm-lock.yaml'),
    "lockfileVersion: '9.0'\n\nsettings:\n  autoInstallPeers: false\n  excludeLinksFromLockfile: false\n\nimporters:\n\n  .: {}\n"
  );
  await writeFile(
    path.join(publicRepository, '.gitignore'),
    '.stacktape-agent.json\n.stacktape-dossier.md\n.worktrees/\nnode_modules/\n'
  );
  await writeFile(path.join(publicRepository, 'dossier.md'), '# Fixture dossier\n');
  mustRun(
    'git',
    ['-c', 'protocol.file.allow=always', 'submodule', 'add', privateOrigin, 'apps/console'],
    publicRepository
  );
  mustRun('git', ['add', '.'], publicRepository);
  mustRun('git', ['commit', '-m', 'Initialize public fixture'], publicRepository);

  mustRun('git', ['init', '--bare', publicOrigin], fixtureRoot);
  mustRun('git', ['remote', 'add', 'origin', publicOrigin], publicRepository);
  mustRun('git', ['push', '--set-upstream', 'origin', 'v4/integration'], publicRepository);
  mustRun('git', ['symbolic-ref', 'HEAD', 'refs/heads/v4/integration'], publicOrigin);
});

after(async () => {
  const resolved = path.resolve(fixtureRoot);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
  await rm(resolved, { force: true, recursive: true });
});

test('creates independent public/private worktrees and removes only recoverable private heads', () => {
  for (const slice of ['one', 'two']) {
    const result = runAgentScript(createScript, [slice, '--private', '--dossier', 'dossier.md']);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  }

  const first = path.join(publicRepository, '.worktrees', 'one');
  const second = path.join(publicRepository, '.worktrees', 'two');
  const firstPrivateGitDir = mustRun('git', ['rev-parse', '--git-dir'], path.join(first, 'apps', 'console'));
  const secondPrivateGitDir = mustRun('git', ['rev-parse', '--git-dir'], path.join(second, 'apps', 'console'));
  assert.notEqual(
    path.resolve(path.join(first, 'apps', 'console'), firstPrivateGitDir),
    path.resolve(path.join(second, 'apps', 'console'), secondPrivateGitDir)
  );
  assert.match(mustRun('git', ['branch', '--show-current'], path.join(first, 'apps', 'console')), /^v4\/slice\/one$/);

  for (const slice of ['one', 'two']) {
    const result = runAgentScript(removeScript, [slice]);
    assert.equal(result.status, 0, result.stderr);
    mustRun('git', ['show-ref', '--verify', `refs/heads/v4/slice/${slice}`], publicRepository);
  }
});

test('refuses cleanup when a private commit exists only in disposable worktree metadata', async () => {
  const create = runAgentScript(createScript, ['guard', '--private']);
  assert.equal(create.status, 0, `${create.stdout}\n${create.stderr}`);
  const worktree = path.join(publicRepository, '.worktrees', 'guard');
  const privateRoot = path.join(worktree, 'apps', 'console');
  const metadata = JSON.parse(await readFile(path.join(worktree, '.stacktape-agent.json'), 'utf8'));

  mustRun('git', ['commit', '--allow-empty', '-m', 'Synthetic local-only commit'], privateRoot);
  const refused = runAgentScript(removeScript, ['guard']);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /not reachable from a remote-tracking ref/);

  mustRun('git', ['push', 'origin', 'HEAD:refs/heads/v4/slice/stale-recoverability'], privateRoot);
  mustRun('git', ['fetch', 'origin'], privateRoot);
  mustRun('git', ['update-ref', '-d', 'refs/heads/v4/slice/stale-recoverability'], privateOrigin);
  const staleRemoteRef = runAgentScript(removeScript, ['guard']);
  assert.notEqual(staleRemoteRef.status, 0);
  assert.match(staleRemoteRef.stderr, /not reachable from a remote-tracking ref/);

  mustRun('git', ['reset', '--hard', metadata.privateBase], privateRoot);
  const removed = runAgentScript(removeScript, ['guard']);
  assert.equal(removed.status, 0, removed.stderr);
});

test('rejects the wrong base branch, remote branch collisions, and external dossiers', async () => {
  mustRun('git', ['switch', '-c', 'legacy-main'], publicRepository);
  const wrongBase = runAgentScript(createScript, ['wrong-base']);
  assert.notEqual(wrongBase.status, 0);
  assert.match(wrongBase.stderr, /only from v4\/integration/);
  mustRun('git', ['switch', 'v4/integration'], publicRepository);

  mustRun('git', ['branch', 'v4/slice/collision'], publicRepository);
  mustRun('git', ['push', 'origin', 'v4/slice/collision'], publicRepository);
  mustRun('git', ['branch', '--delete', 'v4/slice/collision'], publicRepository);
  const collision = runAgentScript(createScript, ['collision']);
  assert.notEqual(collision.status, 0);
  assert.match(collision.stderr, /Public branch already exists/);

  const outsideDossier = path.join(fixtureRoot, 'outside.md');
  await writeFile(outsideDossier, '# Outside\n');
  const outside = runAgentScript(createScript, ['external-dossier', '--dossier', outsideDossier]);
  assert.notEqual(outside.status, 0);
  assert.match(outside.stderr, /Unsafe path outside/);
});
