import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export type TestPlanOptions = {
  json: boolean;
  paths?: string[];
  since?: string;
};

export type TestLane = {
  commands: string[];
  id: string;
  proves: string;
};

type Rule = TestLane & {
  matches: (path: string, suiteDependencies: Map<string, Set<string>>) => boolean;
};

const hasPart = (path: string, expression: RegExp) => expression.test(path);
const isConsoleStartupPath = (path: string) =>
  /^scripts\/workspace\/run-console-dev(?:\.test)?\.ts$/.test(path) ||
  /^apps\/console\/api\/stacktape(?:\.test)?\.ts$/.test(path);

// A suite needs one row here when the isolated database runner gains a flag.
// Shared schema, router and fixture changes conservatively exercise every feature suite.
const databaseSuites: [flag: string, feature: RegExp, files?: string[], publicFeature?: RegExp][] = [
  [
    'console-access',
    /console-(access|tenancy|aws-connection|secrets|tenant)|organizations?\/|browser-(access|capabilities)|api-keys|middlewares|billing\/permissions/,
    [
      'console-access-database.test.ts',
      'console-tenancy-database.test.ts',
      'console-aws-connection-database.test.ts',
      'console-secrets-database.test.ts'
    ]
  ],
  [
    'cli-console',
    /cli-console|stack-operation-progress|stack-info/,
    ['cli-console-network.test.ts', 'cli-console-database.test.ts'],
    /^apps\/cli\/src\/(commands\/(_utils\/(auth|aws-profile-input)|login|logout|info-whoami|defaults|aws-profile|org-|project-)|app\/stacktape-trpc-api-manager|domain\/notification-manager|config\/cli\/commands|stacktape-api\/)/
  ],
  [
    'incident-journey',
    /incidents?|issues|issue-|alert-router|notification|uptime|monitoring/,
    ['incident-journey.test.ts'],
    /^apps\/cli\/helper-lambdas\/uptimeProber\//
  ],
  [
    'git-deploy',
    /git-deploy|runners?|remote-deploy|workflow-job|git-credentials|github|gitlab|bitbucket|webhook/,
    ['git-deploy-journey.test.ts']
  ],
  [
    'insights',
    /insights|security|costs?|budgets?|pricing|guardrail|observability|browser-(access|capabilities)/,
    ['insights-environment.test.ts', 'insights-runtime.test.ts'],
    /^packages\/pricing\/|^apps\/cli\/src\/(aws\/observability|init\/pricing|commands\/budget)/
  ],
  ['billing', /billing|paddle|payments?|attribute-costs/],
  ['runner', /runners?|remote-deploy|workflow-job|git-credentials/],
  ['gitlab', /gitlab/],
  ['security', /security/],
  ['issues', /issues|issue-/],
  [
    'incidents',
    /incidents?|alert-router|notification|uptime|monitoring/,
    ['incidents-database.test.ts', 'incident-assessment-database.test.ts']
  ],
  [
    'incident-agent',
    /incident-agent|incident-fix|claude-subscription/,
    ['incident-agent-database.test.ts', 'incident-agent-runtime.test.ts']
  ],
  ['sign-up', /sign-up|sign_up|signup|create-user-post-sign-up|personal-organization/]
];
const modulePath = (path: string) =>
  path
    .replaceAll('\\', '/')
    .replace(/\.[cm]?[jt]sx?$/, '')
    .replace(/\/index$/, '');

const readDatabaseSuiteDependencies = (root: string) => {
  const dependencies = new Map<string, Set<string>>();
  for (const [flag, , files = [`${flag}-database.test.ts`]] of databaseSuites) {
    for (const file of files) {
      const suitePath = resolve(root, 'apps/console/api/scripts', file);
      let source: string;
      try {
        source = readFileSync(suitePath, 'utf8');
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue;
        throw error;
      }
      const imports = dependencies.get(flag) ?? new Set<string>();
      imports.add(modulePath(relative(root, suitePath)));
      // Static, side-effect and dynamic relative imports; never execute private source.
      for (const match of source.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)['"](\.[^'"]+)['"]/g)) {
        imports.add(modulePath(relative(root, resolve(dirname(suitePath), match[1]!))));
      }
      dependencies.set(flag, imports);
    }
  }
  return dependencies;
};
const isDatabaseSharedPath = (path: string) =>
  /^apps\/console\/api\/(prisma\/|package\.json$|scripts\/(run-db-integration|incident-agent-fixtures|console-tenant-fixtures)|src\/(api\/|(?:router|console-router|middlewares|http-server|config|runtime-parameters)(?:[./-])|services\/prisma|model-helpers\/|raw-sql-queries\/))/.test(
    path
  ) || path.startsWith('packages/console-api/');

