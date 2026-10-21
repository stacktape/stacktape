import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { typecheckCli } from '../../apps/cli/scripts/typecheck.mts';

test('CLI compilation discovers a new smoke project and rejects errors in its included source', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-typecheck-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all(
    ['', 'tests', '@generated', '_test-stacks/new-smoke', '_test-stacks/separate-app'].map(async (directory) => {
      const path = join(root, directory);
      await mkdir(path, { recursive: true });
      await Promise.all([
        writeFile(
          join(path, 'tsconfig.json'),
          JSON.stringify({
            compilerOptions: { strict: true, noEmit: true, types: [], lib: ['ES5'] },
            include: ['*.ts']
          })
        ),
        writeFile(join(path, 'source.ts'), 'export const value: string = "valid";')
      ]);
    })
  );
  // Candidate applications with their own dependency install are outside the CLI program.
  await writeFile(join(root, '_test-stacks/separate-app/package.json'), '{"private":true}');
  await writeFile(
    join(root, '_test-stacks/separate-app/source.ts'),
    'import { unavailable } from "uninstalled-fixture-dependency"; export const value = unavailable;'
  );
  const runner = new URL('../../apps/cli/scripts/typecheck.mts', import.meta.url).href;
  const compile = () =>
    spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `import { typecheckCli } from ${JSON.stringify(runner)}; process.exitCode = typecheckCli(${JSON.stringify(root)});`
      ],
      { encoding: 'utf8', timeout: 30_000 }
    );
  assert.equal(typecheckCli(root), 0);
  await writeFile(join(root, '_test-stacks/new-smoke/source.ts'), 'export const value: string = 42;');
  const invalid = compile();
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stdout, /new-smoke.*source\.ts.*TS2322/);
  // An early program's error fails the run even though every later program compiles.
  await writeFile(join(root, '_test-stacks/new-smoke/source.ts'), 'export const value: string = "valid";');
  await writeFile(join(root, 'tests/source.ts'), 'export const value: string = 42;');
  const invalidTests = compile();
  assert.notEqual(invalidTests.status, 0);
  assert.match(invalidTests.stdout, /source\.ts.*TS2322/);
});

test('Turbo schedules generated editor inputs and shared UI before development consumers', () => {
  const hasConsole = existsSync(new URL('../../apps/console/ui/package.json', import.meta.url));
  const result = spawnSync(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    [
      '--config.verify-deps-before-run=false',
      'exec',
      'turbo',
      'run',
      'dev',
      'build:watch',
      ...(hasConsole ? ['--filter=@stacktape/console-ui'] : []),
      '--filter=@stacktape/init-ui',
      '--filter=@stacktape/website',
      '--filter=@stacktape/docs',
      '--dry=json'
    ],
    {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      shell: process.platform === 'win32',
      timeout: 30_000,
      env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' }
    }
  );
  assert.equal(result.status, 0, result.stderr);
  const graph = JSON.parse(result.stdout) as { tasks: { taskId: string; dependencies: string[] }[] };
  const expected: Record<string, string[]> = {
    '@stacktape/init-ui#build:watch': ['@stacktape/ui-react#build'],
    '@stacktape/website#dev': ['@stacktape/design-tokens#generate', '@stacktape/ui-react#build'],
    '@stacktape/docs#dev': ['@stacktape/cli#generate', '@stacktape/cli#generate:monaco', '@stacktape/ui-react#build']
  };
  // Public clones intentionally have no Console workspace.
  if (hasConsole) {
    expected['@stacktape/console-ui#dev'] = ['@stacktape/console-ui#generate', '@stacktape/ui-react#build'];
  }
  for (const [id, prerequisites] of Object.entries(expected)) {
    const task = graph.tasks.find(({ taskId }) => taskId === id);
    assert.ok(task, `Missing development task ${id}`);
    for (const prerequisite of prerequisites) {
      assert.ok(task.dependencies.includes(prerequisite), `${id} starts without ${prerequisite}`);
    }
  }
});
