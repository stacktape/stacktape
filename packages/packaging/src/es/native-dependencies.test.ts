import type { RunDocker } from './native-dependencies';
import type { SplitBundleDependency } from '../split-bundler/types';
import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdtemp, rm, symlink, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureDir, pathExists, writeFile } from 'fs-extra';
import { UnsupportedArchiveEntryError } from '../artifact/archive-entries';
import { buildNativeBinaryLayer } from './native-dependencies';

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
  symlinkTarget,
  rejectConcurrent = false,
  executable = false
}: {
  contents?: (callNumber: number) => string | undefined;
  modifiedAt?: Date | undefined;
  rejectedCalls?: number[] | undefined;
  symlinkTarget?: string | undefined;
  /** Installs the native module with its execute bit set, as some packages ship their binaries. */
  executable?: boolean | undefined;
  rejectConcurrent?: boolean;
} = {}) => {
  const calls: string[][] = [];
  let active = false;
  const runDocker: RunDocker = async (commands) => {
    if (rejectConcurrent && active) throw new Error('Concurrent native exporters collided');
    active = true;
    if (rejectConcurrent) await new Promise((resolve) => setTimeout(resolve, 20));
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
    const fileContents = contents(callNumber);
    if (fileContents === undefined) {
      throw new Error(`Fake Docker did not produce contents for call ${callNumber}.`);
    }
    await writeFile(nativeModulePath, fileContents);
    await chmod(nativeModulePath, executable ? 0o755 : 0o644);
    if (symlinkTarget) {
      // The target exists, so the link is a supported one and only its raw target text is under test.
      await ensureDir(join(nodeModulesPath, 'foo'));
      await writeFile(join(nodeModulesPath, 'foo', 'bar'), 'link target');
      await symlink(symlinkTarget, join(nodeModulesPath, 'native-link'));
    }
    active = false;
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
    const workspaces = await Promise.all([createWorkspace(), createWorkspace(), createWorkspace()]);
    const build = (workspace: (typeof workspaces)[number], symlinkTarget: string) =>
      buildNativeBinaryLayer({
        dependencies: [dependency('native-symlink-test')],
        lambdaRuntimeVersion: 20,
        packageManager: 'npm' as const,
        usedByLambdas: ['function'],
        installationRootPath: workspace.installationRootPath,
        layerBasePath: workspace.layerBasePath,
        runDocker: createFakeDocker({ symlinkTarget }).runDocker
      });

    const first = await build(workspaces[0]!, 'foo/bar');
    const second = await build(workspaces[1]!, 'foo/bar');
    // The same file through another spelling: the target text itself is what the layer contains.
    const dotSlash = await build(workspaces[2]!, './foo/bar');

    expect(first?.contentHash).toBe(second?.contentHash);
    expect(first?.contentHash).not.toBe(dotSlash?.contentHash);
  });

  linuxTest(
    'changes the layer identity, and so its S3 key, when only an installed file becomes executable',
    async () => {
      const [plainWorkspace, executableWorkspace] = await Promise.all([createWorkspace(), createWorkspace()]);
      const build = (workspace: typeof plainWorkspace, executable: boolean) =>
        buildNativeBinaryLayer({
          dependencies: [dependency('native-mode-test')],
          lambdaRuntimeVersion: 20,
          packageManager: 'npm',
          usedByLambdas: ['function'],
          installationRootPath: workspace.installationRootPath,
          layerBasePath: workspace.layerBasePath,
          runDocker: createFakeDocker({ executable }).runDocker
        });

      const plain = await build(plainWorkspace, false);
      const executable = await build(executableWorkspace, true);

      expect(executable?.contentHash).not.toBe(plain?.contentHash);
    }
  );

  linuxTest('refuses a symlink target with a backslash instead of normalizing it', async () => {
    const workspace = await createWorkspace();

    await expect(
      buildNativeBinaryLayer({
        dependencies: [dependency('native-backslash-test')],
        lambdaRuntimeVersion: 20,
        packageManager: 'npm',
        usedByLambdas: ['function'],
        installationRootPath: workspace.installationRootPath,
        layerBasePath: workspace.layerBasePath,
        runDocker: createFakeDocker({ symlinkTarget: 'foo\\bar' }).runDocker
      })
    ).rejects.toBeInstanceOf(UnsupportedArchiveEntryError);
  });

  test('deduplicates concurrent callers that replace a deleted cached installation', async () => {
    const workspace = await createWorkspace();
    const { runDocker } = createFakeDocker({ rejectConcurrent: true });
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
    const { runDocker } = createFakeDocker({ rejectedCalls: [1] });
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

    expect(await pathExists(join(retried!.layerPath, 'nodejs', 'node_modules', 'native-package', 'binding.node'))).toBe(
      true
    );
  });
});
