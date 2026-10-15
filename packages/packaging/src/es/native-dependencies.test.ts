/*
 * What a Lambda function or dependency layer gets beside its bundle, from packages installed the way npm and pnpm lay
 * them out. Docker is a stand-in that records what it was asked to install and writes what `npm install` would leave
 * in the Lambda build image; the real image and runtime are exercised by `scripts/synthetic-node-lambda-e2e.ts`.
 */
import type { RunDocker } from './native-dependencies';
import { afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, symlink, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ensureDir, outputFile, pathExists, readdir } from 'fs-extra';
import {
  buildNativeBinaryLayer,
  getLambdaDependencyIdentity,
  planLambdaDependencies,
  writeLambdaDependencies
} from './native-dependencies';
import { getNativeReason, isInstalledForLambda } from './native-packages';

const temporaryDirectories: string[] = [];
const posixTest = process.platform === 'win32' ? test.skip : test;

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
  runDocker = refuseDocker,
  excludedNames
}: {
  dependencies: ReturnType<typeof external>[];
  runDocker?: RunDocker;
  excludedNames?: string[];
}) => {
  const output = await createProject();
  const plan = await planLambdaDependencies({ dependencies, architecture: 'x64', excludedNames });
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

/**
 * A pnpm-style store: each package's real directory sits in `node_modules/.pnpm/<id>/node_modules/<name>`, next to
 * links named after its dependencies. Every package reports its version and what its dependencies report, so running
 * the artifact shows which installation each `require()` reached.
 */
const createStore = async () => {
  const root = await createProject();
  const storePackage = async ({
    id,
    name,
    version,
    dependencies = {},
    manifest = {},
    files = {}
  }: {
    id: string;
    name: string;
    version: string;
    /** The name each dependency is required by, and the store directory of the package it resolves to. */
    dependencies?: Record<string, string>;
    manifest?: Record<string, unknown>;
    files?: Record<string, string>;
  }) => {
    const directory = join(root, 'node_modules/.pnpm', id, 'node_modules', name);
    const requires = Object.keys(dependencies)
      .map((dependency) => `${JSON.stringify(dependency)}: require(${JSON.stringify(dependency)})`)
      .join(', ');
    await writePackage(
      directory,
      {
        name,
        version,
        dependencies: Object.fromEntries(Object.keys(dependencies).map((dependency) => [dependency, '*'])),
        ...manifest
      },
      { 'index.js': `module.exports = { version: ${JSON.stringify(version)}, uses: { ${requires} } };`, ...files }
    );
    const siblings = join(root, 'node_modules/.pnpm', id, 'node_modules');
    for (const [dependency, target] of Object.entries(dependencies)) {
      // oxlint-disable-next-line no-await-in-loop -- a handful of links.
      await ensureDir(dirname(join(siblings, dependency)));
      // oxlint-disable-next-line no-await-in-loop -- see above.
      await symlink(target, join(siblings, dependency));
    }
    return directory;
  };
  return { root, storePackage };
};

/** Runs `script` in a directory with Node.js, which resolves modules from that directory's `node_modules`. */
const runIn = (directory: string, script: string) => {
  const execution = spawnSync(process.env.npm_node_execpath || 'node', ['-e', script], {
    cwd: directory,
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: '' }
  });
  expect(execution.stderr).toBe('');
  return JSON.parse(execution.stdout) as unknown;
};

