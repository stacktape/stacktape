import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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
  const root = await mkdtemp(join(tmpdir(), 'stacktape-j13-test-plan-'));
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

test('startup config and launcher changes require the local API even alongside a UI change', () => {
  for (const path of ['apps/console/api/stacktape.ts', 'scripts/workspace/run-console-dev.ts']) {
    const ids = new Set(createTestPlan([path, 'apps/console/ui/e2e/authenticated.spec.ts']).map(({ id }) => id));
    assert.ok(ids.has('console-browser-local-api'));
    assert.ok(ids.has('integrated-gate'));
    assert.ok(!ids.has('console-browser-dev-api'));
  }
});

test('browser scenario and configuration edits require executing the browser lane', () => {
  for (const path of ['apps/console/ui/e2e/authenticated.spec.ts', 'apps/console/ui/playwright.config.ts']) {
    assert.ok(createTestPlan([path]).some(({ id }) => id === 'console-browser-dev-api'));
  }
});

test('isolated Console issue journeys select the disposable browser and database lane', () => {
  for (const path of [
    'apps/console/ui/e2e/isolated-console.test.ts',
    'apps/console/ui/src/pages/IssuesPage/IssueDetailPage.tsx',
    'apps/console/api/scripts/run-db-integration.ts'
  ]) {
    const ids = new Set(createTestPlan([path]).map(({ id }) => id));
    assert.ok(ids.has('console-browser-isolated'));
    if (path.endsWith('isolated-console.test.ts')) assert.ok(!ids.has('console-browser-dev-api'));
  }
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

// Drive the same entrypoint pnpm test:plan invokes, with committed and dirty paths
// in both repositories. No production or test runner is substituted.
test('CLI plans heavy evidence from a real changed public/private checkout', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-j13-plan-cli-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const consoleRoot = join(root, 'apps', 'console');
  await mkdir(join(root, 'scripts', 'workspace'), { recursive: true });
  await copyFile(new URL('./test-plan.ts', import.meta.url), join(root, 'scripts', 'workspace', 'test-plan.ts'));
  await mkdir(join(consoleRoot, 'api', 'prisma'), { recursive: true });
  git(root, 'init');
  git(consoleRoot, 'init');
  await writeFile(join(consoleRoot, 'api', 'prisma', 'schema.prisma'), '// original');
  git(consoleRoot, 'add', '.');
  git(consoleRoot, 'commit', '-m', 'baseline');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'baseline');
  const baseline = git(root, 'rev-parse', 'HEAD');
  await writeFile(join(consoleRoot, 'api', 'prisma', 'schema.prisma'), '// changed');
  git(consoleRoot, 'add', '.');
  git(consoleRoot, 'commit', '-m', 'change schema');
  git(root, 'add', 'apps/console');
  git(root, 'commit', '-m', 'advance pointer');
  const publicPaths = [
    'apps/cli/src/domain/deployment-artifact-manager/index.ts',
    'apps/cli/src/config/external-tools.ts',
    'packages/packaging/src/web/nextjs-web.ts',
    'apps/cli/src/init/index.ts'
  ];
  await Promise.all(
    publicPaths.map(async (path) => {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), '// dirty');
    })
  );
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [join(root, 'scripts', 'workspace', 'test-plan.ts'), '--', `--since=${baseline}`, '--json'],
      { cwd: root, encoding: 'utf8' }
    )
  ) as { paths: string[]; lanes: { id: string; commands: string[] }[] };
  assert.deepEqual(result.paths, ['apps/console', 'apps/console/api/prisma/schema.prisma', ...publicPaths].toSorted());
  const commands = new Set(result.lanes.flatMap(({ commands: laneCommands }) => laneCommands));
  for (const flag of ['runner', 'gitlab', 'security', 'issues', 'incidents', 'incident-agent', 'sign-up']) {
    assert.ok(commands.has(`pnpm --filter @stacktape/console-api-app test:db --${flag}`), `missing --${flag}`);
  }
  for (const command of [
    'pnpm --filter @stacktape/console-api-app test:db',
    'pnpm --filter @stacktape/console-api-app test:db --isolated-browser',
    'pnpm --filter @stacktape/cli run test:layer-upload:ministack',
    'pnpm --filter @stacktape/cli run test:external-tools',
    'pnpm --filter @stacktape/packaging run test:web-framework-e2e',
    'pnpm qualify:projects -- --preset=release --lanes=import,package --allow-host-project-code',
    'pnpm qualify:projects -- --lanes=runtime',
    'pnpm --filter @stacktape/cli run test:init:real-project-corpus',
    'pnpm --filter @stacktape/cli run test:init:synthetic-project-corpus',
    'pnpm --filter @stacktape/cli run test:init:synthetic-project-corpus:native'
  ])
    assert.ok(commands.has(command), `missing ${command}`);
});

