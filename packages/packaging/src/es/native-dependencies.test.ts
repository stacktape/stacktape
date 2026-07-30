import type { RunDocker } from './native-dependencies';
import type { SplitBundleDependency } from '../split-bundler/types';
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readdir, readFile, rm, symlink, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureDir, pathExists, writeFile } from 'fs-extra';
import { buildNativeBinaryLayer, copyDockerInstalledModulesForLambda } from './native-dependencies';

const tempDirectories: string[] = [];
const linuxTest = process.platform === 'linux' ? test : test.skip;

const createWorkspace = async () => {
  const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-native-dependencies-'));
  tempDirectories.push(rootPath);
  return {
    installationRootPath: join(rootPath, 'installations'),
    layerBasePath: join(rootPath, 'layers'),
    rootPath
  };
};

const createFakeDocker = ({
  contents = () => 'native-binary',
  modifiedAt,
  rejectedCalls = [],
  symlinkTarget
}: {
  contents?: (callNumber: number) => string;
  modifiedAt?: Date;
  rejectedCalls?: number[];
  symlinkTarget?: string;
} = {}) => {
  const calls: string[][] = [];
  const runDocker: RunDocker = async (commands) => {
    calls.push(commands);
    const callNumber = calls.length;
    if (rejectedCalls.includes(callNumber)) {
      throw new Error(`Docker failed on call ${callNumber}`);
    }
    const outputIndex = commands.indexOf('--output');
    const output = commands[outputIndex + 1];
    if (!output?.startsWith('type=local,dest=')) {
      throw new Error('Expected Docker to receive a local output directory.');
    }
    const installDirPath = output.slice('type=local,dest='.length);
    const nodeModulesPath = join(installDirPath, 'node_modules', 'native-package');
    const nativeModulePath = join(nodeModulesPath, 'binding.node');
    await ensureDir(nodeModulesPath);
    await writeFile(nativeModulePath, contents(callNumber));
    if (symlinkTarget) {
      await symlink(symlinkTarget, join(nodeModulesPath, 'native-link'));
    }
    if (modifiedAt) {
      await utimes(nativeModulePath, modifiedAt, modifiedAt);
    }
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
    const [installationDirectoryName] = await readdir(workspace.installationRootPath);
    const installDirPath = join(workspace.installationRootPath, installationDirectoryName!);
    expect(installationDirectoryName).toMatch(/^[a-f0-9]{40}$/);
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
        contentHash: expect.stringMatching(/^[a-f0-9]{12}$/),
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

  test('reuses a completed installation within the same installation root', async () => {
    const workspace = await createWorkspace();
    const { calls, runDocker } = createFakeDocker();
    const input = {
      dependencies: [dependency('native-sequential-reuse-test')],
      installationRootPath: workspace.installationRootPath,
      lambdaRuntimeVersion: 20,
      packageManager: 'npm' as const,
      usedByLambdas: ['function'],
      runDocker
    };

    await buildNativeBinaryLayer({
      ...input,
      layerBasePath: join(workspace.rootPath, 'first-layer')
    });
    const second = await buildNativeBinaryLayer({
      ...input,
      layerBasePath: join(workspace.rootPath, 'second-layer')
    });

    expect(calls).toHaveLength(1);
    expect(await pathExists(join(second!.layerPath, 'nodejs', 'node_modules', 'native-package', 'binding.node'))).toBe(
      true
    );
  });

  test('derives the public content hash from the bytes Docker produced, not the build specification', async () => {
    const firstWorkspace = await createWorkspace();
    const secondWorkspace = await createWorkspace();
    const dependencies = [dependency('native-content-hash-test')];
    const input = {
      dependencies,
      lambdaRuntimeVersion: 20,
      packageManager: 'npm' as const,
      usedByLambdas: ['function']
    };

    const first = await buildNativeBinaryLayer({
      ...input,
      installationRootPath: firstWorkspace.installationRootPath,
      layerBasePath: firstWorkspace.layerBasePath,
      runDocker: createFakeDocker({ contents: () => 'first-native-binary' }).runDocker
    });
    const second = await buildNativeBinaryLayer({
      ...input,
      installationRootPath: secondWorkspace.installationRootPath,
      layerBasePath: secondWorkspace.layerBasePath,
      runDocker: createFakeDocker({ contents: () => 'second-native-binary' }).runDocker
    });

    expect(first?.contentHash).toMatch(/^[a-f0-9]{12}$/);
    expect(second?.contentHash).toMatch(/^[a-f0-9]{12}$/);
    expect(first?.contentHash).not.toBe(second?.contentHash);
  });

  test('excludes file timestamps from the public content hash', async () => {
    const firstWorkspace = await createWorkspace();
    const secondWorkspace = await createWorkspace();
    const input = {
      dependencies: [dependency('native-timestamp-test')],
      lambdaRuntimeVersion: 20,
      packageManager: 'npm' as const,
      usedByLambdas: ['function']
    };

    const first = await buildNativeBinaryLayer({
      ...input,
      installationRootPath: firstWorkspace.installationRootPath,
      layerBasePath: firstWorkspace.layerBasePath,
      runDocker: createFakeDocker({ modifiedAt: new Date('2020-01-01T00:00:00Z') }).runDocker
    });
    const second = await buildNativeBinaryLayer({
      ...input,
      installationRootPath: secondWorkspace.installationRootPath,
      layerBasePath: secondWorkspace.layerBasePath,
      runDocker: createFakeDocker({ modifiedAt: new Date('2030-01-01T00:00:00Z') }).runDocker
    });

    expect(first?.contentHash).toBe(second?.contentHash);
  });

  linuxTest('hashes the raw symlink target independently of its installation root', async () => {
    const firstWorkspace = await createWorkspace();
    const secondWorkspace = await createWorkspace();
    const slashWorkspace = await createWorkspace();
    const input = {
      dependencies: [dependency('native-symlink-test')],
      lambdaRuntimeVersion: 20,
      packageManager: 'npm' as const,
      usedByLambdas: ['function']
    };

    const first = await buildNativeBinaryLayer({
      ...input,
      installationRootPath: firstWorkspace.installationRootPath,
      layerBasePath: firstWorkspace.layerBasePath,
      runDocker: createFakeDocker({ symlinkTarget: 'foo\\bar' }).runDocker
    });
    const second = await buildNativeBinaryLayer({
      ...input,
      installationRootPath: secondWorkspace.installationRootPath,
      layerBasePath: secondWorkspace.layerBasePath,
      runDocker: createFakeDocker({ symlinkTarget: 'foo\\bar' }).runDocker
    });
    const slash = await buildNativeBinaryLayer({
      ...input,
      installationRootPath: slashWorkspace.installationRootPath,
      layerBasePath: slashWorkspace.layerBasePath,
      runDocker: createFakeDocker({ symlinkTarget: 'foo/bar' }).runDocker
    });

    expect(first?.contentHash).toBe(second?.contentHash);
    expect(first?.contentHash).not.toBe(slash?.contentHash);
  });

  test('rebuilds a deleted installation and does not reuse it across roots', async () => {
    const firstWorkspace = await createWorkspace();
    const secondWorkspace = await createWorkspace();
    const { calls, runDocker } = createFakeDocker();
    const dependencies = [dependency('native-installation-root-test')];
    const input = {
      dependencies,
      lambdaRuntimeVersion: 20,
      packageManager: 'npm' as const,
      usedByLambdas: ['function'],
      runDocker
    };

    await buildNativeBinaryLayer({
      ...input,
      installationRootPath: firstWorkspace.installationRootPath,
      layerBasePath: firstWorkspace.layerBasePath
    });
    await rm(firstWorkspace.installationRootPath, { recursive: true, force: true });
    await buildNativeBinaryLayer({
      ...input,
      installationRootPath: firstWorkspace.installationRootPath,
      layerBasePath: join(firstWorkspace.rootPath, 'rebuilt-layer')
    });
    const second = await buildNativeBinaryLayer({
      ...input,
      installationRootPath: secondWorkspace.installationRootPath,
      layerBasePath: secondWorkspace.layerBasePath
    });

    expect(calls).toHaveLength(3);
    expect(calls[0]!.at(-1)).toStartWith(firstWorkspace.installationRootPath);
    expect(calls[1]!.at(-1)).toStartWith(firstWorkspace.installationRootPath);
    expect(calls[2]!.at(-1)).toStartWith(secondWorkspace.installationRootPath);
    expect(await pathExists(join(second!.layerPath, 'nodejs', 'node_modules', 'native-package', 'binding.node'))).toBe(
      true
    );
  });

  test('deduplicates concurrent callers that replace a deleted cached installation', async () => {
    const workspace = await createWorkspace();
    const { calls, runDocker } = createFakeDocker();
    const input = {
      dependencies: [dependency('native-stale-concurrency-test')],
      installationRootPath: workspace.installationRootPath,
      lambdaRuntimeVersion: 20,
      packageManager: 'npm' as const,
      usedByLambdas: ['function'],
      runDocker
    };

    await buildNativeBinaryLayer({
      ...input,
      layerBasePath: join(workspace.rootPath, 'initial-layer')
    });
    await rm(workspace.installationRootPath, { recursive: true, force: true });
    const [first, second] = await Promise.all([
      buildNativeBinaryLayer({
        ...input,
        layerBasePath: join(workspace.rootPath, 'first-rebuilt-layer')
      }),
      buildNativeBinaryLayer({
        ...input,
        layerBasePath: join(workspace.rootPath, 'second-rebuilt-layer')
      })
    ]);

    expect(calls).toHaveLength(2);
    expect(first?.contentHash).toBe(second?.contentHash);
    expect(await pathExists(join(first!.layerPath, 'nodejs', 'node_modules', 'native-package', 'binding.node'))).toBe(
      true
    );
    expect(await pathExists(join(second!.layerPath, 'nodejs', 'node_modules', 'native-package', 'binding.node'))).toBe(
      true
    );
  });

  test('evicts a rejected Docker build so the same installation can be retried', async () => {
    const workspace = await createWorkspace();
    const { calls, runDocker } = createFakeDocker({ rejectedCalls: [1] });
    const input = {
      dependencies: [dependency('native-retry-test')],
      installationRootPath: workspace.installationRootPath,
      lambdaRuntimeVersion: 20,
      packageManager: 'npm' as const,
      usedByLambdas: ['function'],
      runDocker
    };

    await expect(
      buildNativeBinaryLayer({ ...input, layerBasePath: join(workspace.rootPath, 'failed-layer') })
    ).rejects.toThrow('Docker failed on call 1');
    const retried = await buildNativeBinaryLayer({
      ...input,
      layerBasePath: join(workspace.rootPath, 'retried-layer')
    });

    expect(calls).toHaveLength(2);
    expect(await pathExists(join(retried!.layerPath, 'nodejs', 'node_modules', 'native-package', 'binding.node'))).toBe(
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

  test('uses architecture for the build identity without changing the hash of identical layer contents', async () => {
    const workspace = await createWorkspace();
    const { calls, runDocker } = createFakeDocker();
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

    expect(amd64?.contentHash).toBe(arm64?.contentHash);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.at(-1)).not.toBe(calls[1]!.at(-1));
  });
});