describe('the node_modules a function gets', () => {
  test('every package loads the installation it loaded here', async () => {
    const { storePackage } = await createStore();
    const b1 = await storePackage({ id: 'b@1', name: 'b', version: '1.0.0' });
    const d1 = await storePackage({ id: 'd@1', name: 'd', version: '1.0.0' });
    const d2 = await storePackage({ id: 'd@2', name: 'd', version: '2.0.0', dependencies: { b: b1 } });
    const b2 = await storePackage({ id: 'b@2', name: 'b', version: '2.0.0', dependencies: { d: d2 } });
    const a = await storePackage({ id: 'a@1', name: 'a', version: '1.0.0', dependencies: { b: b2 } });
    // One version of `plugin`, installed twice by pnpm because two consumers give it different peers.
    const react18 = await storePackage({ id: 'react@18', name: 'react', version: '18.0.0' });
    const react19 = await storePackage({ id: 'react@19', name: 'react', version: '19.0.0' });
    const plugin18 = await storePackage({
      id: 'plugin@1_react@18',
      name: 'plugin',
      version: '1.0.0',
      dependencies: { react: react18 }
    });
    const plugin19 = await storePackage({
      id: 'plugin@1_react@19',
      name: 'plugin',
      version: '1.0.0',
      dependencies: { react: react19 }
    });
    const old = await storePackage({ id: 'old@1', name: 'old', version: '1.0.0', dependencies: { plugin: plugin18 } });
    const next = await storePackage({
      id: 'next@1',
      name: 'next',
      version: '1.0.0',
      dependencies: { plugin: plugin19 }
    });

    const { nodeModulesPath } = await write({
      dependencies: [
        external(a, 'a'),
        external(b1, 'b'),
        external(d1, 'd'),
        external(old, 'old'),
        external(next, 'next')
      ]
    });

    expect(
      runIn(
        dirname(nodeModulesPath),
        "console.log(JSON.stringify(['a', 'b', 'd', 'old', 'next'].map((name) => require(name))))"
      )
    ).toEqual([
      {
        version: '1.0.0',
        uses: {
          b: { version: '2.0.0', uses: { d: { version: '2.0.0', uses: { b: { version: '1.0.0', uses: {} } } } } }
        }
      },
      { version: '1.0.0', uses: {} },
      { version: '1.0.0', uses: {} },
      { version: '1.0.0', uses: { plugin: { version: '1.0.0', uses: { react: { version: '18.0.0', uses: {} } } } } },
      { version: '1.0.0', uses: { plugin: { version: '1.0.0', uses: { react: { version: '19.0.0', uses: {} } } } } }
    ]);
  });

  test('an npm alias keeps the name it is required by, and package commands keep their .bin links', async () => {
    const { storePackage } = await createStore();
    const leftPad = await storePackage({ id: 'left-pad@1.3.0', name: 'left-pad', version: '1.3.0' });
    const tool = await storePackage({
      id: 'tool@1',
      name: 'tool',
      version: '1.0.0',
      dependencies: { 'pad-alias': leftPad },
      manifest: { bin: { 'tool-command': 'cli.js' } },
      files: { 'cli.js': "#!/usr/bin/env node\nconsole.log(JSON.stringify(require('pad-alias').version));\n" }
    });
    await chmod(join(tool, 'cli.js'), 0o755);

    const { nodeModulesPath } = await write({ dependencies: [external(tool, 'tool')] });

    expect(
      runIn(dirname(nodeModulesPath), "console.log(JSON.stringify(require('tool').uses['pad-alias'].version))")
    ).toBe('1.3.0');
    if (process.platform !== 'win32') {
      const command = spawnSync(join(nodeModulesPath, '.bin', 'tool-command'), { encoding: 'utf8' });
      expect(command.stdout.trim()).toBe('"1.3.0"');
    }
  });

  test('a package excluded from the deployment stays out even when a copied package depends on it', async () => {
    const { storePackage } = await createStore();
    const excluded = await storePackage({ id: 'excluded@1', name: 'excluded', version: '1.0.0' });
    const kept = await storePackage({ id: 'kept@1', name: 'kept', version: '1.0.0', dependencies: { excluded } });

    const { nodeModulesPath } = await write({ dependencies: [external(kept, 'kept')], excludedNames: ['excluded'] });

    expect(await listPackages(nodeModulesPath)).toEqual(['kept']);
  });

  test('a copied package edited in place is a new artifact; the same files elsewhere are not', async () => {
    const identity = async (contents: string) => {
      const { storePackage } = await createStore();
      const kept = await storePackage({
        id: 'kept@1',
        name: 'kept',
        version: '1.0.0',
        files: { 'data.txt': contents }
      });
      return getLambdaDependencyIdentity(
        await planLambdaDependencies({ dependencies: [external(kept, 'kept')], architecture: 'x64' })
      );
    };
    const [first, sameFilesElsewhere, edited] = await Promise.all([identity('a'), identity('a'), identity('b')]);

    expect(sameFilesElsewhere).toEqual(first);
    expect(edited).not.toEqual(first);
  });

  test('a native package installed again keeps the dependency versions installed here', async () => {
    const { storePackage } = await createStore();
    const helper = await storePackage({ id: 'helper@1.0.1', name: 'helper', version: '1.0.1' });
    const native = await storePackage({
      id: 'native@1',
      name: 'native',
      version: '1.0.0',
      dependencies: { helper },
      manifest: { gypfile: true, optionalDependencies: { 'native-linux-x64-gnu': '1.0.0' } }
    });
    // A fresh resolution in the image picks a newer helper; only the rebuilt package and its Lambda binary may be used.
    const docker = createFakeDocker(async (nodeModulesPath) => {
      await writePackage(
        join(nodeModulesPath, 'native'),
        {
          name: 'native',
          version: '1.0.0',
          dependencies: { helper: '^1.0.0' },
          optionalDependencies: { 'native-linux-x64-gnu': '1.0.0' }
        },
        {
          'index.js':
            "module.exports = { helper: require('helper').version, binary: require('native-linux-x64-gnu') };",
          'build/Release/native.node': 'built in the image'
        }
      );
      await writePackage(
        join(nodeModulesPath, 'helper'),
        { name: 'helper', version: '1.0.2' },
        { 'index.js': "module.exports = { version: '1.0.2' };" }
      );
      await writePackage(
        join(nodeModulesPath, 'native-linux-x64-gnu'),
        { name: 'native-linux-x64-gnu', version: '1.0.0', os: ['linux'], cpu: ['x64'], libc: ['glibc'] },
        { 'index.js': "module.exports = 'linux binary';" }
      );
    });

    const { nodeModulesPath } = await write({
      dependencies: [external(native, 'native')],
      runDocker: docker.runDocker
    });

    expect(docker.installedSpecs).toEqual([['native@1.0.0']]);
    expect(runIn(dirname(nodeModulesPath), "console.log(JSON.stringify(require('native')))")).toEqual({
      helper: '1.0.1',
      binary: 'linux binary'
    });
  });
});

