/**
 * Validate the reusable generated applications with their own native tooling.
 *
 * This complements init's semantic E2E lane: Compose parses the real manifests, Dockerfiles build,
 * Python and Ruby source is checked, and selected projects install dependencies from a cold copy
 * before running their own typechecks/builds/tests. Every mutating build runs in a temporary copy
 * so the shared corpus remains clean for packaging and importer work.
 */

import { cp, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const rawArguments = process.argv.slice(2);
const argument = (name: string): string | undefined =>
  rawArguments.find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1);
const projectsRootArgument = argument('--projects-root');
const reportArgument = argument('--report');
const selected = new Set(
  rawArguments
    .filter((entry) => entry.startsWith('--case='))
    .flatMap((entry) => entry.slice('--case='.length).split(','))
    .filter(Boolean)
);

type Validation = {
  name: string;
  command: string[];
  passed: boolean;
  durationMs: number;
  output: string;
};

type ProjectValidation = {
  id: string;
  status: 'passed' | 'failed' | 'skipped';
  passed: boolean;
  validations: Validation[];
  skipped: string[];
};

const COMPOSE_FILES = ['compose.yml', 'compose.yaml', 'docker-compose.yml', 'docker-compose.yaml'] as const;
const NATIVE_COPY_EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.sst',
  '.turbo',
  '.venv',
  '.wrangler',
  '_build',
  'build',
  'coverage',
  'deps',
  'dist',
  'node_modules',
  'obj',
  'target',
  'vendor'
]);
const RUBY_VALIDATION_IMAGE = 'ruby@sha256:2f763b37070564bb00b736f1d4dba6e8f8d203b5f93b94463879fd8d79966f28';
const includeNativeSource = (path: string): boolean => !NATIVE_COPY_EXCLUDED_DIRECTORIES.has(basename(path));

const NATIVE_COMMANDS: Readonly<Record<string, ReadonlyArray<{ name: string; command: string[] }>>> = {
  'bun-hono-drizzle': [
    { name: 'dependency installation', command: ['bun', 'install', '--frozen-lockfile', '--ignore-scripts'] },
    { name: 'application tests', command: ['bun', 'test'] },
    { name: 'TypeScript typecheck', command: ['bun', 'run', 'typecheck'] }
  ],
  'cdk-orders-platform': [
    { name: 'dependency installation', command: ['bun', 'install', '--ignore-scripts'] },
    { name: 'TypeScript build', command: ['bun', 'run', 'build'] }
  ],
  'cloudflare-workers-saas': [
    { name: 'dependency installation', command: ['bun', 'install', '--ignore-scripts'] },
    { name: 'TypeScript typecheck', command: ['bun', 'run', 'typecheck'] },
    { name: 'application tests', command: ['bun', 'run', 'test'] },
    { name: 'Wrangler dry-run build', command: ['bun', 'run', 'build'] }
  ],
  'helm-payments-platform': [
    { name: 'dependency installation', command: ['npm', 'ci', '--ignore-scripts'] },
    { name: 'TypeScript build', command: ['npm', 'run', 'build'] },
    { name: 'application tests', command: ['npm', 'test', '--', '--run'] }
  ],
  'nestjs-operations-monorepo': [
    { name: 'dependency installation', command: ['pnpm', 'install', '--frozen-lockfile', '--ignore-scripts'] },
    { name: 'Prisma client generation', command: ['pnpm', 'db:generate'] },
    { name: 'monorepo build', command: ['pnpm', 'build'] }
  ],
  'pulumi-typescript-serverless': [
    { name: 'dependency installation', command: ['npm', 'ci', '--ignore-scripts'] },
    { name: 'application tests', command: ['npm', 'test', '--', '--run'] },
    { name: 'TypeScript typecheck', command: ['npm', 'run', 'typecheck'] }
  ],
  'serverless-event-pipeline': [
    { name: 'dependency installation', command: ['bun', 'install', '--ignore-scripts'] },
    { name: 'TypeScript typecheck', command: ['bun', 'run', 'typecheck'] }
  ],
  'sst-support-platform': [
    { name: 'dependency installation', command: ['bun', 'install', '--ignore-scripts'] },
    { name: 'TypeScript build', command: ['bun', 'run', 'build'] }
  ],
  'terraform-lambda-pipeline': [{ name: 'Node handler tests', command: ['node', '--test'] }]
};

const run = async (name: string, command: string[], cwd: string): Promise<Validation> => {
  const started = performance.now();
  try {
    const child = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited
    ]);
    const output = `${stdout}${stderr}`.trim().slice(-8_000);
    return {
      name,
      command,
      passed: exitCode === 0,
      durationMs: Math.round(performance.now() - started),
      output
    };
  } catch (error) {
    return {
      name,
      command,
      passed: false,
      durationMs: Math.round(performance.now() - started),
      output: error instanceof Error ? (error.stack ?? error.message) : String(error)
    };
  }
};

const sourceFiles = async (root: string): Promise<string[]> => {
  const found: string[] = [];
  const visit = async (directory: string, relative: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && NATIVE_COPY_EXCLUDED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      const nextRelative = relative === '' ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) await visit(join(directory, entry.name), nextRelative);
      else if (entry.isFile()) found.push(nextRelative);
    }
  };
  await visit(root, '');
  return found;
};

