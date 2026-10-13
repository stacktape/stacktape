import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import { checkTestRegistry } from './check-test-registry.ts';
import { lanes, type Lane, type Slice } from './test-registry.ts';

const lane: Lane = {
  id: 'rules',
  command: ['pnpm', 'test:rules'],
  level: 'focused',
  tier: 'pr',
  tests: ['packages/rules/rule.test.ts'],
  requires: [],
  release: 'every-candidate'
};
const slice: Slice = {
  id: 'S01',
  promise: 'Rules reject invalid input.',
  status: 'active',
  journeys: ['J2'],
  paths: ['packages/rules/**'],
  tests: ['packages/rules/rule.test.ts'],
  lanes: ['rules']
};
const fixture = async (context: TestContext) => {
  const root = await mkdtemp(join(tmpdir(), 'slice-registry-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'packages/rules'), { recursive: true });
  await writeFile(join(root, 'packages/rules/rule.test.ts'), 'export {};');
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ scripts: { 'test:rules': 'bun test packages/rules/rule.test.ts' } })
  );
  execFileSync('git', ['init', '--quiet', root]);
  execFileSync('git', ['add', '.'], { cwd: root });
  return root;
};
test('a new unowned test fails even inside an owned implementation directory', async (context) => {
  const root = await fixture(context);
  await writeFile(join(root, 'packages/rules/new.test.ts'), 'export {};');
  const errors = await checkTestRegistry({ root, registeredLanes: [lane], registeredSlices: [slice], tooling: [] });
  assert.equal(errors.length, 1);
  assert.match(errors[0]!, /new.test.ts: no test owner.*exact path.*slice's tests/);
});
test('missing lane and script failures name the exact repair', async (context) => {
  const root = await fixture(context);
  assert.match(
    (
      await checkTestRegistry({
        root,
        registeredLanes: [lane],
        registeredSlices: [{ ...slice, lanes: [] }],
        tooling: []
      })
    ).join('\n'),
    /S01: add implementation paths and at least one lane ID/
  );
  assert.match(
    (
      await checkTestRegistry({
        root,
        registeredLanes: [{ ...lane, command: ['pnpm', 'test:missing'] }],
        registeredSlices: [slice],
        tooling: []
      })
    ).join('\n'),
    /script test:missing does not exist/
  );
});
test('tooling and excluded owners are explicit and duplicate owners fail', async (context) => {
  const root = await fixture(context);
  assert.deepEqual(
    await checkTestRegistry({ root, registeredLanes: [lane], registeredSlices: [], tooling: slice.tests }),
    []
  );
  assert.deepEqual(
    await checkTestRegistry({
      root,
      registeredLanes: [lane],
      registeredSlices: [{ ...slice, status: 'excluded', lanes: [] }],
      tooling: []
    }),
    []
  );
  assert.match(
    (
      await checkTestRegistry({
        root,
        registeredLanes: [lane],
        registeredSlices: [slice, { ...slice, id: 'S02' }],
        tooling: []
      })
    ).join('\n'),
    /duplicate primary owners S01 and S02/
  );
});
test('private lanes are checked only with Console present; unknown database flags fail', async (context) => {
  const root = await fixture(context);
  const privateLane: Lane = {
    ...lane,
    id: 'db',
    command: ['pnpm', '--filter', '@stacktape/console-api-app', 'test:db', '--absent'],
    tier: 'change',
    level: 'api-db',
    requires: ['console', 'docker'],
    tests: []
  };
  assert.deepEqual(
    await checkTestRegistry({ root, registeredLanes: [privateLane], registeredSlices: [], tooling: slice.tests }),
    []
  );
  await mkdir(join(root, 'apps/console/api/scripts'), { recursive: true });
  await writeFile(
    join(root, 'apps/console/api/package.json'),
    JSON.stringify({ name: '@stacktape/console-api-app', scripts: { 'test:db': 'bun scripts/run-db-integration.ts' } })
  );
  await writeFile(join(root, 'apps/console/api/scripts/run-db-integration.ts'), "const lanes = { '--known': {} };");
  assert.match(
    (
      await checkTestRegistry({ root, registeredLanes: [privateLane], registeredSlices: [], tooling: slice.tests })
    ).join('\n'),
    /DB flag --absent does not exist/
  );
});
test('a script pointing to a nonexistent Playwright project fails', async (context) => {
  const root = await fixture(context);
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ scripts: { 'test:rules': 'playwright test --project=missing' } })
  );
  await writeFile(join(root, 'playwright.config.ts'), "export default { projects: [{ name: 'known' }] };");
  assert.match(
    (
      await checkTestRegistry({
        root,
        registeredLanes: [{ ...lane, tier: 'change' }],
        registeredSlices: [slice],
        tooling: []
      })
    ).join('\n'),
    /Playwright project missing is absent/
  );
});
test('the PR tier rejects a heavy prerequisite', async (context) => {
  const root = await fixture(context);
  assert.match(
    (
      await checkTestRegistry({
        root,
        registeredLanes: [{ ...lane, requires: ['docker'] }],
        registeredSlices: [slice],
        tooling: []
      })
    ).join('\n'),
    /pr lanes must be offline/
  );
  assert.ok(lanes.filter((l) => l.tier === 'pr').every((l) => l.requires.every((r) => r === 'console')));
});

test('a public lane cannot silently depend on private test files', async (context) => {
  const root = await fixture(context);
  const errors = await checkTestRegistry({
    root,
    registeredLanes: [{ ...lane, tests: ['apps/console/ui/e2e/authenticated.spec.ts'] }],
    registeredSlices: [slice],
    tooling: []
  });
  assert.match(errors.join('\n'), /private test entrypoint .*needs requires: \['console'\]/);
});

test('an unowned authored test in __tests__ fails ownership', async (context) => {
  const root = await fixture(context);
  await mkdir(join(root, 'packages/rules/__tests__'), { recursive: true });
  await writeFile(join(root, 'packages/rules/__tests__/fault.test.ts'), 'export {};');
  const errors = await checkTestRegistry({ root, registeredLanes: [lane], registeredSlices: [slice], tooling: [] });
  assert.match(errors.join('\n'), /__tests__\/fault.test.ts: no test owner/);
});
test('each active path pattern must match a tracked file', async (context) => {
  const root = await fixture(context);
  await writeFile(join(root, 'packages/rules/untracked.ts'), 'export {};');
  const errors = await checkTestRegistry({
    root,
    registeredLanes: [lane],
    registeredSlices: [
      { ...slice, paths: [...slice.paths, 'packages/rules/renamed.ts', 'packages/rules/untracked.ts'] }
    ],
    tooling: []
  });
  assert.equal(errors.length, 2);
  assert.ok(errors.every((error) => error.includes('matches no tracked file') && error.includes('Update slice.paths')));
});