test('feature paths select the actual database suite, not migrations alone', () => {
  for (const [path, flag] of [
    ['src/services/remote-deploy/ec2/index.ts', 'runner'],
    ['src/integrations/gitlab/index.ts', 'gitlab'],
    ['src/services/security-inventory.ts', 'security'],
    ['src/issues/index.ts', 'issues'],
    ['src/services/incident-assessment.ts', 'incidents'],
    ['src/services/incident-agent-runs.ts', 'incident-agent'],
    ['src/lambdas/create-user-post-sign-up.ts', 'sign-up'],
    ['scripts/incidents-database.test.ts', 'incidents']
  ]) {
    assert.ok(
      createTestPlan([`apps/console/api/${path}`]).some(({ commands }) =>
        commands.includes(`pnpm --filter @stacktape/console-api-app test:db --${flag}`)
      ),
      String(path)
    );
  }
});

test('packaging subsets select runtime checks without unrelated image or web builds', () => {
  const commands = new Set(
    createTestPlan(['packages/packaging/src/split-bundler/layer-builder.ts']).flatMap((lane) => lane.commands)
  );
  assert.ok(commands.has('pnpm --filter @stacktape/packaging run test:node-lambda-e2e'));
  assert.ok(commands.has('pnpm --filter @stacktape/cli run test:layer-upload:ministack'));
  assert.ok(!commands.has('pnpm --filter @stacktape/packaging run test:web-framework-e2e'));
  assert.ok(!commands.has('pnpm --filter @stacktape/packaging run test:docker-smoke'));
});

test('release and installer changes select actual candidate invocation', () => {
  for (const path of ['apps/cli/scripts/release/build-cli-sources.ts', 'apps/cli/scripts/install-scripts/install.sh']) {
    assert.ok(
      createTestPlan([path]).some(({ id }) => id === 'release-installation'),
      String(path)
    );
  }
});

test('common Console startup and router contracts select every isolated database feature suite', () => {
  for (const path of ['src/config.ts', 'src/runtime-parameters.ts', 'src/router.ts', 'src/console-router.ts']) {
    const commands = new Set(createTestPlan([`apps/console/api/${path}`]).flatMap((lane) => lane.commands));
    for (const flag of ['runner', 'gitlab', 'security', 'issues', 'incidents', 'incident-agent', 'sign-up']) {
      assert.ok(commands.has(`pnpm --filter @stacktape/console-api-app test:db --${flag}`), `${path}: --${flag}`);
    }
  }
  assert.ok(
    createTestPlan(['apps/cli/src/domain/packaging-manager/railpack-command.ts']).some(
      ({ id }) => id === 'external-tools'
    )
  );
});

test('runner script, cache and image changes select execution in the isolated Docker runtime', () => {
  for (const path of [
    'src/services/remote-deploy/ec2/rootless-docker.ts',
    'scripts/runner-scripts.test.ts',
    'infrastructure/ec2-runner-image/ec2-runner.pkr.hcl'
  ]) {
    const commands = new Set(createTestPlan([`apps/console/api/${path}`]).flatMap((lane) => lane.commands));
    assert.ok(commands.has('pnpm --filter @stacktape/console-api-app test:runner:scripts'));
    assert.ok(commands.has('pnpm --filter @stacktape/console-api-app test:runner:cache'));
  }
});
