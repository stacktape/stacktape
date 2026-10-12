import { lanes as registeredLanes, slices, matchesSlicePath, laneIdsForSelection, type Lane } from './test-registry.ts';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export type TestPlanOptions = {
  json: boolean;
  paths?: string[];
  since?: string;
};

export type TestLane = Lane & {
  commands: string[];
  slices: string[];
  available: boolean;
};

type Rule = {
  id: string;
  lanes: string[];
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
  lanes: laneIdsForSelection(`console-database-${flag}`),
  matches: (path, dependencies) =>
    isDatabaseSharedPath(path) ||
    (path.startsWith('apps/console/api/') &&
      (feature.test(path) ||
        // Without the private suite source, choose the lane rather than miss its dependencies.
        (dependencies.get(flag)?.has(modulePath(path)) ?? true))) ||
    (publicFeature?.test(path) ?? false)
}));

const packagingSuites: [id: string, feature: RegExp][] = [
  ['packaging-images', /image|docker|railpack|js-bundle-image/],
  ['packaging-lambdas', /lambda|bundlers|split|artifact|source-map|directory-inventory/],
  ['packaging-web', /web|hosting/]
];
const packagingRules: Rule[] = packagingSuites.map(([id, feature]) => ({
  id,
  lanes: laneIdsForSelection(id),
  matches: (path: string) =>
    (path.startsWith('packages/packaging/') &&
      (feature.test(path) || /\/(package\.json|src\/(fs|es|runtime-contracts)|scripts\/e2e-helpers)/.test(path))) ||
    /^apps\/cli\/src\/(packaging|domain\/packaging)/.test(path)
}));

// Console browser specs that no general lane runs. A changed spec selects the package script that runs it; each script
// checks the shared-dev reservation, and `pnpm dev:console` marks the specs that need full local mode.
const consoleBrowserSpecs = [
  'admin',
  'project-access',
  'issues',
  'security',
  'runners',
  'runners-live',
  'git-provider-writes-live',
  'incident-assessment-live',
  'incident-run-live'
];
const browserSpecPath = (spec: string) => `apps/console/ui/e2e/${spec}.spec.ts`;
const consoleBrowserSpecRules: Rule[] = consoleBrowserSpecs.map((spec) => ({
  id: `console-browser-${spec}`,
  lanes: laneIdsForSelection(`console-browser-${spec}`),
  matches: (path) => path === browserSpecPath(spec)
}));
const isOfflineBrowserPath = (path: string) =>
  /^apps\/console\/ui\/e2e\/(console-smoke|auth-pages|git-connections|region-select|resolved-config|incident-investigate|ui-review-controls)(-ui)?(\.spec\.ts|-fixture\.tsx|\.html)$/.test(
    path
  );

