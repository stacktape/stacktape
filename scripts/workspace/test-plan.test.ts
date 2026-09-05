import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { collectChangedPaths, createTestPlan, parsePorcelainStatusPaths, parseTestPlanArgs } from './test-plan.ts';

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();

test('committed Console gitlinks expand into the real changed and deleted private paths', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-test-plan-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const consoleRoot = join(root, 'apps', 'console');
  await mkdir(join(consoleRoot, 'api', 'prisma'), { recursive: true });
  await mkdir(join(consoleRoot, 'api', 'src'), { recursive: true });
  git(root, 'init');
  git(consoleRoot, 'init');
  await writeFile(join(consoleRoot, 'api', 'prisma', 'old.sql'), 'SELECT 1;');
  await writeFile(join(root, 'package.json'), '{}');
  git(consoleRoot, 'add', '.');
  git(consoleRoot, 'commit', '-m', 'initial');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'initial');
  const baseline = git(root, 'rev-parse', 'HEAD');
  await rm(join(consoleRoot, 'api', 'prisma', 'old.sql'));
  await writeFile(join(consoleRoot, 'api', 'src', 'server.ts'), 'export {};');
  await rm(join(root, 'package.json'));
  git(consoleRoot, 'add', '-A');
  git(consoleRoot, 'commit', '-m', 'change API and remove migration');

  const dirtyPaths = await collectChangedPaths({ json: true }, root);
  assert.ok(dirtyPaths.includes('apps/console/api/src/server.ts'));
  git(root, 'add', '-A');
  git(root, 'commit', '-m', 'advance private pointer and remove root file');
  const paths = await collectChangedPaths({ json: true, since: baseline }, root);
  assert.deepEqual(paths, [
    'apps/console',
    'apps/console/api/prisma/old.sql',
    'apps/console/api/src/server.ts',
    'package.json'
  ]);
  const ids = new Set(createTestPlan(paths).map(({ id }) => id));
  for (const id of [
    'console-api',
    'console-database',
    'console-browser-local-api',
    'integrated-gate',
    'workspace-tools'
  ]) {
    assert.ok(ids.has(id), `missing ${id}`);
  }
});

test('a changed private gitlink still requires integrated checks without private source', () => {
  assert.ok(createTestPlan(['apps/console']).some(({ id }) => id === 'integrated-gate'));
});

test('selects process, browser, database, deployed-dev, AWS, and integrated evidence for a Console runner change', () => {
  const ids = new Set(
    createTestPlan([
      'apps/console/api/src/services/remote-deploy/ec2/index.ts',
      'apps/console/api/prisma/schema.prisma',
      'apps/console/ui/src/pages/ProjectsPage/ProjectOverview/GithubRunnerConfigModal.tsx'
    ]).map(({ id }) => id)
  );

  for (const expected of [
    'console-api',
    'console-database',
    'console-ui',
    'console-browser-local-api',
    'console-deployed-dev',
    'integrated-gate'
  ]) {
    assert.ok(ids.has(expected), `missing ${expected}`);
  }
  assert.ok(!ids.has('console-browser-dev-api'), 'the deployed API must not stand in for changed local API code');
});

test('uses the self-starting deployed-dev browser lane for a UI-only change', () => {
  const ids = new Set(createTestPlan(['apps/console/ui/src/App.tsx']).map(({ id }) => id));
  assert.ok(ids.has('console-browser-dev-api'));
  assert.ok(!ids.has('console-browser-local-api'));
});

test('selects semantic synthesis and live AWS evidence for CloudFormation changes', () => {
  const ids = new Set(createTestPlan(['packages/cloudformation/src/template.ts']).map(({ id }) => id));
  assert.ok(ids.has('synthesis'));
  assert.ok(ids.has('live-aws'));
  assert.ok(ids.has('public-gate'));
});

test('parses explicit paths without also accepting a Git baseline', () => {
  assert.deepEqual(
    parseTestPlanArgs(['--', '--paths=./apps/cli/src/index.ts, packages/naming/src/index.ts', '--json']),
    {
      json: true,
      paths: ['apps/cli/src/index.ts', 'packages/naming/src/index.ts']
    }
  );
  assert.throws(() => parseTestPlanArgs(['--paths=a', '--since=main']), /either/);
});

test('preserves staged, unstaged, untracked, unusual and both renamed Git paths', () => {
  assert.deepEqual(
    parsePorcelainStatusPaths(
      ' M AGENTS.md\0M  package.json\0?? scripts/new.ts\0R  new.ts\0old.ts\0?? scripts/a -> b\nž.ts\0'
    ),
    ['AGENTS.md', 'package.json', 'scripts/new.ts', 'new.ts', 'old.ts', 'scripts/a -> b\nž.ts']
  );
});
