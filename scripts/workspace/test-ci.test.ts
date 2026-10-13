import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { type Lane } from './test-registry.ts';

const lane = (id: string, tier: Lane['tier'], requires: Lane['requires'] = []): Lane => ({
  id,
  tier,
  requires,
  command: ['pnpm', id],
  level: 'process',
  tests: [],
  release: 'every-candidate'
});

test('the actual CI runner generates sources, executes only available PR lanes and stops on the first failed command', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-ci-runner-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'scripts/workspace'), { recursive: true });
  const runner = join(root, 'scripts/workspace/test-ci.ts');
  await copyFile(new URL('./test-ci.ts', import.meta.url), runner);
  const record = join(root, 'executed.jsonl');
  const shim = join(root, 'fixture-pnpm.cjs');
  await writeFile(
    shim,
    `const fs = require('node:fs');
    const [id] = process.argv.slice(2);
    fs.appendFileSync(${JSON.stringify(record)}, JSON.stringify({ id, cwd: process.cwd() }) + '\\n');
    if (id === process.env.STP_CI_FAIL_LANE) process.exitCode = 7;
  `
  );
  const registry = [
    lane('public', 'pr'),
    lane('private', 'pr', ['console']),
    lane('change', 'change'),
    lane('release', 'release'),
    lane('last', 'pr')
  ];
  const registryPath = join(root, 'scripts/workspace/test-registry.ts');
  await writeFile(registryPath, `export const lanes = ${JSON.stringify(registry)};`);
  const run = (fail = '') =>
    spawnSync(process.execPath, [runner], {
      cwd: root,
      encoding: 'utf8',
      timeout: 15_000,
      env: { PATH: process.env.PATH, npm_execpath: shim, npm_node_execpath: process.execPath, STP_CI_FAIL_LANE: fail }
    });
  const results = async () =>
    (await readFile(record, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { id: string; cwd: string });
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    (await results()).map(({ id }) => id),
    ['exec', 'public', 'last']
  );
  const expectedDirectory = await realpath(root);
  const directories = await Promise.all((await results()).map(({ cwd }) => realpath(cwd)));
  assert.ok(directories.every((directory) => directory === expectedDirectory));
  await mkdir(join(root, 'apps/console/api'), { recursive: true });
  await writeFile(join(root, 'apps/console/api/package.json'), '{}');
  await rm(record);
  result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    (await results()).map(({ id }) => id),
    ['exec', 'public', 'private', 'last']
  );
  await rm(record);
  result = run('private');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /private failed \(exit 7\)/);
  assert.deepEqual(
    (await results()).map(({ id }) => id),
    ['exec', 'public', 'private']
  );
  await rm(record);
  await writeFile(registryPath, `export const lanes = ${JSON.stringify([lane('heavy', 'pr', ['docker'])])};`);
  result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Move it to change\/release/);
  await assert.rejects(readFile(record), { code: 'ENOENT' });
});
