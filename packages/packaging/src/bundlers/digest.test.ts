import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STACKTAPE_LANGUAGE_SOURCE_GLOBS } from '../artifact/language-build-context';
import { getBundleDigestFromGlobs } from './digest';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

describe('source-set bundle digest', () => {
  test('is independent of source enumeration order', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-source-digest-'));
    temporaryDirectories.push(rootPath);
    await Promise.all([writeFile(join(rootPath, 'alpha.ts'), 'alpha'), writeFile(join(rootPath, 'beta.ts'), 'beta')]);

    const getDigest = (extraFiles: string[]) =>
      getBundleDigestFromGlobs({
        rootPath,
        fileGlobs: [],
        extraFiles,
        rawEntryfilePath: 'alpha.ts'
      });

    expect(await getDigest(['alpha.ts', 'beta.ts'])).toBe(await getDigest(['beta.ts', 'alpha.ts']));
  });

  test('invalidates a language artifact when a non-code runtime asset changes', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-source-assets-'));
    temporaryDirectories.push(rootPath);
    await Promise.all([
      writeFile(join(rootPath, 'handler.py'), 'def handler(event, context): return {}'),
      writeFile(join(rootPath, 'template.html'), '<h1>first</h1>')
    ]);
    const getDigest = () =>
      getBundleDigestFromGlobs({
        rootPath,
        fileGlobs: STACKTAPE_LANGUAGE_SOURCE_GLOBS,
        rawEntryfilePath: 'handler.py'
      });

    const first = await getDigest();
    await writeFile(join(rootPath, 'template.html'), '<h1>other</h1>');
    expect(await getDigest()).not.toBe(first);
  });

  test('does not make artifacts depend on VCS or Stacktape working state', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-source-state-'));
    temporaryDirectories.push(rootPath);
    await Promise.all([mkdir(join(rootPath, '.git')), mkdir(join(rootPath, '.stacktape'))]);
    await writeFile(join(rootPath, 'handler.rb'), 'puts :ok');
    const getDigest = () =>
      getBundleDigestFromGlobs({
        rootPath,
        fileGlobs: STACKTAPE_LANGUAGE_SOURCE_GLOBS,
        rawEntryfilePath: 'handler.rb'
      });

    const first = await getDigest();
    await Promise.all([
      writeFile(join(rootPath, '.git', 'HEAD'), 'changed'),
      writeFile(join(rootPath, '.stacktape', 'local-cache'), 'changed')
    ]);
    expect(await getDigest()).toBe(first);
  });

  test('does not hash local Node dependencies that non-ECMAScript buildpacks never ship', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-source-node-modules-'));
    temporaryDirectories.push(rootPath);
    await mkdir(join(rootPath, 'node_modules', 'local-only'), { recursive: true });
    await Promise.all([
      writeFile(join(rootPath, 'handler.py'), 'def handler(): return 1'),
      writeFile(join(rootPath, 'node_modules', 'local-only', 'index.js'), 'first')
    ]);
    const getDigest = () => getBundleDigestFromGlobs({ rootPath, fileGlobs: STACKTAPE_LANGUAGE_SOURCE_GLOBS });

    const first = await getDigest();
    await writeFile(join(rootPath, 'node_modules', 'local-only', 'index.js'), 'second');
    expect(await getDigest()).toBe(first);
  });
});
