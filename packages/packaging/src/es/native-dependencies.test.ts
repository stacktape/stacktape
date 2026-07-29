import type { RunDocker } from './native-dependencies';
import type { SplitBundleDependency } from '../split-bundler/types';
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureDir, pathExists, writeFile } from 'fs-extra';
import { buildNativeBinaryLayer, copyDockerInstalledModulesForLambda } from './native-dependencies';

const tempDirectories: string[] = [];

const createWorkspace = async () => {
  const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-native-dependencies-'));
  tempDirectories.push(rootPath);
  return {
    installationRootPath: join(rootPath, 'installations'),
    layerBasePath: join(rootPath, 'layers'),
    rootPath
  };
};

const createFakeDocker = () => {
  const calls: string[][] = [];
  const runDocker: RunDocker = async (commands) => {
    calls.push(commands);
    const outputIndex = commands.indexOf('--output');
    const output = commands[outputIndex + 1];
    if (!output?.startsWith('type=local,dest=')) {
      throw new Error('Expected Docker to receive a local output directory.');
    }
    const installDirPath = output.slice('type=local,dest='.length);
    const nodeModulesPath = join(installDirPath, 'node_modules', 'native-package');
    await ensureDir(nodeModulesPath);
    await writeFile(join(nodeModulesPath, 'binding.node'), 'native-binary');
  };
  return { calls, runDocker };
};

const dependency = (name: string): SplitBundleDependency => ({
  name,
  version: '1.2.3',
  hasBinary: true
});

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('native dependency packaging', () => {
  test('does no work when a native layer has no dependencies', async () => {
    const workspace = await createWorkspace();
    const { calls, runDocker } = createFakeDocker();

    const result = await buildNativeBinaryLayer({
      dependencies: [],
      installationRootPath: workspace.installationRootPath,
      layerBasePath: workspace.layerBasePath,
      lambdaRuntimeVersion: 24,
      packageManager: 'pnpm',
      usedByLambdas: [],
      runDocker
    });

    expect(result).toBeNull();
    expect(calls).toEqual([]);
    expect(await pathExists(workspace.installationRootPath)).toBe(false);
  });

  test('builds the expected Docker artifact and Lambda layer layout', async () => {
    const workspace = await createWorkspace();
    const { calls, runDocker } = createFakeDocker();
    const dependencies = [dependency('native-layout-test')];

    const result = await buildNativeBinaryLayer({
      dependencies,
      installationRootPath: workspace.installationRootPath,
      layerBasePath: workspace.layerBasePath,
      lambdaRuntimeVersion: 22,
      packageManager: 'pnpm',
      dockerBuildOutputArchitecture: 'linux/arm64',
      usedByLambdas: ['firstFunction', 'secondFunction'],
      runDocker
    });

    expect(result).not.toBeNull();
    const installDirPath = join(workspace.installationRootPath, result!.contentHash);
    expect(calls).toEqual([
      [
        'image',
        'build',
        '--platform',
        'linux/arm64',
        '--target',
        'artifact',
        '--output',
        `type=local,dest=${installDirPath.replace(/\\/g, '/')}`,
        installDirPath
      ]
    ]);
    expect(await readFile(join(installDirPath, 'Dockerfile'), 'utf8')).toContain(
      'RUN pnpm add native-layout-test@1.2.3'
    );
    expect(JSON.parse(await readFile(join(result!.layerPath, 'nodejs', 'package.json'), 'utf8'))).toEqual({
      type: 'module'
    });
    expect(
      await readFile(join(result!.layerPath, 'nodejs', 'node_modules', 'native-package', 'binding.node'), 'utf8')
    ).toBe('native-binary');
    expect(result).toEqual(
      expect.objectContaining({
        contentHash: 'c6fbe4445b7e',
        dependencies,
        layerPath: join(workspace.layerBasePath, 'layer-native'),
        sizeBytes: expect.any(Number),
        usedByLambdas: ['firstFunction', 'secondFunction']
      })
    );
  });

  test('deduplicates concurrent installations and keeps the content hash stable', async () => {
    const workspace = await createWorkspace();
    const { calls, runDocker } = createFakeDocker();
    const dependencies = [dependency('native-deduplication-test')];
    const input = {
      dependencies,
      installationRootPath: workspace.installationRootPath,
      lambdaRuntimeVersion: 20,
      packageManager: 'npm' as const,
      usedByLambdas: ['function'],
      runDocker
    };

    const [first, second] = await Promise.all([
      buildNativeBinaryLayer({ ...input, layerBasePath: join(workspace.rootPath, 'first-layer') }),
      buildNativeBinaryLayer({ ...input, layerBasePath: join(workspace.rootPath, 'second-layer') })
    ]);

    expect(calls).toHaveLength(1);
    expect(first?.contentHash).toBe(second?.contentHash);
    expect(first?.contentHash).toMatch(/^[a-f0-9]{12}$/);
    expect(await pathExists(join(first!.layerPath, 'nodejs', 'node_modules', 'native-package', 'binding.node'))).toBe(
      true
    );
    expect(await pathExists(join(second!.layerPath, 'nodejs', 'node_modules', 'native-package', 'binding.node'))).toBe(
      true
    );
  });

  test('reuses one Docker installation when copying native modules into multiple Lambdas', async () => {
    const workspace = await createWorkspace();
    const { calls, runDocker } = createFakeDocker();
    const resolvedDependency = {
      ...dependency('native-lambda-copy-test'),
      path: join(workspace.rootPath, 'node_modules', 'native-lambda-copy-test'),
      dependencyType: 'root' as const
    };
    const input = {
      dependencies: [resolvedDependency],
      installationRootPath: workspace.installationRootPath,
      lambdaRuntimeVersion: 20,
      packageManager: 'npm' as const,
      runDocker
    };
    const firstDistPath = join(workspace.rootPath, 'first-lambda');
    const secondDistPath = join(workspace.rootPath, 'second-lambda');

    await Promise.all([
      copyDockerInstalledModulesForLambda({ ...input, distFolderPath: firstDistPath }),
      copyDockerInstalledModulesForLambda({ ...input, distFolderPath: secondDistPath })
    ]);

    expect(calls).toHaveLength(1);
    expect(await readFile(join(firstDistPath, 'node_modules', 'native-package', 'binding.node'), 'utf8')).toBe(
      'native-binary'
    );
    expect(await readFile(join(secondDistPath, 'node_modules', 'native-package', 'binding.node'), 'utf8')).toBe(
      'native-binary'
    );
  });

  test('includes the target architecture in the content hash', async () => {
    const workspace = await createWorkspace();
    const { runDocker } = createFakeDocker();
    const input = {
      dependencies: [dependency('native-architecture-test')],
      installationRootPath: workspace.installationRootPath,
      lambdaRuntimeVersion: 20,
      packageManager: 'npm' as const,
      usedByLambdas: ['function'],
      runDocker
    };

    const amd64 = await buildNativeBinaryLayer({
      ...input,
      layerBasePath: join(workspace.rootPath, 'amd64-layer'),
      dockerBuildOutputArchitecture: 'linux/amd64'
    });
    const arm64 = await buildNativeBinaryLayer({
      ...input,
      layerBasePath: join(workspace.rootPath, 'arm64-layer'),
      dockerBuildOutputArchitecture: 'linux/arm64'
    });

    expect(amd64?.contentHash).not.toBe(arm64?.contentHash);
  });
});
