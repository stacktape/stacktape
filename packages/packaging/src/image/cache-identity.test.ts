import { afterEach, describe, expect, test } from 'bun:test';
import type { PackagingProgressLogger } from '../runtime-contracts';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildUsingCustomDockerfile } from './custom-dockerfile';
import { buildUsingExternalBuildpack } from './external-buildpack';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

const progressLogger: PackagingProgressLogger = {
  eventContext: {},
  startEvent: () => {},
  updateEvent: () => {},
  finishEvent: () => {}
};

const createFixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-image-cache-'));
  temporaryDirectories.push(root);
  const sourceDirectory = join(root, 'service');
  await mkdir(sourceDirectory);
  await writeFile(join(sourceDirectory, 'index.js'), 'console.log("hello");');
  return { root, sourceDirectory };
};

describe('image cache identity', () => {
  test('changes when the external buildpack builder changes', async () => {
    const { root } = await createFixture();
    let buildCount = 0;
    const build = (builder: string, existingDigests: string[]) =>
      buildUsingExternalBuildpack({
        name: 'service',
        cwd: root,
        sourceDirectoryPath: 'service',
        builder,
        progressLogger,
        existingDigests,
        runPack: async () => {
          buildCount++;
          return { stdout: '', stderr: '', exitCode: 0 };
        },
        getDockerImageDetails: async () => ({ size: 1, id: 'image', created: 1 })
      });

    const first = await build('example/builder:first', []);
    const second = await build('example/builder:second', [first.digest]);

    expect(second.outcome).toBe('bundled');
    expect(second.digest).not.toBe(first.digest);
    expect(buildCount).toBe(2);
  });

  test('changes when a different Dockerfile is selected from the same context', async () => {
    const { root, sourceDirectory } = await createFixture();
    await writeFile(join(sourceDirectory, 'Dockerfile'), 'FROM scratch');
    await writeFile(join(sourceDirectory, 'Dockerfile.release'), 'FROM scratch');
    let buildCount = 0;
    const build = (dockerfilePath: string, existingDigests: string[]) =>
      buildUsingCustomDockerfile({
        name: 'service',
        cwd: root,
        buildContextPath: 'service',
        dockerfilePath,
        progressLogger,
        existingDigests,
        buildDockerImage: async () => {
          buildCount++;
          return { size: 1, id: 'image', created: 1, dockerOutput: '', duration: 1 };
        }
      });

    const first = await build('Dockerfile', []);
    const second = await build('Dockerfile.release', [first.digest]);

    expect(second.outcome).toBe('bundled');
    expect(second.digest).not.toBe(first.digest);
    expect(buildCount).toBe(2);
  });

  test('changes when a selected Dockerfile outside the build context changes', async () => {
    const { root } = await createFixture();
    const dockerfilePath = join(root, 'Dockerfile');
    await writeFile(dockerfilePath, 'FROM scratch\nLABEL version=one');
    let buildCount = 0;
    const build = (existingDigests: string[]) =>
      buildUsingCustomDockerfile({
        name: 'service',
        cwd: root,
        buildContextPath: 'service',
        dockerfilePath: '../Dockerfile',
        progressLogger,
        existingDigests,
        buildDockerImage: async () => {
          buildCount++;
          return { size: 1, id: 'image', created: 1, dockerOutput: '', duration: 1 };
        }
      });

    const first = await build([]);
    await writeFile(dockerfilePath, 'FROM scratch\nLABEL version=two');
    const second = await build([first.digest]);

    expect(second.outcome).toBe('bundled');
    expect(second.digest).not.toBe(first.digest);
    expect(buildCount).toBe(2);
  });

  test('changes when a custom Dockerfile build output or vendored dependency changes', async () => {
    const { root, sourceDirectory } = await createFixture();
    await Promise.all([
      mkdir(join(sourceDirectory, 'dist')),
      mkdir(join(sourceDirectory, 'node_modules', 'runtime'), { recursive: true }),
      writeFile(join(sourceDirectory, 'Dockerfile'), 'FROM scratch\nCOPY . /app')
    ]);
    const outputPath = join(sourceDirectory, 'dist', 'server.js');
    const dependencyPath = join(sourceDirectory, 'node_modules', 'runtime', 'index.js');
    await Promise.all([writeFile(outputPath, 'one'), writeFile(dependencyPath, 'one')]);
    const build = (existingDigests: string[]) =>
      buildUsingCustomDockerfile({
        name: 'service',
        cwd: root,
        buildContextPath: 'service',
        dockerfilePath: 'Dockerfile',
        progressLogger,
        existingDigests,
        buildDockerImage: async () => ({ size: 1, id: 'image', created: 1, dockerOutput: '', duration: 1 })
      });

    const first = await build([]);
    await writeFile(outputPath, 'two');
    const outputChanged = await build([first.digest]);
    await writeFile(dependencyPath, 'two');
    const dependencyChanged = await build([outputChanged.digest]);

    expect(outputChanged.digest).not.toBe(first.digest);
    expect(dependencyChanged.digest).not.toBe(outputChanged.digest);
  });

  test('matches Docker context inclusion, including VCS files and .dockerignore exclusions', async () => {
    const { root, sourceDirectory } = await createFixture();
    await mkdir(join(sourceDirectory, '.git'));
    await writeFile(join(sourceDirectory, 'Dockerfile'), 'FROM scratch\nCOPY . /app');
    await writeFile(join(sourceDirectory, '.dockerignore'), 'ignored.txt\n');
    await writeFile(join(sourceDirectory, '.git', 'marker'), 'revision-one');
    await writeFile(join(sourceDirectory, 'ignored.txt'), 'ignored-one');
    let buildCount = 0;
    const build = (existingDigests: string[]) =>
      buildUsingCustomDockerfile({
        name: 'service',
        cwd: root,
        buildContextPath: 'service',
        progressLogger,
        existingDigests,
        buildDockerImage: async () => {
          buildCount++;
          return { size: 1, id: 'image', created: 1, dockerOutput: '', duration: 1 };
        }
      });

    const first = await build([]);
    await writeFile(join(sourceDirectory, 'ignored.txt'), 'ignored-two');
    const ignoredChanged = await build([first.digest]);
    await writeFile(join(sourceDirectory, '.git', 'marker'), 'revision-two');
    const vcsChanged = await build([ignoredChanged.digest]);

    expect(ignoredChanged.outcome).toBe('skipped');
    expect(ignoredChanged.digest).toBe(first.digest);
    expect(vcsChanged.outcome).toBe('bundled');
    expect(vcsChanged.digest).not.toBe(first.digest);
    expect(buildCount).toBe(2);
  });

  test('normalizes equivalent custom Docker build arguments', async () => {
    const { root, sourceDirectory } = await createFixture();
    await writeFile(join(sourceDirectory, 'Dockerfile'), 'FROM scratch');
    const build = (buildArgs: Array<{ argName: string; value: string }>, existingDigests: string[]) =>
      buildUsingCustomDockerfile({
        name: 'service',
        cwd: root,
        buildContextPath: 'service',
        progressLogger,
        buildArgs,
        existingDigests,
        buildDockerImage: async () => ({ size: 1, id: 'image', created: 1, dockerOutput: '', duration: 1 })
      });

    const first = await build(
      [
        { argName: 'FIRST', value: 'one' },
        { argName: 'SECOND', value: 'two' }
      ],
      []
    );
    const reordered = await build(
      [
        { argName: 'SECOND', value: 'two' },
        { argName: 'FIRST', value: 'one' }
      ],
      [first.digest]
    );

    expect(reordered.outcome).toBe('skipped');
    expect(reordered.digest).toBe(first.digest);
  });
});
