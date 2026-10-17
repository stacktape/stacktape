import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));
const putCopy = async (root: string, relative: string) => {
  const destination = join(root, relative);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(workspaceRoot, relative), destination);
};

const run = (root: string, command: string, args: string[]) =>
  spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 30_000 });
const pnpm = (root: string, args: string[]) =>
  process.env.npm_execpath ? run(root, process.execPath, [process.env.npm_execpath, ...args]) : run(root, 'pnpm', args);

test('the real public workspace manifests are discoverable without private Console and the integrated guard refuses it', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-j13-public-workspace-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const discovered = await Promise.all(
    ['apps', 'packages'].map(async (area) => {
      const entries = await readdir(join(workspaceRoot, area), { withFileTypes: true });
      const manifests = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory() && entry.name !== 'console')
          .map(async (entry) => {
            const manifest = `${area}/${entry.name}/package.json`;
            try {
              await readFile(join(workspaceRoot, manifest));
              return manifest;
            } catch (error) {
              if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
              return null;
            }
          })
      );
      return manifests.filter((manifest): manifest is string => manifest !== null);
    })
  );
  const publicManifests = ['package.json', ...discovered.flat()];
  await Promise.all(
    [...publicManifests, 'pnpm-workspace.yaml', 'scripts/workspace/require-console.ts'].map((relative) =>
      putCopy(root, relative)
    )
  );
  const result = pnpm(root, ['list', '--recursive', '--depth=-1', '--json']);
  assert.equal(result.status, 0, result.stderr || result.error?.message || 'pnpm workspace discovery failed');
  // With separate workspace lockfiles pnpm emits one JSON array per package.
  const groups = JSON.parse(`[${result.stdout.trim().replace(/\]\s*\[/g, '],[')}]`) as { name: string }[][];
  const actual = groups
    .flat()
    .map(({ name }) => name)
    .toSorted();
  const expected = await Promise.all(
    publicManifests.map(
      async (manifest) => (JSON.parse(await readFile(join(root, manifest), 'utf8')) as { name: string }).name
    )
  );
  assert.deepEqual(actual, expected.toSorted());
  assert.ok(!actual.some((name) => name.includes('console-api-app') || name.includes('console-ui')));
  const guarded = run(root, process.execPath, ['scripts/workspace/require-console.ts']);
  assert.equal(guarded.status, 1);
  assert.match(guarded.stderr, /apps\/console is not initialized/);
});

test('the actual generator owns committed CSS and its freshness check never repairs stale output', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-j13-generator-owner-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const owner = 'packages/design-tokens';
  await Promise.all(
    ['package.json', 'scripts/generate-css.ts', 'src/tokens.ts', 'generated/tokens.css'].map((relative) =>
      putCopy(root, `${owner}/${relative}`)
    )
  );
  const packageRoot = join(root, owner);
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const invoke = (script: string) => {
    const [command, ...args] = manifest.scripts[script]!.split(' ');
    return run(packageRoot, command === 'node' ? process.execPath : command!, args);
  };
  const cssPath = join(packageRoot, 'generated/tokens.css');
  const before = await readFile(cssPath, 'utf8');
  assert.equal(invoke('generate:check').status, 0);
  const sourcePath = join(packageRoot, 'src/tokens.ts');
  const original = await readFile(sourcePath, 'utf8');
  const changed = original.replace("brand: 'rgb(54, 190, 190)'", "brand: 'rgb(1, 2, 3)'");
  assert.notEqual(changed, original, 'the canonical-input fault must actually change a token');
  await writeFile(sourcePath, changed);
  const stale = invoke('generate:check');
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /design-token CSS is stale/);
  assert.equal(await readFile(cssPath, 'utf8'), before, '--check silently repaired committed output');
  assert.equal(invoke('generate').status, 0);
  const after = await readFile(cssPath, 'utf8');
  assert.match(after, /--stp-color-brand: rgb\(1, 2, 3\)/);
  assert.equal(invoke('generate:check').status, 0);
  assert.equal(await readFile(cssPath, 'utf8'), after);
});
