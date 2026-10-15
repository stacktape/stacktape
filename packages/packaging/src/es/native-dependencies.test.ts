/*
 * What a Lambda function or dependency layer gets beside its bundle, from packages installed the way npm and pnpm lay
 * them out. Docker is a stand-in that records what it was asked to install and writes what `npm install` would leave
 * in the Lambda build image; the real image and runtime are exercised by `scripts/synthetic-node-lambda-e2e.ts`.
 */
import type { RunDocker } from './native-dependencies';
import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdtemp, readFile, rm, symlink, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { outputFile, pathExists, readdir } from 'fs-extra';
import { buildNativeBinaryLayer, planLambdaDependencies, writeLambdaDependencies } from './native-dependencies';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const createProject = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-lambda-dependencies-'));
  temporaryDirectories.push(root);
  await outputFile(join(root, 'package.json'), JSON.stringify({ name: 'project', private: true }));
  return root;
};

/** Writes an installed package at `directory` and returns that directory. */
const writePackage = async (
  directory: string,
  manifest: Record<string, unknown> & { name: string; version: string },
  files: Record<string, string> = {}
) => {
  await outputFile(join(directory, 'package.json'), JSON.stringify({ main: 'index.js', ...manifest }));
  await outputFile(join(directory, 'index.js'), `module.exports = ${JSON.stringify(manifest.name)};`);
  await Promise.all(Object.entries(files).map(([path, contents]) => outputFile(join(directory, path), contents)));
  return directory;
};

const external = (path: string, name: string, version = '1.0.0') => ({ name, version, path });

/** A stand-in for the Lambda build image: `npm install` of each requested package, written by `install`. */
const createFakeDocker = (
  install: (nodeModulesPath: string, packageSpec: string, callNumber: number) => Promise<void>,
  { rejectedCalls = [] as number[] } = {}
) => {
  const installedSpecs: string[][] = [];
  const runDocker: RunDocker = async (commands) => {
    const installationPath = commands.at(-1)!;
    const dockerfile = await readFile(join(installationPath, 'Dockerfile'), 'utf8');
    const packageSpecs = dockerfile.match(/RUN npm install --no-audit --no-fund (.+)/)![1]!.split(' ');
    installedSpecs.push(packageSpecs);
    if (rejectedCalls.includes(installedSpecs.length))
      throw new Error(`Docker failed on call ${installedSpecs.length}`);
    for (const packageSpec of packageSpecs) {
      // oxlint-disable-next-line no-await-in-loop -- a handful of packages per installation.
      await install(join(installationPath, 'node_modules'), packageSpec, installedSpecs.length);
    }
  };
  return { installedSpecs, runDocker };
};

const refuseDocker: RunDocker = async () => {
  throw new Error('Docker is not needed for packages already installed for Lambda.');
};

const listPackages = async (nodeModulesPath: string): Promise<string[]> => {
  const names: string[] = [];
  for (const entry of (await readdir(nodeModulesPath)).toSorted()) {
    if (entry.startsWith('@')) {
      // oxlint-disable-next-line no-await-in-loop -- fixtures have one or two scopes.
      for (const scoped of (await readdir(join(nodeModulesPath, entry))).toSorted()) names.push(`${entry}/${scoped}`);
    } else {
      names.push(entry);
    }
  }
  return names;
};

const write = async ({
  dependencies,
  runDocker = refuseDocker
}: {
  dependencies: ReturnType<typeof external>[];
  runDocker?: RunDocker;
}) => {
  const output = await createProject();
  const plan = await planLambdaDependencies({ dependencies, architecture: 'x64' });
  await writeLambdaDependencies({
    plan,
    nodeModulesPath: join(output, 'node_modules'),
    installationRootPath: join(output, 'installations'),
    lambdaRuntimeVersion: 24,
    runDocker
  });
  return { plan, nodeModulesPath: join(output, 'node_modules') };
};

