import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  collectChangedPaths,
  createTestPlan,
  parsePorcelainStatusPaths,
  parseTestPlanArgs,
  type TestLane
} from './test-plan.ts';

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
  for (const flag of [
    'runner',
    'gitlab',
    'security',
    'issues',
    'incidents',
    'incident-agent',
    'sign-up',
    'console-access',
    'cli-console',
    'incident-journey',
    'git-deploy',
    'insights',
    'billing'
  ]) {
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

test('CLI selects the database suites that exercise progress, installation, webhooks and Git secrets', () => {
  for (const [path, flag] of [
    ['src/services/stack-operation-progress.ts', 'runner'],
    ['src/services/github-project-installation.ts', 'runner'],
    ['src/integrations/git/webhook-delivery.ts', 'runner'],
    ['src/services/git-connection-secret-store.ts', 'gitlab']
  ]) {
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        [fileURLToPath(new URL('./test-plan.ts', import.meta.url)), `--paths=apps/console/api/${path}`, '--json'],
        {
          encoding: 'utf8'
        }
      )
    ) as { lanes: TestLane[] };
    assert.ok(
      result.lanes.some(({ commands }) =>
        commands.includes(`pnpm --filter @stacktape/console-api-app test:db --${flag}`)
      ),
      String(path)
    );
  }
});

test('suite imports select new and deleted dependencies without executing private source', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-j13-plan-imports-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const scripts = join(root, 'apps/console/api/scripts');
  await mkdir(scripts, { recursive: true });
  await writeFile(
    join(scripts, 'runner-database.test.ts'),
    `
    import { read } from '../src/services/tenant-boundary.js';
    import '../src/services/side-effect';
    const load = () => import('../src/services/dynamic-check.ts');
    throw new Error('The planner must never execute this suite.');
  `
  );
  await writeFile(join(scripts, 'gitlab-database.test.ts'), "import { read } from '../src/services/secret-boundary';");
  const selects = (path: string, flag: string) =>
    createTestPlan([`apps/console/api/${path}`], root).some(({ commands }) =>
      commands.includes(`pnpm --filter @stacktape/console-api-app test:db --${flag}`)
    );
  for (const path of ['tenant-boundary.ts', 'side-effect/index.ts', 'dynamic-check.ts']) {
    assert.ok(selects(`src/services/${path}`, 'runner'), path);
    assert.ok(!selects(`src/services/${path}`, 'gitlab'), path);
  }
  assert.ok(selects('src/services/secret-boundary.ts', 'gitlab'));
  assert.ok(!selects('src/services/secret-boundary.ts', 'runner'));
  await writeFile(join(scripts, 'insights-runtime.test.ts'), "import '../src/services/catalog-boundary';");
  assert.ok(selects('src/services/catalog-boundary.ts', 'insights'));
  assert.ok(!selects('src/services/unrelated-boundary.ts', 'insights'));
  await writeFile(join(scripts, 'runner-database.test.ts'), "import '../src/services/new-boundary';");
  assert.ok(selects('src/services/new-boundary.ts', 'runner'));
  assert.ok(!selects('src/services/tenant-boundary.ts', 'runner'));
  // No implementation files exist: deleted dependencies still need their suite.
});

