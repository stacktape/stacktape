import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { runDockerArtifactBuild } from './docker-artifact-build';
import { createLanguageBuildContext } from './language-build-context';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })));
  roots.length = 0;
});

describe('Docker artifact builds', () => {
  test('uses a unique Dockerfile and removes it after the local export', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-docker-artifact-'));
    roots.push(root);
    const distFolderPath = join(root, 'dist');
    let generatedDockerfilePath: string | undefined;

    await runDockerArtifactBuild({
      dockerfileContents: 'FROM scratch AS artifact',
      sourcePath: root,
      distFolderPath,
      dockerBuildOutputArchitecture: 'linux/arm64',
      buildArgs: ['--build-arg', 'EXAMPLE=value'],
      runDocker: async (args) => {
        generatedDockerfilePath = args[args.indexOf('--file') + 1];
        expect(generatedDockerfilePath).not.toStartWith(distFolderPath);
        const dockerfileRelativeToSource = relative(root, generatedDockerfilePath!);
        expect(dockerfileRelativeToSource.startsWith('..') || isAbsolute(dockerfileRelativeToSource)).toBe(true);
        expect(args).toContain('linux/arm64');
        expect(args).toContain('EXAMPLE=value');
        return { stdout: '', stderr: '', exitCode: 0 };
      }
    });

    expect(generatedDockerfilePath).toBeDefined();
    expect(await readdir(distFolderPath)).not.toContain(generatedDockerfilePath!.split(/[\\/]/).at(-1));
  });

  test('removes files left by an earlier artifact before exporting a rebuild', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-docker-artifact-'));
    roots.push(root);
    const sourcePath = join(root, 'source');
    const distFolderPath = join(root, 'dist');
    await Promise.all([mkdir(sourcePath), mkdir(distFolderPath)]);
    await writeFile(join(distFolderPath, 'stale-dependency.so'), 'stale');

    await runDockerArtifactBuild({
      dockerfileContents: 'FROM scratch AS artifact',
      sourcePath,
      distFolderPath,
      runDocker: async () => ({ stdout: '', stderr: '', exitCode: 0 })
    });

    expect(await Bun.file(join(distFolderPath, 'stale-dependency.so')).exists()).toBe(false);
  });

  test('preserves the Docker failure while still removing its generated Dockerfile', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-docker-artifact-failure-'));
    roots.push(root);
    const distFolderPath = join(root, 'dist');
    const buildFailure = new Error('build failed');

    await expect(
      runDockerArtifactBuild({
        dockerfileContents: 'FROM scratch AS artifact',
        sourcePath: root,
        distFolderPath,
        runDocker: async () => {
          throw buildFailure;
        }
      })
    ).rejects.toBe(buildFailure);
    expect((await readdir(distFolderPath)).filter((file) => file.endsWith('.Dockerfile'))).toEqual([]);
  });

  test('builds from the same filtered source set used by the artifact digest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-docker-artifact-context-'));
    roots.push(root);
    const sourcePath = join(root, 'source');
    const distFolderPath = join(root, 'dist');
    await mkdir(join(sourcePath, '.git'), { recursive: true });
    await mkdir(join(sourcePath, 'node_modules', 'local'), { recursive: true });
    await writeFile(join(sourcePath, 'main.py'), 'print("ok")');
    await writeFile(join(sourcePath, '.dockerignore'), 'main.py\n');
    await writeFile(join(sourcePath, '.git', 'marker'), 'revision');
    await writeFile(join(sourcePath, 'node_modules', 'local', 'index.js'), 'local');

    await runDockerArtifactBuild({
      dockerfileContents: 'FROM scratch AS artifact',
      sourcePath,
      distFolderPath,
      runDocker: async (args) => {
        const contextPath = args.at(-1)!;
        expect(await readFile(join(contextPath, 'main.py'), 'utf8')).toBe('print("ok")');
        expect(await Bun.file(join(contextPath, '.dockerignore')).exists()).toBe(false);
        expect(await Bun.file(join(contextPath, '.git', 'marker')).exists()).toBe(false);
        expect(await Bun.file(join(contextPath, 'node_modules', 'local', 'index.js')).exists()).toBe(false);
        return { stdout: '', stderr: '', exitCode: 0 };
      }
    });
  });

  test('rejects links escaping the managed source root and preserves empty runtime directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-docker-artifact-links-'));
    roots.push(root);
    const sourcePath = join(root, 'source');
    const outsidePath = join(root, 'outside');
    await mkdir(join(sourcePath, 'empty-runtime-dir'), { recursive: true });
    await mkdir(outsidePath, { recursive: true });
    await writeFile(join(outsidePath, 'secret.txt'), 'outside-source');
    await symlink(outsidePath, join(sourcePath, 'outside-link'), process.platform === 'win32' ? 'junction' : 'dir');

    await expect(createLanguageBuildContext(sourcePath)).rejects.toThrow('resolves outside its source directory');

    await rm(join(sourcePath, 'outside-link'), {
      force: true,
      recursive: true
    });
    const contextPath = await createLanguageBuildContext(sourcePath);
    try {
      expect((await readdir(contextPath)).includes('empty-runtime-dir')).toBe(true);
    } finally {
      await rm(contextPath, { force: true, recursive: true });
    }
  });
});