describe('which installed packages are native', () => {
  const hostIsLambdaX64 =
    process.platform === 'linux' && process.arch === 'x64' && Boolean(process.report?.getReport());

  test.each([
    ['a pure JavaScript package with a postinstall message', { postinstall: 'echo thanks' }, {}, undefined],
    [
      'an install script that downloaded an executable',
      { install: 'node install.js' },
      { ffmpeg: '\x7fELF' },
      'contains executables'
    ]
  ] as const)('%s', async (_label, scripts, files, expectedReason) => {
    const root = await createProject();
    const installed = await writePackage(
      join(root, 'node_modules/tool'),
      { name: 'tool', version: '1.0.0', scripts },
      files
    );

    expect(await getNativeReason(installed)).toBe(expectedReason);
    if (expectedReason) {
      // The executable was downloaded for this machine, so it is used only when this machine is Lambda's platform.
      expect(await isInstalledForLambda(installed, 'x64')).toBe(hostIsLambdaX64);
      expect(await isInstalledForLambda(installed, 'arm64')).toBe(
        process.platform === 'linux' && process.arch === 'arm64'
      );
    }
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

  // Windows records no execute bit, so there the archive decides executability from file headers instead.
  posixTest('changes its identity, and so its S3 key, when only an installed file becomes executable', async () => {
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
