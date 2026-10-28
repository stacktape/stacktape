import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDockerContextChecksum, getExcludedDirectoryGlobs } from './docker-context';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.map(async (root) => {
      await chmod(join(root, '.stacktape', 'dev-data'), 0o755).catch(() => {});
      await rm(root, { force: true, recursive: true });
    })
  );
  roots.length = 0;
});

describe('docker build context checksum', () => {
  // r2mm: once dev mode had run, the local MySQL container owned `.stacktape/dev-data`, and the checksum of a batch job
  // image built from the project root failed with EACCES although the image excludes `.stacktape`.
  test('does not read a directory that the exclusions drop', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-docker-context-'));
    roots.push(root);
    await writeFile(join(root, 'report.ts'), 'console.log("report");\n');
    await mkdir(join(root, '.stacktape', 'dev-data', 'mysql'), { recursive: true });
    await chmod(join(root, '.stacktape', 'dev-data'), 0o000);

    const { includedFilePaths } = await getDockerContextChecksum({
      absoluteBuildContextPath: root,
      includeDockerfile: false,
      ignorePatterns: ['**/.git', '**/.stacktape', '**/node_modules']
    });
    expect(includedFilePaths).toEqual([join(root, 'report.ts')]);
  });

  test('skips only directories that no negation can bring back', () => {
    expect(getExcludedDirectoryGlobs(['**/.stacktape', 'node_modules/', '/dist', '# comment', '*.log', 'a/b'])).toEqual(
      ['**/.stacktape/**', 'node_modules/**', 'dist/**']
    );
    expect(getExcludedDirectoryGlobs(['**/.stacktape', '!.stacktape/keep.txt'])).toEqual([]);
  });
});