describe('packages the bundle leaves out', () => {
  test('a napi-rs package copies its Lambda binary package and leaves the others behind, without Docker', async () => {
    const root = await createProject();
    const optionalDependencies = {
      'fast-hash-linux-x64-gnu': '1.0.0',
      'fast-hash-linux-x64-musl': '1.0.0',
      'fast-hash-darwin-arm64': '1.0.0'
    };
    const parent = await writePackage(join(root, 'node_modules/fast-hash'), {
      name: 'fast-hash',
      version: '1.0.0',
      optionalDependencies
    });
    for (const [platform, os, cpu, libc] of [
      ['linux-x64-gnu', 'linux', 'x64', 'glibc'],
      ['linux-x64-musl', 'linux', 'x64', 'musl'],
      ['darwin-arm64', 'darwin', 'arm64', undefined]
    ] as const) {
      // oxlint-disable-next-line no-await-in-loop -- three fixture packages.
      await writePackage(
        join(root, `node_modules/fast-hash-${platform}`),
        { name: `fast-hash-${platform}`, version: '1.0.0', os: [os], cpu: [cpu], ...(libc && { libc: [libc] }) },
        { [`fast-hash.${platform}.node`]: platform }
      );
    }

    const { plan, nodeModulesPath } = await write({ dependencies: [external(parent, 'fast-hash')] });

    expect(plan.packagesToInstallForLambda).toEqual([]);
    expect(await listPackages(nodeModulesPath)).toEqual(['fast-hash', 'fast-hash-linux-x64-gnu']);
  });

  test('a napi-rs package installed only for another platform is installed again, at its version', async () => {
    const root = await createProject();
    const parent = await writePackage(join(root, 'node_modules/fast-hash'), {
      name: 'fast-hash',
      version: '2.1.0',
      optionalDependencies: { 'fast-hash-linux-x64-gnu': '2.1.0', 'fast-hash-darwin-arm64': '2.1.0' }
    });
    await writePackage(join(root, 'node_modules/fast-hash-darwin-arm64'), {
      name: 'fast-hash-darwin-arm64',
      version: '2.1.0',
      os: ['darwin'],
      cpu: ['arm64']
    });
    const docker = createFakeDocker(async (nodeModulesPath) => {
      await writePackage(join(nodeModulesPath, 'fast-hash'), {
        name: 'fast-hash',
        version: '2.1.0',
        optionalDependencies: { 'fast-hash-linux-x64-gnu': '2.1.0', 'fast-hash-darwin-arm64': '2.1.0' }
      });
      await writePackage(
        join(nodeModulesPath, 'fast-hash-linux-x64-gnu'),
        { name: 'fast-hash-linux-x64-gnu', version: '2.1.0', os: ['linux'], cpu: ['x64'], libc: ['glibc'] },
        { 'fast-hash.linux-x64-gnu.node': 'linux' }
      );
    });

    const { nodeModulesPath } = await write({
      dependencies: [external(parent, 'fast-hash', '2.1.0')],
      runDocker: docker.runDocker
    });

    expect(docker.installedSpecs).toEqual([['fast-hash@2.1.0']]);
    expect(await listPackages(nodeModulesPath)).toEqual(['fast-hash', 'fast-hash-linux-x64-gnu']);
  });

  test('a scoped package brings its dependencies from a pnpm store, with a conflicting version kept beside it', async () => {
    const root = await createProject();
    const store = join(root, 'node_modules/.pnpm');
    // pnpm links each package's dependencies next to it inside the store; nothing is hoisted.
    const scoped = await writePackage(join(store, '@acme+client@1.0.0/node_modules/@acme/client'), {
      name: '@acme/client',
      version: '1.0.0',
      dependencies: { '@acme/core': '1.0.0', 'left-pad': '2.0.0' }
    });
    const core = await writePackage(join(store, '@acme+core@1.0.0/node_modules/@acme/core'), {
      name: '@acme/core',
      version: '1.0.0',
      dependencies: { 'left-pad': '1.0.0' }
    });
    const leftPadOne = await writePackage(join(store, 'left-pad@1.0.0/node_modules/left-pad'), {
      name: 'left-pad',
      version: '1.0.0'
    });
    const leftPadTwo = await writePackage(join(store, 'left-pad@2.0.0/node_modules/left-pad'), {
      name: 'left-pad',
      version: '2.0.0'
    });
    await symlink(core, join(dirname(scoped), 'core'));
    await symlink(leftPadTwo, join(dirname(dirname(scoped)), 'left-pad'));
    await symlink(leftPadOne, join(dirname(dirname(core)), 'left-pad'));

    const { nodeModulesPath } = await write({ dependencies: [external(scoped, '@acme/client')] });

    expect(await listPackages(nodeModulesPath)).toEqual(['@acme/client', '@acme/core', 'left-pad']);
    const nestedLeftPad = join(nodeModulesPath, '@acme/core/node_modules/left-pad/package.json');
    expect(JSON.parse(await readFile(nestedLeftPad, 'utf8')).version).toBe('1.0.0');
    expect(JSON.parse(await readFile(join(nodeModulesPath, 'left-pad/package.json'), 'utf8')).version).toBe('2.0.0');
  });

  test.each([
    ['an addon compiled into build/', { 'build/Release/addon.node': 'compiled here' }, true],
    ['prebuilds for Lambda', { 'prebuilds/linux-x64/addon.glibc.node': 'prebuilt' }, false],
    ['prebuilds for other platforms only', { 'prebuilds/darwin-arm64/addon.node': 'prebuilt' }, true],
    ['an install script and no addon', {}, false]
  ] as const)('a native package with %s is installed again: %p', async (_label, files, installedAgain) => {
    const root = await createProject();
    const addon = await writePackage(
      join(root, 'node_modules/addon'),
      { name: 'addon', version: '3.0.0', scripts: { install: 'node-gyp-build' } },
      files
    );
    const docker = createFakeDocker(async (nodeModulesPath) => {
      await writePackage(join(nodeModulesPath, 'addon'), { name: 'addon', version: '3.0.0' }, files);
    });

    const { plan } = await write({ dependencies: [external(addon, 'addon', '3.0.0')], runDocker: docker.runDocker });

    expect(plan.packagesToInstallForLambda.length > 0).toBe(installedAgain);
    expect(docker.installedSpecs).toEqual(installedAgain ? [['addon@3.0.0']] : []);
  });
});

