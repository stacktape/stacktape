import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
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
  matches: (path: string) => boolean;
};

const hasPart = (path: string, expression: RegExp) => expression.test(path);

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
    id: 'synthesis',
    proves: 'Config resolution and synthesized infrastructure preserve semantic contracts.',
    commands: ['pnpm --filter @stacktape/cli test:characterization', 'pnpm --filter @stacktape/cli generate:check'],
    matches: (path) =>
      hasPart(path, /^apps\/cli\/(src\/(domain|config|resource-reference)|tests\/characterization)/) ||
      hasPart(path, /^packages\/(cloudformation|config|config-authoring|naming)\//)
  },
  {
    id: 'packaging-runtime',
    proves: 'Real archives and images build and execute in their target runtimes.',
    commands: ['pnpm test:packaging-e2e'],
    matches: (path) =>
      path.startsWith('packages/packaging/') ||
      hasPart(path, /^apps\/cli\/src\/(packaging|domain\/packaging)/) ||
      path.startsWith('apps/cli/scripts/packaging')
  },
  {
    id: 'project-qualification',
    proves: 'Representative customer projects import, package, and execute through the current source CLI.',
    commands: [
      'pnpm qualify:projects -- --preset=smoke --lanes=import,package --allow-host-project-code',
      'pnpm qualify:projects -- --lanes=runtime'
    ],
    matches: (path) =>
      hasPart(path, /^apps\/cli\/(src\/init|scripts\/qualification|starter-projects-metadata)/) ||
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
    proves: 'Migrations and database behavior run against an isolated real PostgreSQL server.',
    commands: ['pnpm --filter @stacktape/console-api-app test:db'],
    matches: (path) =>
      path.startsWith('apps/console/api/prisma/') ||
      hasPart(path, /^apps\/console\/api\/src\/(raw-sql-queries|services\/prisma|model-helpers)/)
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
    id: 'console-browser-local-api',
    proves: 'A customer-visible Console flow works through a real browser and the changed local API.',
    commands: ['pnpm dev:console', 'pnpm --filter @stacktape/console-ui test:e2e'],
    matches: (path) => path.startsWith('apps/console/api/src/') || path.startsWith('packages/console-api/')
  },
  {
    id: 'console-browser-dev-api',
    proves: 'A customer-visible UI flow works in a real browser against the deployed dev API.',
    commands: ['pnpm test:console:browser:dev-api'],
    matches: (path) => path.startsWith('apps/console/ui/src/') || path.startsWith('packages/ui-react/')
  },
  {
    id: 'console-deployed-dev',
    proves: 'Externally delivered callbacks, events, jobs, or runner behavior reach the changed dev code.',
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
    commands: ['pnpm test:aws -- --aws-scenario=<explicit-scenario>'],
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
    commands: ['pnpm --filter @stacktape/docs typecheck', 'pnpm --filter @stacktape/docs build'],
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
    const child = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
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

export const parsePorcelainStatusPaths = (output: string): string[] =>
  output
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      const rawPath = line.slice(3);
      const path = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath;
      return path ? [path] : [];
    });

const collectStatusPaths = async (cwd: string, prefix = '') => {
  const output = await runGit(['status', '--porcelain=v1', '--untracked-files=all'], cwd);
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

export const createTestPlan = (paths: string[]): TestLane[] => {
  const includesConsole = paths.some((path) => path === 'apps/console' || path.startsWith('apps/console/'));
  let lanes = RULES.filter((rule) => paths.some((path) => rule.matches(path))).map(({ matches: _, ...lane }) => lane);
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