const databaseRules: Rule[] = databaseSuites.map(([flag, feature, , publicFeature]) => ({
  id: `console-database-${flag}`,
  proves: `Real ${flag} services and persistence through the isolated PostgreSQL feature suite.`,
  commands: [`pnpm --filter @stacktape/console-api-app test:db --${flag}`],
  matches: (path, dependencies) =>
    isDatabaseSharedPath(path) ||
    (path.startsWith('apps/console/api/') &&
      (feature.test(path) ||
        // Without the private suite source, choose the lane rather than miss its dependencies.
        (dependencies.get(flag)?.has(modulePath(path)) ?? true))) ||
    (publicFeature?.test(path) ?? false)
}));

const packagingSuites: [id: string, scripts: string[], feature: RegExp][] = [
  ['packaging-images', ['test:docker-smoke', 'test:es-image-deps-e2e'], /image|docker|railpack|js-bundle-image/],
  [
    'packaging-lambdas',
    ['test:node-lambda-e2e', 'test:lambda-source-map-e2e', 'test:split-assets-e2e', 'test:directory-inventory-e2e'],
    /lambda|bundlers|split|artifact|source-map|directory-inventory/
  ],
  ['packaging-web', ['test:web-framework-e2e'], /web|hosting/]
];
const packagingRules: Rule[] = packagingSuites.map(([id, scripts, feature]) => ({
  id,
  proves: 'Built artifacts execute in their target runtimes.',
  commands: scripts.map((script) => `pnpm --filter @stacktape/packaging run ${script}`),
  matches: (path: string) =>
    (path.startsWith('packages/packaging/') &&
      (feature.test(path) || /\/(package\.json|src\/(fs|es|runtime-contracts)|scripts\/e2e-helpers)/.test(path))) ||
    /^apps\/cli\/src\/(packaging|domain\/packaging)/.test(path)
}));

