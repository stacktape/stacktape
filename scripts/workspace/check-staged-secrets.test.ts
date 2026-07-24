import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const checker = fileURLToPath(new URL('./check-staged-secrets.mjs', import.meta.url));
let repository = '';

const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, {
    cwd: repository,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'user.email',
      GIT_CONFIG_VALUE_0: 'test@example.invalid'
    }
  });
  return result;
};

before(async () => {
  repository = await mkdtemp(path.join(os.tmpdir(), 'stacktape-secret-check-'));
  assert.equal(run('git', ['init']).status, 0);
  assert.equal(run('git', ['config', 'user.name', 'Stacktape Test']).status, 0);
});

after(async () => {
  const resolved = path.resolve(repository);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
  await rm(resolved, { force: true, recursive: true });
});

test('accepts ordinary staged source', async () => {
  await writeFile(path.join(repository, 'safe.ts'), "export const value = 'synthetic';\n");
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