const RULES: Rule[] = [
  {
    id: 'console-browser-privacy',
    lanes: laneIdsForSelection('console-browser-privacy'),
    matches: (path) =>
      /^apps\/console\/ui\/(scripts\/(qualify-browser-privacy|browser-target|browser-sessions|e2e-credentials)|e2e\/(privacy-probe\.spec|fixtures)|playwright)/.test(
        path
      )
  },
  {
    id: 'console-browser-sessions',
    lanes: laneIdsForSelection('console-browser-sessions'),
    matches: (path) =>
      /^apps\/console\/ui\/(scripts\/(browser-sessions|e2e-credentials|browser-target)|e2e\/fixtures|playwright)/.test(
        path
      )
  },
  {
    id: 'agent-instructions',
    lanes: laneIdsForSelection('agent-instructions'),
    matches: (path) =>
      path === 'AGENTS.md' || path.endsWith('/AGENTS.md') || path.startsWith('.agents/') || path === 'docs/testing.md'
  },
  {
    id: 'workspace-tools',
    lanes: laneIdsForSelection('workspace-tools'),
    matches: (path) => path.startsWith('scripts/workspace/') || path === 'package.json'
  },
  {
    id: 'cli',
    lanes: laneIdsForSelection('cli'),
    matches: (path) => path.startsWith('apps/cli/') && !path.includes('/starter-projects/')
  },
  {
    id: 'naming',
    lanes: laneIdsForSelection('naming'),
    matches: (path) => path.startsWith('packages/naming/')
  },
  {
    id: 'synthesis',
    lanes: laneIdsForSelection('synthesis'),
    matches: (path) =>
      hasPart(path, /^apps\/cli\/(src\/(domain|config|resource-reference)|tests\/characterization)/) ||
      hasPart(path, /^packages\/(cloudformation|config|config-authoring|naming)\//)
  },
  {
    id: 'data-safety',
    lanes: laneIdsForSelection('data-safety'),
    matches: (path) =>
      /^apps\/cli\/(src\/(domain\/(template-manager|calculated-stack-overview-manager|deployment-change-plan)|utils\/stack-info-map-diff)|tests\/data-safety)/.test(
        path
      ) || path.startsWith('packages/naming/')
  },
  {
    id: 'config-loading',
    lanes: laneIdsForSelection('config-loading'),
    matches: (path) =>
      /^apps\/cli\/(src\/(domain\/config-manager|utils\/(file-loaders|python-bridge))|tests\/config-loading)/.test(
        path
      ) || /^packages\/(config|config-authoring)\//.test(path)
  },
  {
    id: 'synthesis-families',
    lanes: laneIdsForSelection('synthesis-families'),
    matches: (path) =>
      /^apps\/cli\/(src\/domain\/(template-manager|calculated-stack-overview-manager)|tests\/synthesis-families)/.test(
        path
      ) || path.startsWith('packages/cloudformation/')
  },
  {
    id: 'cli-stack-operations',
    lanes: laneIdsForSelection('cli-stack-operations'),
    matches: (path) =>
      /^apps\/cli\/(src\/(commands\/(delete|rollback|diff)|domain\/(cloudformation-stack-manager|deployment-change-plan))|tests\/cli-process)/.test(
        path
      )
  },
  {
    id: 'cli-operations',
    lanes: laneIdsForSelection('cli-operations'),
    matches: (path) =>
      /^apps\/cli\/(scripts\/operations\/|src\/(commands\/|aws\/|app\/tui-manager\/|utils\/(bastion|session|tunnel|script)))/.test(
        path
      )
  },
  {
    id: 'cli-operations-database',
    lanes: laneIdsForSelection('cli-operations-database'),
    matches: (path) =>
      /^apps\/cli\/(scripts\/operations\/(queries|fixtures)|src\/(commands\/query|domain\/debug-services\/db-client))/.test(
        path
      )
  },
  {
    id: 'cli-packaged-lambda',
    lanes: laneIdsForSelection('cli-packaged-lambda'),
    matches: (path) =>
      /^packages\/packaging\/src\/(bundlers\/es|split-bundler|artifact)/.test(path) ||
      /^apps\/cli\/(scripts\/packaging-archives\/(node-lambda|lambda-runtime|acceptance-helpers)|src\/(domain\/packaging|config\/random))/.test(
        path
      )
  },
  {
    id: 'cli-packaged-web',
    lanes: laneIdsForSelection('cli-packaged-web'),
    matches: (path) =>
      path.startsWith('packages/packaging/src/web/') ||
      /^apps\/cli\/(scripts\/packaging-archives\/(ssr-web|lambda-runtime|acceptance-helpers)|starter-projects\/|src\/commands\/package)/.test(
        path
      )
  },
  {
    id: 'helper-lambda-runtime',
    lanes: laneIdsForSelection('helper-lambda-runtime'),
    matches: (path) =>
      /^apps\/cli\/(helper-lambdas\/|scripts\/(packaging-archives\/(helper-lambda|lambda-runtime|acceptance-helpers)|build-helper-lambdas))/.test(
        path
      )
  },
  {
    id: 'cli-runtime-acceptances',
    lanes: laneIdsForSelection('cli-runtime-acceptances'),
    matches: (path) => /^apps\/cli\/scripts\/qualification\/run-project-qualification\.ts$/.test(path)
  },
  {
    id: 'starter-qualification',
    lanes: laneIdsForSelection('starter-qualification'),
    matches: (path) =>
      /^apps\/cli\/(starter-projects\/|starter-projects-metadata|scripts\/(starter-projects|qualification)|src\/(init\/|commands\/init\/|domain\/packaging))/.test(
        path
      ) || path.startsWith('packages/packaging/')
  },
  {
    id: 'init-e2e',
    lanes: laneIdsForSelection('init-e2e'),
    matches: (path) =>
      /^apps\/cli\/(src\/(init\/|commands\/init\/)|tests\/init-e2e\/|scripts\/(init-e2e\/|test-init-e2e|init-.*project-corpus|validate-synthetic-project-corpus))/.test(
        path
      ) || path.startsWith('packages/config-inference/')
  },
  {
    id: 'local-dev-live',
    lanes: laneIdsForSelection('local-dev-live'),
    matches: (path) =>
      /^apps\/cli\/(src\/(commands\/(dev|dev-stop)\/|domain\/debug-services\/)|scripts\/real-aws\/dev-mode-canary|_test-stacks\/dev-mode\/)/.test(
        path
      )
  },
  {
    id: 'mcp-executable',
    lanes: laneIdsForSelection('mcp-executable'),
    matches: (path) => /^apps\/cli\/(src\/(mcp\/|commands\/mcp)|scripts\/test-mcp|@generated\/llm-docs\/)/.test(path)
  },
  {
    id: 'vscode-host',
    lanes: laneIdsForSelection('vscode-host'),
    matches: (path) => path.startsWith('apps/vscode-extension/')
  },
  ...packagingRules,
  {
    id: 'packaging-archives',
    lanes: laneIdsForSelection('packaging-archives'),
    matches: (path) =>
      path.startsWith('packages/packaging/src/artifact/') ||
      /^apps\/cli\/(src\/(packaging|domain\/packaging|utils\/zip)|scripts\/packaging-archives|helper-lambdas\/stacktapeServiceLambda\/custom-resources\/resolvers\/asset-replacer)/.test(
        path
      )
  },
  {
    id: 'external-tools',
    lanes: laneIdsForSelection('external-tools'),
    matches: (path) =>
      /^apps\/cli\/(src\/(utils|config)\/external-tools|scripts\/(external-tools-e2e|pin-external-tools))/.test(path) ||
      path.endsWith('/railpack-command.ts')
  },
  {
    id: 'release-installation',
    lanes: laneIdsForSelection('release-installation'),
    matches: (path) =>
      /^apps\/cli\/(package\.json|scripts\/(release\/|install-scripts\/|build-|verify-release-artifact|verify-npm-declarations|platform-runtime))/.test(
        path
      )
  },
  {
    id: 'artifact-upload',
    lanes: laneIdsForSelection('artifact-upload'),
    matches: (path) =>
      /^apps\/cli\/(src\/domain\/deployment-artifact-manager\/|scripts\/packaging-archives\/(layer-upload|lambda-runtime|acceptance-helpers))/.test(
        path
      ) || path.startsWith('packages/packaging/src/split-bundler/')
  },
  {
    id: 'project-qualification',
    lanes: laneIdsForSelection('project-qualification'),
    matches: (path) =>
      /^apps\/cli\/(src\/(init|packaging|domain\/packaging|domain\/config-manager)|scripts\/qualification|starter-projects-metadata)/.test(
        path
      ) || /^packages\/(config-inference|packaging)\//.test(path)
  },
  {
    id: 'init-corpus',
    lanes: laneIdsForSelection('init-corpus'),
    matches: (path) =>
      /^apps\/cli\/(src\/init\/|scripts\/(init-.*project-corpus|validate-synthetic-project-corpus))/.test(path) ||
      path.startsWith('packages/config-inference/')
  },
  {
    id: 'console-api',
    lanes: laneIdsForSelection('console-api'),
    matches: (path) => path.startsWith('apps/console/api/')
  },
  {
    id: 'console-database',
    lanes: laneIdsForSelection('console-database'),
    matches: (path) =>
      path.startsWith('apps/console/api/prisma/') ||
      /^apps\/console\/api\/scripts\/(migrate-db|run-db-integration)/.test(path) ||
      hasPart(path, /^apps\/console\/api\/src\/(raw-sql-queries|services\/prisma|model-helpers)/)
  },
  ...databaseRules,
  {
    id: 'console-runner-runtime',
    lanes: laneIdsForSelection('console-runner-runtime'),
    matches: (path) =>
      /^apps\/console\/api\/(scripts\/runner-|infrastructure\/ec2-runner-image\/|src\/services\/(remote-deploy\/ec2\/|incident-agent-runner-job))/.test(
        path
      )
  },
  {
    id: 'shared-ui-browser',
    lanes: laneIdsForSelection('shared-ui-browser'),
    matches: (path) => path.startsWith('packages/ui-react/')
  },
  {
    id: 'console-ui',
    lanes: laneIdsForSelection('console-ui'),
    matches: (path) => path.startsWith('apps/console/ui/') || path.startsWith('packages/ui-react/')
  },
  {
    id: 'bitbucket-forge-browser',
    lanes: laneIdsForSelection('bitbucket-forge-browser'),
    matches: (path) => path.startsWith('apps/console/bitbucket-forge/')
  },
  {
    id: 'console-browser-local-api',
    lanes: laneIdsForSelection('console-browser-local-api'),
    matches: (path) =>
      path.startsWith('apps/console/api/src/') || path.startsWith('packages/console-api/') || isConsoleStartupPath(path)
  },
  {
    id: 'console-browser-isolated',
    lanes: laneIdsForSelection('console-browser-isolated'),
    matches: (path) =>
      isDatabaseSharedPath(path) ||
      path.startsWith('apps/console/api/src/issues/') ||
      path.startsWith('apps/console/api/src/services/issue-') ||
      path.startsWith('packages/ui-react/') ||
      path.startsWith('apps/console/ui/e2e/isolated-') ||
      path === 'apps/console/api/scripts/incident-agent-fixtures.ts' ||
      path === 'apps/console/api/scripts/run-db-integration.ts' ||
      path.startsWith('apps/console/ui/src/pages/IssuesPage/')
  },
  {
    id: 'console-browser-dev-api',
    lanes: laneIdsForSelection('console-browser-dev-api'),
    matches: (path) =>
      path.startsWith('apps/console/ui/src/') ||
      (path.startsWith('apps/console/ui/e2e/') &&
        !path.startsWith('apps/console/ui/e2e/isolated-') &&
        !isOfflineBrowserPath(path) &&
        !consoleBrowserSpecs.some((spec) => path === browserSpecPath(spec))) ||
      (/^apps\/console\/ui\/playwright.*\.ts$/.test(path) && path !== 'apps/console/ui/playwright.offline.config.ts') ||
      path.startsWith('packages/ui-react/')
  },
  ...consoleBrowserSpecRules,
  {
    id: 'console-browser-offline',
    lanes: laneIdsForSelection('console-browser-offline'),
    matches: (path) =>
      isOfflineBrowserPath(path) ||
      path.startsWith('apps/console/ui/src/') ||
      path.startsWith('packages/ui-react/') ||
      /^apps\/console\/ui\/(e2e\/fixtures|playwright\.(offline\.)?config|vite\.config|scripts\/(browser-target|dev-api-url))\.ts$/.test(
        path
      )
  },
  {
    id: 'console-deployed-dev',
    lanes: laneIdsForSelection('console-deployed-dev'),
    matches: (path) =>
      hasPart(
        path,
        /^apps\/console\/api\/(stacktape\.ts|infrastructure|src\/(lambdas|integrations|services\/(remote-deploy|git|github|gitlab|bitbucket)))/
      )
  },
  {
    id: 'live-aws',
    lanes: laneIdsForSelection('live-aws'),
    matches: (path) =>
      hasPart(path, /^apps\/console\/api\/(stacktape\.ts|infrastructure)/) ||
      hasPart(path, /^apps\/cli\/(src\/aws|scripts\/real-aws|helper-lambdas)/) ||
      hasPart(path, /^packages\/(cloudformation|packaging)\//)
  },
  {
    id: 'website',
    lanes: laneIdsForSelection('website'),
    matches: (path) => path.startsWith('apps/website/')
  },
  {
    id: 'docs',
    lanes: laneIdsForSelection('docs'),
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
  const selectedSlices = slices.filter(
    (slice) => slice.status === 'active' && paths.some((path) => matchesSlicePath(slice, path))
  );
  const selected = new Map<string, Set<string>>();
  const changedPaths = new Set(paths);
  const add = (id: string, owners: string[]) => {
    const ids = selected.get(id) ?? new Set<string>();
    for (const owner of owners) ids.add(owner);
    selected.set(id, ids);
  };
  for (const slice of selectedSlices) {
    const changedTests = new Set(slice.tests.filter((path) => changedPaths.has(path)));
    const changedSource = paths.some((path) => !slice.tests.includes(path) && matchesSlicePath(slice, path));
    for (const id of slice.lanes) {
      if (slice.id === 'S71' && (id.startsWith('console-browser') || id.endsWith('-gate'))) continue;
      const lane = registeredLanes.find((candidate) => candidate.id === id)!;
      if (
        changedSource ||
        lane.tests.some((test) => [...changedTests].some((path) => test === path || path.startsWith(`${test}/`)))
      )
        add(id, [slice.id]);
    }
  }
  // Keep the existing path and direct suite-import rules as additional selection edges.
  for (const rule of RULES) {
    if (!paths.some((path) => rule.matches(path, suiteDependencies))) continue;
    for (const id of rule.lanes) {
      const affectedOwners = selectedSlices.filter((slice) => slice.lanes.includes(id));
      const owners = (
        affectedOwners.length
          ? affectedOwners
          : slices.filter((slice) => slice.status === 'active' && slice.lanes.includes(id))
      ).map((slice) => slice.id);
      add(id, owners);
    }
  }
  if (selected.has('console-browser-local-api')) selected.delete('console-browser-dev-api');
  const gate = includesConsole ? 'integrated-gate' : 'public-gate';
  add(gate, ['S71']);
  const hasConsole = existsSync(resolve(root, 'apps/console/api/package.json'));
  return registeredLanes
    .filter((lane) => selected.has(lane.id))
    .map((lane) =>
      Object.assign({}, lane, {
        commands: [lane.command.join(' ')],
        slices: [...selected.get(lane.id)!].toSorted(),
        available: !lane.requires.includes('console') || hasConsole
      })
    );
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
    console.info(
      `\n${lane.id} [${lane.slices.join(', ')} · ${lane.level} · ${lane.tier}]: ${lane.proves ?? 'Registered slice evidence.'}`
    );
    if (!lane.available) console.info('  Requires the private Console checkout.');
    if (lane.requires.length) console.info(`  Requires: ${lane.requires.join(', ')}`);
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
