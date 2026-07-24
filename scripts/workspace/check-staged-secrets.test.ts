import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, afterEach, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const checker = fileURLToPath(new URL('./check-staged-secrets.mjs', import.meta.url));
let repository = '';

const run = (command: string, args: string[]) =>
  spawnSync(command, args, {
    cwd: repository,
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

before(async () => {
  repository = await mkdtemp(path.join(os.tmpdir(), 'stacktape-secret-check-'));
  assert.equal(run('git', ['init']).status, 0);
  await writeFile(path.join(repository, 'safe.ts'), "export const value = 'synthetic';\n");
  assert.equal(run('git', ['add', 'safe.ts']).status, 0);
  assert.equal(run('git', ['commit', '-m', 'Initialize fixture']).status, 0);
});

afterEach(() => {
  assert.equal(run('git', ['reset', '--hard', 'HEAD']).status, 0);
  assert.equal(run('git', ['clean', '-fd']).status, 0);
});

after(async () => {
  const resolved = path.resolve(repository);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
  await rm(resolved, { force: true, recursive: true });
});

test('accepts ordinary staged source', async () => {
  await writeFile(path.join(repository, 'safe.ts'), "export const value = 'changed-synthetic';\n");
  assert.equal(run('git', ['add', 'safe.ts']).status, 0);
  const result = run(process.execPath, [checker, repository]);
  assert.equal(result.status, 0, result.stderr);
});

test('rejects newly staged high-confidence credential formats without echoing values', async () => {
  const synthetic = ['AKIA', 'ABCDEFGHIJKLMNOP'].join('');
  await writeFile(path.join(repository, 'unsafe.ts'), `export const credential = '${synthetic}';\n`);
  assert.equal(run('git', ['add', 'unsafe.ts']).status, 0);
  const result = run(process.execPath, [checker, repository]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /possible AWS access key/);
  assert.doesNotMatch(result.stderr, new RegExp(synthetic));
});

test('checks added lines when a staged file is classified as a rename', async () => {
  const synthetic = ['AKIA', 'QRSTUVWXYZABCDEF'].join('');
  assert.equal(run('git', ['mv', 'safe.ts', 'renamed.ts']).status, 0);
  await writeFile(path.join(repository, 'renamed.ts'), `export const credential = '${synthetic}';\n`);
  assert.equal(run('git', ['add', 'renamed.ts']).status, 0);
  const result = run(process.execPath, [checker, repository]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /possible AWS access key/);
  assert.doesNotMatch(result.stderr, new RegExp(synthetic));
});

test('CI mode scans tracked files without printing matched values', async () => {
  const synthetic = ['AKIA', 'FEDCBAZYXWVUTSRQ'].join('');
  await writeFile(path.join(repository, 'tracked-secret.ts'), `export const credential = '${synthetic}';\n`);
  assert.equal(run('git', ['add', 'tracked-secret.ts']).status, 0);
  assert.equal(run('git', ['commit', '-m', 'Add synthetic tracked credential']).status, 0);
  const result = run(process.execPath, [checker, repository, '--tree']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /tracked-secret\.ts: possible AWS access key/);
  assert.doesNotMatch(result.stderr, new RegExp(synthetic));
});