const RULES: Rule[] = [
  {
    id: 'agent-instructions',
    proves: 'Agent guidance stays synchronized and repository prose is formatted.',
    commands: ['pnpm check:instructions', 'pnpm fmt:check'],
    matches: (path) =>
      path === 'AGENTS.md' || path.endsWith('/AGENTS.md') || path.startsWith('.agents/') || path === 'docs/testing.md'
  },
  {
    id: 'workspace-tools',
    proves: 'Workspace orchestration helpers behave as tested and remain type-safe.',
    commands: ['pnpm test:tools', 'pnpm typecheck:tools'],
    matches: (path) => path.startsWith('scripts/workspace/') || path === 'package.json'
  },
  {
    id: 'cli',
    proves: 'The current CLI source and its process entrypoints preserve command behavior.',
    commands: [
      'pnpm --filter @stacktape/cli test:src',
      'pnpm --filter @stacktape/cli test:cli-smoke',
      'pnpm --filter @stacktape/cli typecheck'
    ],
    matches: (path) => path.startsWith('apps/cli/') && !path.includes('/starter-projects/')
  },
  {
    id: 'naming',
    proves: 'Stable resource names, logical IDs, hashes and their consumers preserve compatibility.',
    commands: ['pnpm --filter @stacktape/naming test', 'pnpm --filter @stacktape/naming typecheck'],
    matches: (path) => path.startsWith('packages/naming/')
  },
  {
    id: 'synthesis',
    proves: 'Config resolution and synthesized infrastructure preserve semantic contracts.',
    commands: ['pnpm --filter @stacktape/cli test:characterization', 'pnpm --filter @stacktape/cli generate:check'],
    matches: (path) =>
      hasPart(path, /^apps\/cli\/(src\/(domain|config|resource-reference)|tests\/characterization)/) ||
      hasPart(path, /^packages\/(cloudformation|config|config-authoring|naming)\//)
  },
  {
    id: 'data-safety',
    proves: 'Equivalent v3 and v4 configurations preserve stateful resources through the real change plan.',
    commands: ['pnpm --filter @stacktape/cli run test:data-safety'],
    matches: (path) =>
      /^apps\/cli\/(src\/(domain\/(template-manager|calculated-stack-overview-manager|deployment-change-plan)|utils\/stack-info-map-diff)|tests\/data-safety)/.test(
        path
      ) || path.startsWith('packages/naming/')
  },
  {
    id: 'config-loading',
    proves: 'YAML, TypeScript and user directives resolve through the production loader without leaking secrets.',
    commands: ['pnpm --filter @stacktape/cli run test:config-loading'],
    matches: (path) =>
      /^apps\/cli\/(src\/(domain\/config-manager|utils\/(file-loaders|python-bridge))|tests\/config-loading)/.test(
        path
      ) || /^packages\/(config|config-authoring)\//.test(path)
  },
  {
    id: 'synthesis-families',
    proves: 'Resource families synthesize connected templates accepted by cfn-lint.',
    commands: [
      'pnpm --filter @stacktape/cli run test:synthesis-families',
      'pnpm --filter @stacktape/cli run test:synthesis-families:cfn-lint'
    ],
    matches: (path) =>
      /^apps\/cli\/(src\/domain\/(template-manager|calculated-stack-overview-manager)|tests\/synthesis-families)/.test(
        path
      ) || path.startsWith('packages/cloudformation/')
  },
  {
    id: 'cli-stack-operations',
    proves: 'The CLI process refuses unsafe operations and performs confirmed deletion.',
    commands: ['pnpm --filter @stacktape/cli run test:cli-process'],
    matches: (path) =>
      /^apps\/cli\/(src\/(commands\/(delete|rollback|diff)|domain\/(cloudformation-stack-manager|deployment-change-plan))|tests\/cli-process)/.test(
        path
      )
  },
  {
    id: 'cli-operations',
    proves: 'CLI output, diagnostics, sessions and operational commands work through real processes.',
    commands: ['pnpm --filter @stacktape/cli run test:operations'],
    matches: (path) =>
      /^apps\/cli\/(scripts\/operations\/|src\/(commands\/|aws\/|app\/tui-manager\/|utils\/(bastion|session|tunnel|script)))/.test(
        path
      )
  },
  {
    id: 'cli-operations-database',
    proves: 'CLI query commands return real database results and enforce read-only access.',
    commands: ['pnpm --filter @stacktape/cli run test:operations:db'],
    matches: (path) =>
      /^apps\/cli\/(scripts\/operations\/(queries|fixtures)|src\/(commands\/query|domain\/debug-services\/db-client))/.test(
        path
      )
  },
  {
    id: 'cli-packaged-lambda',
    proves: 'CLI-packaged Node functions, layers, source maps and cache identities survive runtime invocation.',
    commands: ['pnpm --filter @stacktape/cli run test:node-lambda'],
    matches: (path) =>
      /^packages\/packaging\/src\/(bundlers\/es|split-bundler|artifact)/.test(path) ||
      /^apps\/cli\/(scripts\/packaging-archives\/(node-lambda|lambda-runtime|acceptance-helpers)|src\/(domain\/packaging|config\/random))/.test(
        path
      )
  },
  {
    id: 'cli-packaged-web',
    proves: 'CLI-packaged SSR starters serve dynamic routes, cookies and assets in the Lambda runtime.',
    commands: ['pnpm --filter @stacktape/cli run test:ssr-web'],
    matches: (path) =>
      path.startsWith('packages/packaging/src/web/') ||
      /^apps\/cli\/(scripts\/packaging-archives\/(ssr-web|lambda-runtime|acceptance-helpers)|starter-projects\/|src\/commands\/package)/.test(
        path
      )
  },
  {
    id: 'helper-lambda-runtime',
    proves: 'Built CDN helper archives handle real CloudFront events in their Lambda runtime.',
    commands: ['pnpm --filter @stacktape/cli run test:helper-lambda-runtime'],
    matches: (path) =>
      /^apps\/cli\/(helper-lambdas\/|scripts\/(packaging-archives\/(helper-lambda|lambda-runtime|acceptance-helpers)|build-helper-lambdas))/.test(
        path
      )
  },
  {
    id: 'cli-runtime-acceptances',
    proves: 'CLI-packaged functions, SSR starters and helper archives execute in their Lambda runtimes.',
    commands: ['pnpm --filter @stacktape/cli run test:runtime-acceptances'],
    matches: (path) => /^apps\/cli\/scripts\/qualification\/run-project-qualification\.ts$/.test(path)
  },
  {
    id: 'starter-qualification',
    proves: 'Materialized starters package through the current source CLI.',
    commands: ['pnpm --filter @stacktape/cli run qualify:starters'],
    matches: (path) =>
      /^apps\/cli\/(starter-projects\/|starter-projects-metadata|scripts\/(starter-projects|qualification)|src\/(init\/|commands\/init\/|domain\/packaging))/.test(
        path
      ) || path.startsWith('packages/packaging/')
  },
  {
    id: 'init-e2e',
    proves: 'Terminal init writes a configuration that synthesizes and packages into a runnable artifact.',
    commands: ['pnpm --filter @stacktape/cli test:init:e2e'],
    matches: (path) =>
      /^apps\/cli\/(src\/(init\/|commands\/init\/)|tests\/init-e2e\/|scripts\/(init-e2e\/|test-init-e2e|init-.*project-corpus|validate-synthetic-project-corpus))/.test(
        path
      ) || path.startsWith('packages/config-inference/')
  },
  {
    id: 'local-dev-live',
    proves: 'Owned live dev sessions rebuild and leave no owned processes, containers or ports.',
    commands: ['pnpm test:aws --aws-scenario=dev-mode-local-loop'],
    matches: (path) =>
      /^apps\/cli\/(src\/(commands\/(dev|dev-stop)\/|domain\/debug-services\/)|scripts\/real-aws\/dev-mode-canary|_test-stacks\/dev-mode\/)/.test(
        path
      )
  },
  {
    id: 'mcp-executable',
    proves: 'The shipped MCP executable serves docs and dispatches cancellable, redacted CLI children.',
    commands: ['pnpm --filter @stacktape/cli run test:mcp-executable'],
    matches: (path) => /^apps\/cli\/(src\/(mcp\/|commands\/mcp)|scripts\/test-mcp|@generated\/llm-docs\/)/.test(path)
  },
  {
    id: 'vscode-host',
    proves: 'VS Code activates the installed extension and shows real schema diagnostics and CodeLens.',
    commands: ['pnpm --filter vscode-stacktape run test:host'],
    matches: (path) => path.startsWith('apps/vscode-extension/')
  },
  ...packagingRules,
  {
    id: 'packaging-archives',
    proves: 'Lambda archives, asset replacement, Docker preparation and fresh source installation work.',
    commands: ['test:lambda-archives', 'test:asset-replacer', 'test:docker-preparation', 'test:fresh-install'].map(
      (script) => `pnpm --filter @stacktape/cli run ${script}`
    ),
    matches: (path) =>
      path.startsWith('packages/packaging/src/artifact/') ||
      /^apps\/cli\/(src\/(packaging|domain\/packaging|utils\/zip)|scripts\/packaging-archives|helper-lambdas\/stacktapeServiceLambda\/custom-resources\/resolvers\/asset-replacer)/.test(
        path
      )
  },
  {
    id: 'external-tools',
    proves: 'Pinned downloads, checksums, extraction and offline reuse work through real child processes.',
    commands: ['pnpm --filter @stacktape/cli run test:external-tools'],
    matches: (path) =>
      /^apps\/cli\/(src\/(utils|config)\/external-tools|scripts\/(external-tools-e2e|pin-external-tools))/.test(path) ||
      path.endsWith('/railpack-command.ts')
  },
  {
    id: 'release-installation',
    proves: 'The actual release package and binary can be installed and invoked.',
    commands: [
      'pnpm --filter @stacktape/cli run test:release-artifact',
      'pnpm --filter @stacktape/cli run test:release-security'
    ],
    matches: (path) =>
      /^apps\/cli\/(package\.json|scripts\/(release\/|install-scripts\/|build-|verify-release-artifact|verify-npm-declarations|platform-runtime))/.test(
        path
      )
  },
  {
    id: 'artifact-upload',
    proves: 'Layer upload and retention work against the SDK wire protocol and MiniStack.',
    commands: [
      'pnpm --filter @stacktape/cli run test:layer-upload',
      'pnpm --filter @stacktape/cli run test:layer-upload:ministack'
    ],
    matches: (path) =>
      /^apps\/cli\/(src\/domain\/deployment-artifact-manager\/|scripts\/packaging-archives\/(layer-upload|lambda-runtime|acceptance-helpers))/.test(
        path
      ) || path.startsWith('packages/packaging/src/split-bundler/')
  },
  {
    id: 'project-qualification',
    proves: 'The reviewed project corpus imports, packages and runs through the source CLI.',
    commands: [
      'pnpm qualify:projects -- --preset=release --lanes=import,package --allow-host-project-code',
      'pnpm qualify:projects -- --lanes=runtime'
    ],
    matches: (path) =>
      /^apps\/cli\/(src\/(init|packaging|domain\/packaging|domain\/config-manager)|scripts\/qualification|starter-projects-metadata)/.test(
        path
      ) || /^packages\/(config-inference|packaging)\//.test(path)
  },
  {
    id: 'init-corpus',
    proves: 'Real and synthetic importer corpus contracts and native fixture builds pass.',
    commands: [
      'test:init:real-project-corpus',
      'test:init:synthetic-project-corpus',
      'test:init:synthetic-project-corpus:native'
    ].map((script) => `pnpm --filter @stacktape/cli run ${script}`),
    matches: (path) =>
      /^apps\/cli\/(src\/init\/|scripts\/(init-.*project-corpus|validate-synthetic-project-corpus))/.test(path) ||
      path.startsWith('packages/config-inference/')
  },
  {
    id: 'console-api',
    proves: 'Console API code and the real Fastify/tRPC adapter preserve their contracts.',
    commands: ['pnpm --filter @stacktape/console-api-app test', 'pnpm --filter @stacktape/console-api-app typecheck'],
    matches: (path) => path.startsWith('apps/console/api/')
  },
  {
    id: 'console-database',
    proves:
      'Migration/adoption coverage on isolated PostgreSQL. Add real-query tests for changed constraints, transactions, or queries; this command does not cover them automatically.',
    commands: ['pnpm --filter @stacktape/console-api-app test:db'],
    matches: (path) =>
      path.startsWith('apps/console/api/prisma/') ||
      /^apps\/console\/api\/scripts\/(migrate-db|run-db-integration)/.test(path) ||
      hasPart(path, /^apps\/console\/api\/src\/(raw-sql-queries|services\/prisma|model-helpers)/)
  },
  ...databaseRules,
  {
    id: 'console-runner-runtime',
    proves: 'Generated runner jobs execute in Docker and preserve incremental Buildx cache between jobs.',
    commands: [
      'pnpm --filter @stacktape/console-api-app test:runner:scripts',
      'pnpm --filter @stacktape/console-api-app test:runner:cache'
    ],
    matches: (path) =>
      /^apps\/console\/api\/(scripts\/runner-|infrastructure\/ec2-runner-image\/|src\/services\/(remote-deploy\/ec2\/|incident-agent-runner-job))/.test(
        path
      )
  },
  {
    id: 'shared-ui-browser',
    proves:
      'The shared Dialog and Button preserve keyboard, focus, dismissal and disabled behavior in an isolated synthetic browser app.',
    commands: ['pnpm --filter @stacktape/ui-react test:e2e'],
    matches: (path) => path.startsWith('packages/ui-react/')
  },
  {
    id: 'console-ui',
    proves: 'Console UI helpers compile and the production bundle is valid.',
    commands: [
      'pnpm --filter @stacktape/console-ui test',
      'pnpm --filter @stacktape/console-ui typecheck',
      'pnpm exec turbo run build --filter=@stacktape/console-ui'
    ],
    matches: (path) => path.startsWith('apps/console/ui/') || path.startsWith('packages/ui-react/')
  },
  {
    id: 'bitbucket-forge-browser',
    proves:
      'The packaged Forge UI loads beneath a nested resource URL and handles pairing, retry and existing connections. Live Forge installation and pairing remain separate acceptance steps.',
    commands: [
      'pnpm --filter @stacktape/bitbucket-forge-app test:e2e',
      'pnpm --filter @stacktape/bitbucket-forge-app typecheck'
    ],
    matches: (path) => path.startsWith('apps/console/bitbucket-forge/')
  },
  {
    id: 'console-browser-local-api',
    proves:
      'Authenticated projects navigation through the local API. Extend the browser scenario to cover the changed customer flow and its durable result.',
    commands: ['pnpm dev:console', 'pnpm --filter @stacktape/console-ui test:e2e'],
    matches: (path) =>
      path.startsWith('apps/console/api/src/') || path.startsWith('packages/console-api/') || isConsoleStartupPath(path)
  },
  {
    id: 'console-browser-isolated',
    proves:
      'Issue-state persistence and tenant denial through the real UI, local HTTP router and disposable PostgreSQL.',
    commands: ['pnpm --filter @stacktape/console-api-app test:db --isolated-browser'],
    matches: (path) =>
      isDatabaseSharedPath(path) ||
      path.startsWith('apps/console/api/src/issues/') ||
      path.startsWith('apps/console/api/src/services/issue-') ||
      path.startsWith('packages/ui-react/') ||
      path === 'apps/console/ui/e2e/isolated-console.test.ts' ||
      path === 'apps/console/api/scripts/incident-agent-fixtures.ts' ||
      path === 'apps/console/api/scripts/run-db-integration.ts' ||
      path.startsWith('apps/console/ui/src/pages/IssuesPage/')
  },
  {
    id: 'console-browser-dev-api',
    proves:
      'Authenticated projects navigation against the dev API. Extend the browser scenario to cover the changed customer flow.',
    commands: ['pnpm test:console:browser:dev-api'],
    matches: (path) =>
      path.startsWith('apps/console/ui/src/') ||
      (path.startsWith('apps/console/ui/e2e/') && path !== 'apps/console/ui/e2e/isolated-console.test.ts') ||
      /^apps\/console\/ui\/playwright.*\.ts$/.test(path) ||
      path.startsWith('packages/ui-react/')
  },
  {
    id: 'console-deployed-dev',
    proves:
      'Deployment makes changed dev code reachable; it is NOT a behavior test. Then send a real event and verify the resulting deployment, job, or recorded failure.',
    commands: ['pnpm deploy:console:dev'],
    matches: (path) =>
      hasPart(
        path,
        /^apps\/console\/api\/(stacktape\.ts|infrastructure|src\/(lambdas|integrations|services\/(remote-deploy|git|github|gitlab|bitbucket)))/
      )
  },
  {
    id: 'live-aws',
    proves: 'AWS interprets the changed infrastructure/runtime contract and owned resources are removed afterward.',
    commands: ['pnpm test:aws --aws-scenario=<explicit-scenario>'],
    matches: (path) =>
      hasPart(path, /^apps\/console\/api\/(stacktape\.ts|infrastructure)/) ||
      hasPart(path, /^apps\/cli\/(src\/aws|scripts\/real-aws|helper-lambdas)/) ||
      hasPart(path, /^packages\/(cloudformation|packaging)\//)
  },
  {
    id: 'website',
    proves: 'The public website type-checks and produces a deployable static build.',
    commands: ['pnpm --filter @stacktape/website typecheck', 'pnpm --filter @stacktape/website build'],
    matches: (path) => path.startsWith('apps/website/')
  },
  {
    id: 'docs',
    proves: 'Documentation source compiles and renders through its application build.',
    commands: [
      'pnpm --filter @stacktape/docs typecheck',
      'pnpm --filter @stacktape/docs build',
      'pnpm --filter @stacktape/docs run test:build-contracts'
    ],
    matches: (path) => path.startsWith('apps/docs/')
  }
];

export const parseTestPlanArgs = (args: string[]): TestPlanOptions => {
  const options: TestPlanOptions = { json: false };
  for (const argument of args) {
    // pnpm keeps the conventional separator when forwarding arguments to a package script.
    if (argument === '--') {
      continue;
    } else if (argument === '--json') {
      options.json = true;
    } else if (argument.startsWith('--since=')) {
      options.since = argument.slice('--since='.length);
      if (!options.since) throw new Error('--since requires a Git ref.');
    } else if (argument.startsWith('--paths=')) {
      options.paths = argument
        .slice('--paths='.length)
        .split(',')
        .map((path) => path.trim().replace(/^\.\//, ''))
        .filter(Boolean);
      if (!options.paths.length) throw new Error('--paths requires at least one repository-relative path.');
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (options.paths && options.since) throw new Error('Use either --paths or --since, not both.');
  return options;
};

const runGit = (args: string[], cwd = workspaceRoot): Promise<string> =>
  new Promise<string>((resolveRun, reject) => {
    const child = spawn('git', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolveRun(stdout);
      else reject(new Error(stderr.trim() || `git ${args.join(' ')} failed.`));
    });
  });

export const parsePorcelainStatusPaths = (output: string): string[] => {
  const entries = output.split('\0');
  const paths: string[] = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (!entry) continue;
    paths.push(entry.slice(3));
    // In porcelain -z a rename/copy is destination NUL source. Both boundaries may need tests.
    const source = entries[index + 1];
    if (/[RC]/.test(entry.slice(0, 2)) && source) {
      paths.push(source);
      index++;
    }
  }
  return paths;
};

const collectStatusPaths = async (cwd: string, prefix = '') => {
  const output = await runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], cwd);
  return parsePorcelainStatusPaths(output).map((path) => `${prefix}${path}`);
};

export const collectChangedPaths = async (options: TestPlanOptions, root = workspaceRoot): Promise<string[]> => {
  if (options.paths) return [...new Set(options.paths)].toSorted();
  const baseline = options.since ? (await runGit(['merge-base', options.since, 'HEAD'], root)).trim() : 'HEAD';
  const paths = options.since
    ? (await runGit(['diff', '--name-only', '--no-renames', '-z', baseline, 'HEAD', '--'], root))
        .split('\0')
        .filter(Boolean)
    : [];
  paths.push(...(await collectStatusPaths(root)));

  const consoleDirectory = resolve(root, 'apps', 'console');
  try {
    await access(resolve(consoleDirectory, '.git'));
  } catch {
    // Keep a changed gitlink in public-only workspaces so the integrated gate is still selected.
    return [...new Set(paths)].toSorted();
  }
  paths.push(...(await collectStatusPaths(consoleDirectory, 'apps/console/')));
  if (paths.includes('apps/console')) {
    const entry = await runGit(['ls-tree', baseline, '--', 'apps/console'], root);
    const previousCommit = /^160000 commit ([a-f0-9]+)\t/.exec(entry)?.[1];
    try {
      const changed = previousCommit
        ? await runGit(['diff', '--name-only', '--no-renames', '-z', previousCommit, 'HEAD', '--'], consoleDirectory)
        : await runGit(['ls-files', '-z'], consoleDirectory);
      paths.push(
        ...changed
          .split('\0')
          .filter(Boolean)
          .map((path) => `apps/console/${path}`)
      );
    } catch {
      // A shallow checkout may lack the previous private commit. The gitlink still requires integrated checks.
    }
  }
  return [...new Set(paths)].toSorted();
};

export const createTestPlan = (paths: string[], root = workspaceRoot): TestLane[] => {
  const includesConsole = paths.some(
    (path) => path === 'apps/console' || path.startsWith('apps/console/') || isConsoleStartupPath(path)
  );
  const suiteDependencies = includesConsole ? readDatabaseSuiteDependencies(root) : new Map<string, Set<string>>();
  let lanes = RULES.filter((rule) => paths.some((path) => rule.matches(path, suiteDependencies))).map(
    ({ matches: _, ...lane }) => lane
  );
  if (lanes.some(({ id }) => id === 'console-browser-local-api')) {
    lanes = lanes.filter(({ id }) => id !== 'console-browser-dev-api');
  }
  lanes.push({
    id: includesConsole ? 'integrated-gate' : 'public-gate',
    proves: 'Repository-wide architecture, generation, lint, type, test, build, and artifact contracts pass.',
    commands: [includesConsole ? 'pnpm check:integrated' : 'pnpm check:public']
  });
  return lanes;
};

const main = async () => {
  const options = parseTestPlanArgs(process.argv.slice(2));
  const paths = await collectChangedPaths(options);
  const lanes = createTestPlan(paths);
  if (options.json) {
    console.info(JSON.stringify({ lanes, paths }, null, 2));
    return;
  }
  console.info(paths.length ? `Changed paths (${paths.length}):` : 'No changed paths found.');
  for (const path of paths) console.info(`  ${path}`);
  console.info('\nRecommended evidence:');
  for (const lane of lanes) {
    console.info(`\n${lane.id}: ${lane.proves}`);
    for (const command of lane.commands) console.info(`  ${command}`);
  }
  console.info(
    '\nTreat this as a floor. Add any runtime, provider, cost, security, or migration risk path matching cannot see.'
  );
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
