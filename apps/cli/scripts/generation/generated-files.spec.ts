import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import {
  assertGeneratedDirectoryCurrent,
  assertGeneratedFileCurrent,
  findGeneratedDirectoryProblems
} from './generated-files.ts';

const temporaryDirectories: string[] = [];

const temporaryDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-generated-files-'));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

test('reports missing, outdated and unexpected generated files in stable order', async () => {
  const root = await temporaryDirectory();
  const actual = join(root, 'actual');
  const expected = join(root, 'expected');
  await Promise.all([
    mkdir(join(actual, 'nested'), { recursive: true }),
    mkdir(join(expected, 'nested'), { recursive: true })
  ]);
  await Promise.all([
    writeFile(join(actual, 'nested', 'outdated.txt'), 'old'),
    writeFile(join(expected, 'nested', 'outdated.txt'), 'new'),
    writeFile(join(actual, 'unexpected.txt'), 'extra'),
    writeFile(join(expected, 'missing.txt'), 'expected')
  ]);

  assert.deepEqual(await findGeneratedDirectoryProblems({ actualDirectory: actual, expectedDirectory: expected }), [
    { kind: 'missing', path: 'missing.txt' },
    { kind: 'outdated', path: 'nested/outdated.txt' },
    { kind: 'unexpected', path: 'unexpected.txt' }
  ]);
});

test('accepts byte-identical files and explains how to repair stale output', async () => {
  const root = await temporaryDirectory();
  const actual = join(root, 'actual.txt');
  const expected = join(root, 'expected.txt');
  await Promise.all([writeFile(actual, 'same'), writeFile(expected, 'same')]);

  await assertGeneratedFileCurrent({
    actualPath: actual,
    expectedPath: expected,
    label: 'Fixture',
    fixCommand: 'pnpm generate'
  });
  await writeFile(actual, 'different');
  await assert.rejects(
    assertGeneratedFileCurrent({
      actualPath: actual,
      expectedPath: expected,
      label: 'Fixture',
      fixCommand: 'pnpm generate'
    }),
    /Fixture is outdated[\s\S]*pnpm generate/
  );
});

test('accepts identical generated directories', async () => {
  const root = await temporaryDirectory();
  const actual = join(root, 'actual');
  const expected = join(root, 'expected');
  await Promise.all([mkdir(actual), mkdir(expected)]);
  await Promise.all([writeFile(join(actual, 'file'), 'same'), writeFile(join(expected, 'file'), 'same')]);

  await assertGeneratedDirectoryCurrent({
    actualDirectory: actual,
    expectedDirectory: expected,
    label: 'Fixture directory',
    fixCommand: 'pnpm generate'
  });
});