const validateProject = async (sourceRoot: string, id: string): Promise<ProjectValidation> => {
  const validations: Validation[] = [];
  const skipped: string[] = [];
  const files = await sourceFiles(sourceRoot);
  const composeFiles = COMPOSE_FILES.filter((file) => files.includes(file));
  for (const composeFile of composeFiles) {
    validations.push(
      await run(
        `Docker Compose parses ${composeFile}`,
        ['docker', 'compose', '-f', composeFile, 'config', '--quiet', '--no-interpolate'],
        sourceRoot
      )
    );
  }

  if (files.includes('Dockerfile')) {
    const cleanupRoot = await mkdtemp(join(tmpdir(), 'stacktape-native-docker-'));
    const projectRoot = join(cleanupRoot, id);
    try {
      await cp(sourceRoot, projectRoot, { recursive: true, filter: includeNativeSource });
      validations.push(
        await run('Dockerfile build check', ['docker', 'build', '--check', '-f', 'Dockerfile', '.'], projectRoot)
      );
      validations.push(
        await run(
          'Dockerfile full build',
          ['docker', 'build', '--progress=plain', '--output=type=cacheonly', '-f', 'Dockerfile', '.'],
          projectRoot
        )
      );
    } finally {
      await rm(cleanupRoot, { recursive: true, force: true });
    }
  }

  if (files.some((file) => file.endsWith('.py'))) {
    const cleanupRoot = await mkdtemp(join(tmpdir(), 'stacktape-native-python-'));
    const projectRoot = join(cleanupRoot, id);
    try {
      await cp(sourceRoot, projectRoot, {
        recursive: true,
        filter: includeNativeSource
      });
      validations.push(await run('Python source compilation', ['python', '-m', 'compileall', '-q', '.'], projectRoot));
    } finally {
      await rm(cleanupRoot, { recursive: true, force: true });
    }
  }

  if (files.some((file) => file.endsWith('.rb') || file.endsWith('.ru') || file === 'Rakefile')) {
    const cleanupRoot = await mkdtemp(join(tmpdir(), 'stacktape-native-ruby-'));
    const projectRoot = join(cleanupRoot, id);
    try {
      await cp(sourceRoot, projectRoot, {
        recursive: true,
        filter: includeNativeSource
      });
      validations.push(
        await run(
          'Ruby source syntax',
          [
            'docker',
            'run',
            '--rm',
            '--mount',
            `type=bind,source=${projectRoot},target=/app,readonly`,
            '-w',
            '/app',
            RUBY_VALIDATION_IMAGE,
            'sh',
            '-lc',
            'find . -type f \\( -name \'*.rb\' -o -name \'*.ru\' -o -name \'Rakefile\' \\) -print0 | xargs -0 -n1 ruby -c && for file in bin/*; do if [ -f "$file" ] && head -n1 "$file" | grep -q ruby; then ruby -c "$file" || exit 1; fi; done'
          ],
          projectRoot
        )
      );
    } finally {
      await rm(cleanupRoot, { recursive: true, force: true });
    }
  }

  const nativeCommands = NATIVE_COMMANDS[id] ?? [];
  if (nativeCommands.length > 0) {
    const cleanupRoot = await mkdtemp(join(tmpdir(), 'stacktape-native-project-'));
    const projectRoot = join(cleanupRoot, id);
    try {
      await cp(sourceRoot, projectRoot, {
        recursive: true,
        filter: includeNativeSource
      });
      for (const validation of nativeCommands) {
        validations.push(await run(validation.name, validation.command, projectRoot));
      }
    } finally {
      await rm(cleanupRoot, { recursive: true, force: true });
    }
  }

  if (composeFiles.length === 0) skipped.push('No root Docker Compose manifest to validate.');
  if (!files.includes('Dockerfile')) skipped.push('No root Dockerfile to check.');
  if (!files.some((file) => file.endsWith('.py'))) skipped.push('No Python source to compile.');
  if (!files.some((file) => file.endsWith('.rb') || file.endsWith('.ru') || file === 'Rakefile')) {
    skipped.push('No Ruby source to syntax-check.');
  }
  if (nativeCommands.length === 0) skipped.push('No dependency-pinned native command is declared for this project.');
  const status =
    validations.length === 0 ? 'skipped' : validations.every((entry) => entry.passed) ? 'passed' : 'failed';
  return { id, status, passed: status === 'passed', validations, skipped };
};

const main = async (): Promise<void> => {
  if (projectsRootArgument === undefined) throw new Error('Pass --projects-root=<directory>.');
  const projectsRoot = resolve(projectsRootArgument);
  const entries = (await readdir(projectsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((id) => selected.size === 0 || selected.has(id))
    .sort();
  const unknown = [...selected].filter((id) => !entries.includes(id));
  if (unknown.length > 0) throw new Error(`Unknown synthetic corpus case(s): ${unknown.join(', ')}.`);
  if (entries.length === 0) throw new Error(`No project directories found in ${projectsRoot}.`);

  const results: ProjectValidation[] = [];
  for (const id of entries) {
    process.stderr.write(`\n[${results.length + 1}/${entries.length}] ${id}\n`);
    const result = await validateProject(join(projectsRoot, id), id);
    results.push(result);
    for (const validation of result.validations) {
      process.stderr.write(
        `  ${validation.passed ? 'PASS' : 'FAIL'} ${validation.name} (${validation.durationMs}ms)\n`
      );
    }
  }

  const report = `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      projectsRoot,
      passed: results.filter((entry) => entry.status === 'passed').length,
      failed: results.filter((entry) => entry.status === 'failed').length,
      skipped: results.filter((entry) => entry.status === 'skipped').length,
      validations: results.reduce((count, entry) => count + entry.validations.length, 0),
      results
    },
    null,
    2
  )}\n`;
  if (reportArgument === undefined) process.stdout.write(report);
  else await writeFile(resolve(reportArgument), report, 'utf8');
  if (results.some((entry) => entry.status !== 'passed')) process.exitCode = 1;
};

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exitCode = 1;
});
