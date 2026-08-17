import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getHashFromMultipleFiles } from './files';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

const createRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-file-hash-'));
  temporaryDirectories.push(root);
  return root;
};

const digest = async (rootPath: string, files: string[]) =>
  (
    await getHashFromMultipleFiles({
      files: files.map((file) => ({ path: join(rootPath, file), identity: file }))
    })
  ).digest('hex');

const hashGeneratedBundle = async (path: string) =>
  (
    await getHashFromMultipleFiles({
      files: [{ path, identity: 'stacktape-generated-workload.js' }]
    })
  ).digest('hex');

describe('multi-file hashing', () => {
  test('distinguishes content boundaries', async () => {
    const firstRoot = await createRoot();
    const secondRoot = await createRoot();
    await Promise.all([
      writeFile(join(firstRoot, 'first'), 'ab'),
      writeFile(join(firstRoot, 'second'), 'c'),
      writeFile(join(secondRoot, 'first'), 'a'),
      writeFile(join(secondRoot, 'second'), 'bc')
    ]);

    expect(await digest(firstRoot, ['first', 'second'])).not.toBe(await digest(secondRoot, ['first', 'second']));
  });

  test('distinguishes file identity even when contents are equal', async () => {
    const root = await createRoot();
    await Promise.all([writeFile(join(root, 'first'), 'same'), writeFile(join(root, 'second'), 'same')]);

    expect(await digest(root, ['first'])).not.toBe(await digest(root, ['second']));
  });

  test('is stable across different checkout paths with the same relative files', async () => {
    const firstRoot = await createRoot();
    const secondRoot = await createRoot();
    await Promise.all([mkdir(join(firstRoot, 'src')), mkdir(join(secondRoot, 'src'))]);
    await Promise.all([
      writeFile(join(firstRoot, 'src', 'handler.ts'), 'export default 1'),
      writeFile(join(secondRoot, 'src', 'handler.ts'), 'export default 1')
    ]);

    expect(await digest(firstRoot, ['src/handler.ts'])).toBe(await digest(secondRoot, ['src/handler.ts']));
  });

  test('distinguishes a missing file from an empty file', async () => {
    const root = await createRoot();
    await writeFile(join(root, 'empty'), '');

    expect(await digest(root, ['missing'])).not.toBe(await digest(root, ['empty']));
  });

  test('hashes file bytes without replacing invalid UTF-8 sequences', async () => {
    const firstRoot = await createRoot();
    const secondRoot = await createRoot();
    // Both byte sequences decode to the Unicode replacement character when read as UTF-8.
    await Promise.all([
      writeFile(join(firstRoot, 'binary'), Buffer.from([0x80])),
      writeFile(join(secondRoot, 'binary'), Buffer.from([0x81]))
    ]);

    expect(await digest(firstRoot, ['binary'])).not.toBe(await digest(secondRoot, ['binary']));
  });

  test('keeps generated artifacts stable when invocation directories change', async () => {
    const firstRoot = await createRoot();
    const secondRoot = await createRoot();
    const firstBundlePath = join(firstRoot, 'invocation-one', 'index.js');
    const secondBundlePath = join(secondRoot, 'invocation-two', 'index.js');
    await Promise.all([mkdir(join(firstRoot, 'invocation-one')), mkdir(join(secondRoot, 'invocation-two'))]);
    await Promise.all([
      writeFile(firstBundlePath, 'export default 1'),
      writeFile(secondBundlePath, 'export default 1')
    ]);

    expect(await hashGeneratedBundle(firstBundlePath)).toBe(await hashGeneratedBundle(secondBundlePath));
  });
});
