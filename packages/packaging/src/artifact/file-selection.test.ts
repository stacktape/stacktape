import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyArtifactFileSelection, resolveArtifactFileSelection } from './file-selection';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })));
  roots.length = 0;
});

describe('language artifact file selection', () => {
  test('changes cache identity when an explicitly included file changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-artifact-files-'));
    roots.push(root);
    await mkdir(join(root, 'assets'), { recursive: true });
    const includedPath = join(root, 'assets', 'runtime.txt');
    await writeFile(includedPath, 'first');

    const first = await resolveArtifactFileSelection({ cwd: root, includeFiles: ['assets/**'] });
    await writeFile(includedPath, 'second');
    const second = await resolveArtifactFileSelection({ cwd: root, includeFiles: ['assets/**'] });

    expect(second.explicitlyIncludedFiles).toEqual(['assets/runtime.txt']);
    expect(second.digest).not.toBe(first.digest);
  });

  test('copies explicit assets, applies exclusions last, and strips local state', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-artifact-files-'));
    roots.push(root);
    const outputDirectory = join(root, 'artifact');
    await Promise.all([
      mkdir(join(root, 'assets'), { recursive: true }),
      mkdir(join(outputDirectory, '.git'), { recursive: true }),
      mkdir(join(outputDirectory, '.stacktape'), { recursive: true }),
      mkdir(join(outputDirectory, 'node_modules', 'local-only'), { recursive: true })
    ]);
    await Promise.all([
      writeFile(join(root, 'assets', 'public.txt'), 'public'),
      writeFile(join(root, 'assets', 'private.secret'), 'private'),
      writeFile(join(outputDirectory, '.git', 'HEAD'), 'ref'),
      writeFile(join(outputDirectory, '.stacktape', 'cache'), 'cache'),
      writeFile(join(outputDirectory, 'node_modules', 'local-only', 'index.js'), 'local')
    ]);

    await applyArtifactFileSelection({
      cwd: root,
      outputDirectory,
      includeFiles: ['assets/**'],
      excludeFiles: ['**/*.secret'],
      createPackagingError: ({ message }) => new Error(message)
    });

    expect(await readFile(join(outputDirectory, 'assets', 'public.txt'), 'utf8')).toBe('public');
    expect(await Bun.file(join(outputDirectory, 'assets', 'private.secret')).exists()).toBe(false);
    expect(await Bun.file(join(outputDirectory, '.git', 'HEAD')).exists()).toBe(false);
    expect(await Bun.file(join(outputDirectory, '.stacktape', 'cache')).exists()).toBe(false);
    expect(await Bun.file(join(outputDirectory, 'node_modules', 'local-only', 'index.js')).exists()).toBe(false);
  });
});
