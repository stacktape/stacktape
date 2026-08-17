import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { buildGeneratedDockerImage } from './generated-image-build';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })));
  roots.length = 0;
});

describe('generated image Dockerfile lifecycle', () => {
  test('keeps the Dockerfile outside the context and removes it after a successful build', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-image-dockerfile-'));
    roots.push(root);
    const buildContextPath = join(root, 'artifact');
    await mkdir(buildContextPath);
    await Bun.write(join(buildContextPath, 'index.js'), 'export {};');
    let resolvedDockerfilePath = '';

    await buildGeneratedDockerImage({
      dockerfileContents: 'FROM scratch',
      buildContextPath,
      imageTag: 'test',
      buildDockerImage: async ({ dockerfilePath = '' }) => {
        resolvedDockerfilePath = isAbsolute(dockerfilePath)
          ? dockerfilePath
          : resolve(buildContextPath, dockerfilePath);
        expect(dirname(resolvedDockerfilePath)).toBe(root);
        expect(await Bun.file(resolvedDockerfilePath).text()).toBe('FROM scratch');
        return { size: 0, id: 'test', created: 0, dockerOutput: '', duration: 0 };
      }
    });

    expect(await Bun.file(resolvedDockerfilePath).exists()).toBe(false);
    expect(await readdir(buildContextPath)).toEqual(['index.js']);
  });

  test('removes the temporary Dockerfile after a failed build', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-image-dockerfile-'));
    roots.push(root);
    const buildContextPath = join(root, 'artifact');
    await mkdir(buildContextPath);
    await Bun.write(join(buildContextPath, 'index.js'), 'export {};');

    await expect(
      buildGeneratedDockerImage({
        dockerfileContents: 'FROM scratch',
        buildContextPath,
        imageTag: 'test',
        buildDockerImage: async () => {
          throw new Error('build failed');
        }
      })
    ).rejects.toThrow('build failed');
    expect((await readdir(root)).toSorted()).toEqual(['artifact']);
  });
});