describe('the dependency layer of a split build', () => {
  /** A package that builds its addon at install time; the stand-in image writes `binary` as the addon. */
  const buildLayer = async ({
    binary = 'native-binary',
    modifiedAt,
    executable = false,
    runDocker,
    layerName = 'layer-native',
    project
  }: {
    binary?: string;
    modifiedAt?: Date;
    executable?: boolean;
    runDocker?: RunDocker;
    layerName?: string;
    /** Builds sharing a project share its installation directory. */
    project?: string;
  } = {}) => {
    const root = project ?? (await createProject());
    const installed = await writePackage(
      join(root, 'node_modules/native-package'),
      { name: 'native-package', version: '1.2.3', gypfile: true },
      { 'binding.gyp': '{}' }
    );
    const dependencies = [external(installed, 'native-package', '1.2.3')];
    const docker =
      runDocker ??
      createFakeDocker(async (nodeModulesPath) => {
        const addon = join(nodeModulesPath, 'native-package/build/Release/binding.node');
        await writePackage(join(nodeModulesPath, 'native-package'), { name: 'native-package', version: '1.2.3' });
        await outputFile(addon, binary);
        await chmod(addon, executable ? 0o755 : 0o644);
        if (modifiedAt) await utimes(addon, modifiedAt, modifiedAt);
      }).runDocker;
    return buildNativeBinaryLayer({
      dependencies,
      plan: await planLambdaDependencies({ dependencies, architecture: 'x64' }),
      installationRootPath: join(root, 'installations'),
      layerBasePath: join(root, 'layers'),
      lambdaRuntimeVersion: 24,
      usedByLambdas: ['function'],
      layerName,
      runDocker: docker
    });
  };

  test('is identified by the bytes it contains, not by how they were produced', async () => {
    const [first, sameLength, earlier, later] = await Promise.all([
      buildLayer({ binary: 'first-native-binary' }),
      buildLayer({ binary: 'other-native-binary' }),
      buildLayer({ modifiedAt: new Date('2020-01-01T00:00:00Z') }),
      buildLayer({ modifiedAt: new Date('2030-01-01T00:00:00Z') })
    ]);

    expect(first.contentHash).toMatch(/^[a-f0-9]{12}$/);
    expect(first.contentHash).not.toBe(sameLength.contentHash);
    expect(earlier.contentHash).toBe(later.contentHash);
  });

  test('changes its identity, and so its S3 key, when only an installed file becomes executable', async () => {
    const [plain, executable] = await Promise.all([buildLayer(), buildLayer({ executable: true })]);
    expect(executable.contentHash).not.toBe(plain.contentHash);
  });

  test('shares one installation between concurrent builds and retries one that failed', async () => {
    let concurrent = 0;
    const docker = createFakeDocker(
      async (nodeModulesPath) => {
        concurrent += 1;
        if (concurrent > 1) throw new Error('Concurrent installations collided');
        await Bun.sleep(20);
        await writePackage(join(nodeModulesPath, 'native-package'), { name: 'native-package', version: '1.2.3' });
        await outputFile(join(nodeModulesPath, 'native-package/build/Release/binding.node'), 'binary');
        concurrent -= 1;
      },
      { rejectedCalls: [1] }
    );

    const project = await createProject();

    await expect(buildLayer({ runDocker: docker.runDocker, project })).rejects.toThrow('Docker failed on call 1');
    const [first, second] = await Promise.all([
      buildLayer({ runDocker: docker.runDocker, project, layerName: 'first' }),
      buildLayer({ runDocker: docker.runDocker, project, layerName: 'second' })
    ]);

    expect(docker.installedSpecs).toHaveLength(2);
    expect(first.contentHash).toBe(second.contentHash);
    const addon = 'nodejs/node_modules/native-package/build/Release/binding.node';
    expect(await Promise.all([first, second].map((layer) => pathExists(join(layer.layerPath, addon))))).toEqual([
      true,
      true
    ]);
  });
});
