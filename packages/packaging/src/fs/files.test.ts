import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dirExists, isDirAccessible, isFileAccessible } from './files';

const temporaryDirectories: string[] = [];
const fileSymlinkTest = process.platform === 'win32' ? test.skip : test;

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

describe('packaging filesystem semantics', () => {
  test('does not classify a directory link as its target directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-packaging-files-'));
    temporaryDirectories.push(root);
    const targetDirectory = join(root, 'target-directory');
    await mkdir(targetDirectory);

    const directoryLink = join(root, 'directory-link');
    await symlink(targetDirectory, directoryLink, process.platform === 'win32' ? 'junction' : 'dir');

    expect(isDirAccessible(directoryLink)).toBe(false);
    expect(dirExists(directoryLink)).toBe(false);
  });

  fileSymlinkTest('does not classify a file link as its target file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-packaging-files-'));
    temporaryDirectories.push(root);
    const targetFile = join(root, 'target-file');
    await writeFile(targetFile, 'content');
    const fileLink = join(root, 'file-link');
    await symlink(targetFile, fileLink, 'file');

    expect(isFileAccessible(fileLink)).toBe(false);
  });
});