test('missing private suite source conservatively selects database features', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-j13-plan-public-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const commands = new Set(
    createTestPlan(['apps/console/api/src/services/unknown-boundary.ts'], root).flatMap((lane) => lane.commands)
  );
  for (const flag of [
    'runner',
    'gitlab',
    'security',
    'issues',
    'incidents',
    'incident-agent',
    'sign-up',
    'console-access',
    'cli-console',
    'incident-journey',
    'git-deploy',
    'insights',
    'billing'
  ]) {
    assert.ok(commands.has(`pnpm --filter @stacktape/console-api-app test:db --${flag}`));
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
    for (const flag of [
      'runner',
      'gitlab',
      'security',
      'issues',
      'incidents',
      'incident-agent',
      'sign-up',
      'console-access',
      'cli-console',
      'incident-journey',
      'git-deploy',
      'insights',
      'billing'
    ]) {
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

test('batch 1 Console paths select their journey database lanes', () => {
  for (const [path, flags] of [
    ['apps/console/api/scripts/console-tenancy-database.test.ts', ['console-access']],
    ['apps/console/api/src/organizations/index.ts', ['console-access']],
    ['apps/console/api/scripts/console-tenant-fixtures.ts', ['console-access', 'cli-console', 'billing', 'insights']],
    ['apps/console/api/src/services/stack-operation-progress.ts', ['cli-console']],
    ['apps/cli/src/app/stacktape-trpc-api-manager/operation-recording.ts', ['cli-console']],
    ['apps/cli/src/domain/notification-manager/index.ts', ['cli-console']],
    ['apps/cli/src/config/cli/commands.ts', ['cli-console']],
    ['apps/cli/src/commands/defaults-configure/index.ts', ['cli-console']],
    ['apps/cli/src/commands/info-whoami/index.ts', ['cli-console']],
    ['apps/cli/src/commands/org-create/index.ts', ['cli-console']],
    ['apps/console/api/src/services/alert-router.ts', ['incidents', 'incident-journey']],
    ['apps/cli/helper-lambdas/uptimeProber/index.ts', ['incident-journey']],
    ['apps/console/api/src/integrations/bitbucket/index.ts', ['git-deploy']],
    ['apps/console/api/scripts/git-deploy-journey.test.ts', ['git-deploy']],
    ['packages/pricing/src/pricing.ts', ['insights']],
    ['apps/cli/src/aws/observability.ts', ['insights']],
    ['apps/console/api/src/security/osv-client.ts', ['insights', 'security']],
    ['apps/console/api/src/lambdas/paddle-hooks.ts', ['billing']],
    ['apps/console/api/scripts/billing-database.test.ts', ['billing']]
  ] as [string, string[]][]) {
    const commands = new Set(createTestPlan([path]).flatMap((lane) => lane.commands));
    for (const flag of flags) {
      assert.ok(commands.has(`pnpm --filter @stacktape/console-api-app test:db --${flag}`), `${path}: --${flag}`);
    }
  }
});

test('batch 1 public paths select all new explicit acceptance lanes', () => {
  for (const [path, command] of [
    ['apps/cli/src/domain/template-manager/finalize.ts', 'pnpm --filter @stacktape/cli run test:data-safety'],
    [
      'apps/cli/src/domain/calculated-stack-overview-manager/index.ts',
      'pnpm --filter @stacktape/cli run test:data-safety'
    ],
    ['apps/cli/src/utils/stack-info-map-diff.ts', 'pnpm --filter @stacktape/cli run test:data-safety'],
    ['apps/cli/src/domain/deployment-change-plan/index.ts', 'pnpm --filter @stacktape/cli run test:data-safety'],
    ['packages/naming/src/index.ts', 'pnpm --filter @stacktape/cli run test:data-safety'],
    ['apps/cli/tests/config-loading/directives.spec.ts', 'pnpm --filter @stacktape/cli run test:config-loading'],
    ['apps/cli/src/utils/python-bridge/index.ts', 'pnpm --filter @stacktape/cli run test:config-loading'],
    [
      'apps/cli/tests/synthesis-families/families.spec.ts',
      'pnpm --filter @stacktape/cli run test:synthesis-families:cfn-lint'
    ],
    ['apps/cli/src/commands/delete/index.ts', 'pnpm --filter @stacktape/cli run test:cli-process'],
    ['apps/cli/src/commands/dev/index.ts', 'pnpm test:aws --aws-scenario=dev-mode-local-loop'],
    ['apps/cli/src/commands/query-sql/index.ts', 'pnpm --filter @stacktape/cli run test:operations:db'],
    ['apps/cli/src/domain/debug-services/db-client.ts', 'pnpm --filter @stacktape/cli run test:operations:db'],
    ['apps/cli/src/aws/observability.ts', 'pnpm --filter @stacktape/cli run test:operations'],
    ['packages/packaging/src/bundlers/es/index.ts', 'pnpm --filter @stacktape/cli run test:node-lambda'],
    ['packages/packaging/src/web/astro.ts', 'pnpm --filter @stacktape/cli run test:ssr-web'],
    [
      'apps/cli/helper-lambdas/cdnOriginRequest/index.ts',
      'pnpm --filter @stacktape/cli run test:helper-lambda-runtime'
    ],
    ['apps/cli/starter-projects/nextjs/stacktape.yml', 'pnpm --filter @stacktape/cli run qualify:starters'],
    [
      'apps/cli/scripts/qualification/run-project-qualification.ts',
      'pnpm --filter @stacktape/cli run test:runtime-acceptances'
    ],
    ['apps/cli/src/commands/mcp-add/index.ts', 'pnpm --filter @stacktape/cli run test:mcp-executable'],
    ['apps/vscode-extension/src/extension.ts', 'pnpm --filter vscode-stacktape run test:host'],
    ['apps/docs/content/compute/lambda-functions.mdx', 'pnpm --filter @stacktape/docs run test:build-contracts']
  ] as [string, string][]) {
    assert.ok(
      createTestPlan([path]).some((lane) => lane.commands.includes(command)),
      `${path}: ${command}`
    );
  }
});

test('J1 init acceptance is selected for init, importer, corpus and its own scenario paths', () => {
  for (const path of [
    'apps/cli/src/init/index.ts',
    'apps/cli/src/commands/init/index.ts',
    'packages/config-inference/src/policy/index.ts',
    'packages/config-inference/src/scan/importers/terraform.ts',
    'apps/cli/scripts/init-e2e/first-deployment.spec.ts',
    'apps/cli/scripts/init-e2e/harness.ts',
    'apps/cli/scripts/init-real-project-corpus.ts',
    'apps/cli/scripts/validate-synthetic-project-corpus.ts'
  ]) {
    assert.ok(
      createTestPlan([path]).some((lane) => lane.commands.includes('pnpm --filter @stacktape/cli test:init:e2e')),
      path
    );
  }
});

test('unrelated presentation changes do not select batch 1 database, init or Docker query lanes', () => {
  for (const path of ['apps/website/src/pages/index.astro', 'apps/console/ui/src/components/Button.tsx']) {
    const commands = createTestPlan([path]).flatMap((lane) => lane.commands);
    assert.ok(!commands.some((command) => command.includes('test:db --')));
    assert.ok(!commands.some((command) => command.includes('test:operations:db')));
    assert.ok(!commands.some((command) => command.includes('test:init:e2e')));
  }
});
