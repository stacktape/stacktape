import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const sourceScript = fileURLToPath(new URL('./configure-hooks.ts', import.meta.url));
let fixtureRoot = '';
let repository = '';
let linkedWorktree = '';
let unconfiguredWorktree = '';

const git = (cwd: string, args: string[]) => {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: '2',
      GIT_CONFIG_KEY_0: 'user.email',
      GIT_CONFIG_KEY_1: 'user.name',
      GIT_CONFIG_VALUE_0: 'test@example.invalid',
      GIT_CONFIG_VALUE_1: 'Stacktape Test'
    }
  });
  assert.equal(result.status, 0, `git ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
};

const configureHooks = (cwd: string) => {
  const result = spawnSync(process.execPath, ['scripts/workspace/configure-hooks.ts'], { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
};

before(async () => {
  fixtureRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), 'stacktape-hooks-')));
  repository = path.join(fixtureRoot, 'repository');
  linkedWorktree = path.join(fixtureRoot, 'linked');
  unconfiguredWorktree = path.join(fixtureRoot, 'unconfigured');

  await mkdir(path.join(repository, 'scripts', 'workspace'), { recursive: true });
  await mkdir(path.join(repository, '.githooks'), { recursive: true });
  await copyFile(sourceScript, path.join(repository, 'scripts', 'workspace', 'configure-hooks.ts'));
  await writeFile(path.join(repository, '.githooks', 'pre-commit'), '# fixture\n');

  git(fixtureRoot, ['init', '--initial-branch=main', repository]);
  git(repository, ['add', '.']);
  git(repository, ['commit', '-m', 'Initialize hook fixture']);
  git(repository, ['worktree', 'add', '-b', 'linked', linkedWorktree]);
  git(repository, ['worktree', 'add', '-b', 'unconfigured', unconfiguredWorktree]);
});

after(async () => {
  const resolved = path.resolve(fixtureRoot);
  assert.ok(resolved.startsWith(await realpath(os.tmpdir())));
  await rm(resolved, { force: true, recursive: true });
});

test('keeps hook paths independent across linked worktrees', () => {
  configureHooks(repository);
  configureHooks(linkedWorktree);

  assert.equal(git(repository, ['config', '--local', '--get', 'extensions.worktreeConfig']), 'true');
  assert.equal(
    git(repository, ['config', '--worktree', '--get', 'core.hooksPath']),
    path.join(repository, '.githooks')
  );
  assert.equal(
    git(linkedWorktree, ['config', '--worktree', '--get', 'core.hooksPath']),
    path.join(linkedWorktree, '.githooks')
  );
  assert.equal(
    git(unconfiguredWorktree, ['config', '--get', 'core.hooksPath']),
    path.join(repository, '.githooks'),
    'a pre-existing worktree keeps using the valid shared fallback until it runs prepare'
  );
});
