import { describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { attributeBundle, getModuleGroup } from './analyze-bundle';

const CLI_ROOT = resolve(import.meta.dir, '..');

const input = (imports: { path: string; kind: string; external?: boolean }[] = []) => ({ bytes: 0, imports });

/**
 * entry → dispatcher (dynamic) → config (static) → validator (static)
 *                              → command (dynamic) → config (already loaded), sdk (static)
 */
const metafile = {
  inputs: {
    'src/entry.ts': input([{ path: 'src/dispatcher.ts', kind: 'dynamic-import' }]),
    'src/dispatcher.ts': input([
      { path: 'src/config.ts', kind: 'import-statement' },
      { path: 'src/command.ts', kind: 'dynamic-import' },
      { path: 'node:fs', kind: 'import-statement', external: true }
    ]),
    'src/config.ts': input([{ path: '@generated/validator.ts', kind: 'import-statement' }]),
    '@generated/validator.ts': input(),
    'src/command.ts': input([
      { path: 'src/config.ts', kind: 'import-statement' },
      {
        path: 'node_modules/.pnpm/@aws-sdk+client-ec2@3.0.0/node_modules/@aws-sdk/client-ec2/index.js',
        kind: 'require-call'
      }
    ]),
    'node_modules/.pnpm/@aws-sdk+client-ec2@3.0.0/node_modules/@aws-sdk/client-ec2/index.js': input()
  },
  outputs: {
    './entry.js': {
      bytes: 1111,
      entryPoint: 'src/entry.ts',
      inputs: {
        'src/entry.ts': { bytesInOutput: 1 },
        'src/dispatcher.ts': { bytesInOutput: 10 },
        'src/config.ts': { bytesInOutput: 100 },
        '@generated/validator.ts': { bytesInOutput: 500 },
        'src/command.ts': { bytesInOutput: 200 },
        'node_modules/.pnpm/@aws-sdk+client-ec2@3.0.0/node_modules/@aws-sdk/client-ec2/index.js': { bytesInOutput: 300 }
      }
    }
  }
};

const attribution = attributeBundle({ metafile, toRepoPath: (path) => `apps/cli/${path}` });

describe('release bundle attribution', () => {
  test('each dynamic import reports only what it adds beyond the boundaries already loaded', () => {
    const boundaries = Object.fromEntries(attribution.boundaries.map((boundary) => [boundary.target, boundary]));

    expect(boundaries['apps/cli/src/entry.ts']).toMatchObject({ depth: 0, importedBy: null, addedBytes: 1 });
    expect(boundaries['apps/cli/src/dispatcher.ts']).toMatchObject({
      depth: 1,
      importedBy: 'apps/cli/src/entry.ts',
      addedModules: 3,
      addedBytes: 610
    });
    // The command re-imports the configuration module, which the dispatcher already loaded.
    expect(boundaries['apps/cli/src/command.ts']).toMatchObject({ depth: 2, addedModules: 2, addedBytes: 500 });
  });

  test('attributes each module to the boundary that first loads it, with the chain that explains why', () => {
    const validator = attribution.modules.find(({ path }) => path === 'apps/cli/@generated/validator.ts');

    expect(validator).toMatchObject({ bytes: 500, loadedBy: 'apps/cli/src/dispatcher.ts' });
    expect(attribution.importChainOf('apps/cli/@generated/validator.ts')).toEqual([
      { path: 'apps/cli/src/entry.ts', dynamic: false },
      { path: 'apps/cli/src/dispatcher.ts', dynamic: true },
      { path: 'apps/cli/src/config.ts', dynamic: false },
      { path: 'apps/cli/@generated/validator.ts', dynamic: false }
    ]);
  });

  test('converts whole paths with spaces in an import chain and keeps each hop’s kind', () => {
    const spaced = attributeBundle({
      metafile: {
        inputs: {
          'src/entry.ts': input([{ path: 'src/my commands/deploy command.ts', kind: 'dynamic-import' }]),
          'src/my commands/deploy command.ts': input([{ path: 'src/shared lib/helpers.ts', kind: 'import-statement' }]),
          'src/shared lib/helpers.ts': input()
        },
        outputs: {
          './entry.js': {
            bytes: 3,
            entryPoint: 'src/entry.ts',
            inputs: {
              'src/entry.ts': { bytesInOutput: 1 },
              'src/my commands/deploy command.ts': { bytesInOutput: 1 },
              'src/shared lib/helpers.ts': { bytesInOutput: 1 }
            }
          }
        }
      },
      toRepoPath: (path) => `apps/my cli/${path}`
    });

    expect(spaced.importChainOf('apps/my cli/src/shared lib/helpers.ts')).toEqual([
      { path: 'apps/my cli/src/entry.ts', dynamic: false },
      { path: 'apps/my cli/src/my commands/deploy command.ts', dynamic: true },
      { path: 'apps/my cli/src/shared lib/helpers.ts', dynamic: false }
    ]);
  });

  test('keeps emitted output bytes apart from the bytes attributed to input modules', () => {
    expect(attribution.outputBytes).toBe(1111);
    expect(attribution.attributedBytes).toBe(1111);
    expect(attribution.modules.map(({ bytes }) => bytes)).toEqual([500, 300, 200, 100, 10, 1]);
  });

  test.each([
    [
      'apps/cli/node_modules/.pnpm/@aws-sdk+client-ec2@3.0.0/node_modules/@aws-sdk/client-ec2/dist/index.js',
      'npm:@aws-sdk/client-ec2'
    ],
    ['apps/cli/node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/index.js', 'npm:yaml'],
    ['packages/packaging/src/split-bundler/bundler.ts', 'packages/packaging'],
    ['apps/cli/src/domain/config-manager/utils/validation.ts', 'apps/cli/src/domain/config-manager'],
    ['apps/cli/src/utils/zip.ts', 'apps/cli/src/utils'],
    ['apps/cli/@generated/schemas/validate-config-zod.ts', 'apps/cli/@generated']
  ])('groups %s under %s', (path, group) => {
    expect(getModuleGroup(path)).toBe(group);
  });
});

describe('analyze:bundle output directory', () => {
  test('refuses a directory that already has content and leaves that content untouched', async () => {
    const directory = join(CLI_ROOT, '.stacktape', `analyze-bundle-test-${randomUUID().slice(0, 8)}`);
    const sentinel = join(directory, 'bundle', 'sentinel.txt');
    await mkdir(join(directory, 'bundle'), { recursive: true });
    await writeFile(sentinel, 'keep me\n');
    try {
      const child = Bun.spawnSync(
        [process.execPath, join(CLI_ROOT, 'scripts', 'analyze-bundle.ts'), '--out', directory],
        {
          cwd: CLI_ROOT,
          stdout: 'pipe',
          stderr: 'pipe'
        }
      );

      expect(child.exitCode).toBe(1);
      expect(child.stderr.toString()).toContain('it is not empty');
      expect(await readFile(sentinel, 'utf8')).toBe('keep me\n');
      expect(existsSync(join(directory, 'report.json'))).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
