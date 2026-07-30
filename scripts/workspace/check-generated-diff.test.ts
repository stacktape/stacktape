import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const checker = fileURLToPath(new URL('./check-generated-diff.ts', import.meta.url));
let repository = '';

const run = (command: string, args: string[]) =>
  spawnSync(command, args, {
    cwd: repository,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: '2',
      GIT_CONFIG_KEY_0: 'user.email',
      GIT_CONFIG_KEY_1: 'user.name',
      GIT_CONFIG_VALUE_0: 'test@example.invalid',
      GIT_CONFIG_VALUE_1: 'Stacktape Test'
    }
  });

before(async () => {
  repository = await mkdtemp(path.join(os.tmpdir(), 'stacktape-generated-check-'));
  assert.equal(run('git', ['init']).status, 0);
  const generatedDirectory = path.join(repository, 'apps', 'cli', '@generated', 'llm-docs');
  await mkdir(generatedDirectory, { recursive: true });
  await writeFile(path.join(generatedDirectory, 'index.json'), '{}\n');
  await writeFile(
    path.join(repository, '.gitignore'),
    'apps/cli/@generated/.llm-docs-*/\napps/cli/@generated/llm-docs.previous/\n'
  );
  assert.equal(run('git', ['add', '.']).status, 0);
  assert.equal(run('git', ['commit', '-m', 'Initialize fixture']).status, 0);
});

after(async () => {
  const resolved = path.resolve(repository);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
  await rm(resolved, { force: true, recursive: true });
});

test('ignores unrelated untracked source but rejects untracked and tracked generated output', async () => {
  const sourceDirectory = path.join(repository, 'src');
  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(path.join(sourceDirectory, 'new-source.ts'), 'export const value = 1;\n');

  const unrelated = run(process.execPath, [checker, repository]);
  assert.equal(unrelated.status, 0, unrelated.stderr);

  const stagingDirectory = path.join(repository, 'apps', 'cli', '@generated', '.llm-docs-probe');
  const backupDirectory = path.join(repository, 'apps', 'cli', '@generated', 'llm-docs.previous');
  await mkdir(stagingDirectory, { recursive: true });
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(path.join(stagingDirectory, 'page.md'), '# Staging\n');
  await writeFile(path.join(backupDirectory, 'index.json'), '{}\n');
  const ignoredScratchOutputs = run(process.execPath, [checker, repository]);
  assert.equal(ignoredScratchOutputs.status, 0, ignoredScratchOutputs.stderr);

  const generatedPage = path.join(repository, 'apps', 'cli', '@generated', 'llm-docs', 'pages', 'new-page.md');
  await mkdir(path.dirname(generatedPage), { recursive: true });
  await writeFile(generatedPage, '# New page\n');

  const untracked = run(process.execPath, [checker, repository]);
  assert.equal(untracked.status, 1);
  assert.match(untracked.stderr, /Untracked outputs:[\s\S]*new-page\.md/);
  await rm(generatedPage);

  await writeFile(path.join(repository, 'apps', 'cli', '@generated', 'llm-docs', 'index.json'), '{"changed":true}\n');
  const tracked = run(process.execPath, [checker, repository]);
  assert.equal(tracked.status, 1);
  assert.match(tracked.stderr, /Tracked changes:[\s\S]*index\.json/);
});
