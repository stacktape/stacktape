import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ciLanes } from './test-ci.ts';

test('CI selects exactly the PR tier and skips private lanes in public clones', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'slice-ci-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const publicLanes = ciLanes(root);
  assert.ok(publicLanes.length > 0);
  assert.ok(publicLanes.every((l) => l.tier === 'pr' && !l.requires.includes('console')));
  await mkdir(join(root, 'apps/console/api'), { recursive: true });
  await writeFile(join(root, 'apps/console/api/package.json'), '{}');
  const integrated = ciLanes(root);
  assert.ok(integrated.length > publicLanes.length);
  assert.ok(integrated.some((l) => l.id === 'console-ui'));
  assert.ok(integrated.every((l) => l.tier === 'pr'));
  assert.throws(() => ciLanes(root, [{ ...publicLanes[0]!, requires: ['network'] }]), /Move it to change\/release/);
});
