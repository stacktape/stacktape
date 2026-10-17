/*
 * What a Lambda function or dependency layer gets beside its bundle, from packages installed the way npm and pnpm lay
 * them out. Most tests run the written `node_modules` with Node.js, which is what Lambda does with it. Docker is a
 * stand-in that records the `package.json` it was asked to install and writes what `npm install` would leave in the
 * Lambda build image; the real image and runtime are exercised by `scripts/synthetic-node-lambda-e2e.ts`, and the CLI's
 * `test:node-lambda` runs a pnpm-linked package from an extracted ZIP in the Lambda runtime.
 */
import type { RunDocker } from './native-dependencies';
import { afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, rename, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ensureDir, outputFile, pathExists } from 'fs-extra';
import {
  buildNativeBinaryLayer,
  getLambdaDependencyIdentity,
  planLambdaDependencies,
  writeLambdaDependencies
} from './native-dependencies';
import { createPackageAnalysisCache } from './installed-packages';
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

/**
 * Writes an installed package at `directory` and returns that directory. Its `index.js` reports its version and can
 * require any of its dependencies, so a test can follow the resolution chain without loading a cycle eagerly.
 */
const writePackage = async (
  directory: string,
  manifest: Record<string, unknown> & { name: string; version: string },
  files: Record<string, string> = {}
) => {
  await outputFile(join(directory, 'package.json'), JSON.stringify({ main: 'index.js', ...manifest }));
  await outputFile(
    join(directory, 'index.js'),
    `exports.version = ${JSON.stringify(manifest.version)}; exports.dep = (name) => require(name);`
  );
  await Promise.all(Object.entries(files).map(([path, contents]) => outputFile(join(directory, path), contents)));
  return directory;
};

const external = (path: string, name: string, version = '1.0.0') => ({ name, version, path });

/**
 * A pnpm-style store: each package's real directory sits in `node_modules/.pnpm/<id>/node_modules/<name>`, next to
 * links named after its dependencies.
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
    /** The name each dependency is required by, and the store directory it resolves to. */
    dependencies?: Record<string, string>;
    manifest?: Record<string, unknown>;
    files?: Record<string, string>;
  }) => {
    const siblings = join(root, 'node_modules/.pnpm', id, 'node_modules');
    const directory = await writePackage(
      join(siblings, name),
      {
        name,
        version,
        dependencies: Object.fromEntries(Object.keys(dependencies).map((dependency) => [dependency, '*'])),
        ...manifest
      },
      files
    );
    for (const [dependency, target] of Object.entries(dependencies)) {
      // oxlint-disable-next-line no-await-in-loop -- a handful of links.
      await link(target, join(siblings, dependency));
    }
    return directory;
  };
  return { root, storePackage };
};

/** Declares and links a dependency of a stored package after the fact, as a cycle needs. */
const addDependency = async (packageDirectory: string, name: string, target: string) => {
  const manifestPath = join(packageDirectory, 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  await writeFile(
    manifestPath,
    JSON.stringify({ ...manifest, dependencies: { ...manifest.dependencies, [name]: '*' } })
  );
  await link(target, join(dirname(packageDirectory), name));
};

const link = async (target: string, path: string) => {
  await ensureDir(dirname(path));
  await symlink(target, path, process.platform === 'win32' ? 'junction' : 'dir');
};

/** A stand-in for the Lambda build image: `install` writes what `npm install` of the given `package.json` leaves. */
const createFakeDocker = (
  install: (nodeModulesPath: string, manifest: { dependencies: Record<string, string> }) => Promise<void>,
  { rejectedCalls = [] as number[] } = {}
) => {
  const installedManifests: { dependencies: Record<string, string>; overrides: Record<string, string> }[] = [];
  const runDocker: RunDocker = async (commands) => {
    const installationPath = commands.at(-1)!;
    const manifest = JSON.parse(await readFile(join(installationPath, 'package.json'), 'utf8'));
    installedManifests.push(manifest);
    if (rejectedCalls.includes(installedManifests.length)) {
      throw new Error(`Docker failed on call ${installedManifests.length}`);
    }
    await install(join(installationPath, 'node_modules'), manifest);
  };
  return { installedManifests, runDocker };
};

const refuseDocker: RunDocker = async () => {
  throw new Error('Docker is not needed for packages already installed for Lambda.');
};

const write = async ({
  dependencies,
  runDocker = refuseDocker,
  excludedNames,
  withoutSourceMaps
}: {
  dependencies: ReturnType<typeof external>[];
  runDocker?: RunDocker;
  excludedNames?: string[];
  withoutSourceMaps?: boolean;
}) => {
  const output = await createProject();
  const plan = await planLambdaDependencies({
    dependencies,
    productionDependencies: new Set(),
    architecture: 'x64',
    excludedNames,
    withoutSourceMaps
  });
  await writeLambdaDependencies({
    plan,
    nodeModulesPath: join(output, 'node_modules'),
    installationRootPath: join(output, 'installations'),
    lambdaRuntimeVersion: 24,
    runDocker
  });
  return { plan, artifact: output };
};

/** Runs `script` with Node.js in a directory, as Lambda runs a handler from `/var/task`, and parses what it prints. */
const runIn = (directory: string, script: string) => {
  const execution = spawnSync(process.env.npm_node_execpath || 'node', ['-e', script], {
    cwd: directory,
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: '' }
  });
  expect(execution.stderr).toBe('');
  return JSON.parse(execution.stdout) as unknown;
};

/** Pretends this machine is another platform for the duration of `run`. */
const onHost = async <Value>(platform: NodeJS.Platform, run: () => Promise<Value>) => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: platform });
  try {
    return await run();
  } finally {
    Object.defineProperty(process, 'platform', { value: original });
  }
};

const ELF_X64 = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0, ...Array(10).fill(0), 0x3e, 0]);
const MACH_O = Buffer.from([0xcf, 0xfa, 0xed, 0xfe, ...Array(16).fill(0)]);

describe('packages the bundle leaves out', () => {
  test('a napi-rs package copies its Lambda binary package and leaves the others behind, without Docker', async () => {
    const root = await createProject();
    const parent = await writePackage(join(root, 'node_modules/fast-hash'), {
      name: 'fast-hash',
      version: '1.0.0',
      optionalDependencies: {
        'fast-hash-linux-x64-gnu': '1.0.0',
        'fast-hash-linux-x64-musl': '1.0.0',
        'fast-hash-darwin-arm64': '1.0.0'
      }
    });
    for (const [platform, os, cpu, libc] of [
      ['linux-x64-gnu', 'linux', 'x64', 'glibc'],
      ['linux-x64-musl', 'linux', 'x64', 'musl'],
      ['darwin-arm64', 'darwin', 'arm64', undefined]
    ] as const) {
      // oxlint-disable-next-line no-await-in-loop -- three fixture packages.
      await writePackage(join(root, `node_modules/fast-hash-${platform}`), {
        name: `fast-hash-${platform}`,
        version: '1.0.0',
        os: [os],
        cpu: [cpu],
        ...(libc && { libc: [libc] })
      });
    }

    const { plan, artifact } = await write({ dependencies: [external(parent, 'fast-hash')] });

    expect(plan.packagesToInstallForLambda).toEqual([]);
    expect(
      runIn(artifact, "console.log(JSON.stringify(require('fast-hash').dep('fast-hash-linux-x64-gnu').version))")
    ).toBe('1.0.0');
    expect(await pathExists(join(artifact, 'node_modules/fast-hash-linux-x64-musl'))).toBe(false);
    expect(await pathExists(join(artifact, 'node_modules/fast-hash-darwin-arm64'))).toBe(false);
  });

  test.each([
    ['an addon compiled into build/', { 'build/Release/addon.node': 'compiled here' }, true],
    ['prebuilds for Lambda', { 'prebuilds/linux-x64/addon.glibc.node': 'prebuilt' }, false],
    ['prebuilds for other platforms only', { 'prebuilds/darwin-arm64/addon.node': 'prebuilt' }, true]
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
    expect(docker.installedManifests.map(({ dependencies }) => dependencies)).toEqual(
      installedAgain ? [{ addon: '3.0.0' }] : []
    );
  });
});

describe('the node_modules a function gets', () => {
  test('every package loads the installation it loaded here, once, also through a cycle', async () => {
    const { storePackage } = await createStore();
    const b1 = await storePackage({ id: 'b@1', name: 'b', version: '1.0.0' });
    const d1 = await storePackage({ id: 'd@1', name: 'd', version: '1.0.0' });
    const d2 = await storePackage({ id: 'd@2', name: 'd', version: '2.0.0', dependencies: { b: b1 } });
    const b2 = await storePackage({ id: 'b@2', name: 'b', version: '2.0.0', dependencies: { d: d2 } });
    const a1 = await storePackage({ id: 'a@1', name: 'a', version: '1.0.0', dependencies: { b: b2 } });
    // a2 -> b1 -> a1 closes the cycle a1 -> b2 -> a2 -> b1 -> a1.
    const a2 = await storePackage({ id: 'a@2', name: 'a', version: '2.0.0', dependencies: { b: b1 } });
    await addDependency(b2, 'a', a2);
    await addDependency(b1, 'a', a1);
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

    const { artifact } = await write({
      dependencies: [
        external(a1, 'a'),
        external(b1, 'b'),
        external(d1, 'd'),
        external(old, 'old'),
        external(next, 'next')
      ]
    });

    expect(
      runIn(
        artifact,
        `const a = require('a'), b = require('b');
        console.log(JSON.stringify({
          chain: [a.version, a.dep('b').version, a.dep('b').dep('d').version, a.dep('b').dep('d').dep('b').version],
          cycle: [a.dep('b').dep('a').version, a.dep('b').dep('a').dep('b').version, a.dep('b').dep('a').dep('b').dep('a') === a],
          sameInstance: a.dep('b').dep('d').dep('b') === b,
          top: [b.version, require('d').version],
          peers: [require('old').dep('plugin').dep('react').version, require('next').dep('plugin').dep('react').version]
        }))`
      )
    ).toEqual({
      chain: ['1.0.0', '2.0.0', '2.0.0', '1.0.0'],
      cycle: ['2.0.0', '1.0.0', true],
      sameInstance: true,
      top: ['1.0.0', '1.0.0'],
      peers: ['18.0.0', '19.0.0']
    });
  });

  test('an npm alias keeps the name it is required by, and package commands keep their .bin links', async () => {
    const root = await createProject();
    // As npm installs `"pad-alias": "npm:left-pad@1.3.0"` and a package with a command.
    await writePackage(join(root, 'node_modules/pad-alias'), { name: 'left-pad', version: '1.3.0' });
    const tool = await writePackage(
      join(root, 'node_modules/tool'),
      {
        name: 'tool',
        version: '1.0.0',
        dependencies: { 'pad-alias': 'npm:left-pad@1.3.0' },
        bin: { 'tool-command': 'cli.js' }
      },
      { 'cli.js': "#!/usr/bin/env node\nconsole.log(JSON.stringify(require('pad-alias').version));\n" }
    );
    await chmod(join(tool, 'cli.js'), 0o755);
    await link('../tool/cli.js', join(root, 'node_modules/.bin/tool-command'));

    const { artifact } = await write({ dependencies: [external(tool, 'tool')] });

    expect(runIn(artifact, "console.log(JSON.stringify(require('tool').dep('pad-alias').version))")).toBe('1.3.0');
    if (process.platform !== 'win32') {
      const command = spawnSync(join(artifact, 'node_modules/.bin/tool-command'), { encoding: 'utf8' });
      expect(command.stdout.trim()).toBe('"1.3.0"');
    }
  });

  test('a package excluded from the deployment stays out even when a copied package depends on it', async () => {
    const { storePackage } = await createStore();
    const excluded = await storePackage({ id: 'excluded@1', name: 'excluded', version: '1.0.0' });
    const kept = await storePackage({ id: 'kept@1', name: 'kept', version: '1.0.0', dependencies: { excluded } });

    const { plan } = await write({
      dependencies: [external(kept, 'kept'), external(excluded, 'excluded')],
      excludedNames: ['excluded']
    });

    expect([...plan.packages.values()].map(({ name }) => name)).toEqual(['kept']);
    expect(plan.layout.links.map(({ path }) => path)).toEqual(['node_modules/kept']);
  });
});

describe('a workspace function and native packages built again', () => {
  test('a workspace package gets the version from its own node_modules, while a root package keeps the root one', async () => {
    const root = await createProject();
    // npm workspaces: shared@1 at the root, shared@2 only for the function's package.
    await writePackage(join(root, 'node_modules/shared'), { name: 'shared', version: '1.0.0' });
    const other = await writePackage(join(root, 'node_modules/other'), {
      name: 'other',
      version: '1.0.0',
      dependencies: { shared: '1.0.0' }
    });
    const shared2 = await writePackage(join(root, 'apps/api/node_modules/shared'), {
      name: 'shared',
      version: '2.0.0'
    });

    const { artifact } = await write({
      dependencies: [external(shared2, 'shared', '2.0.0'), external(other, 'other')]
    });

    expect(
      runIn(
        artifact,
        "console.log(JSON.stringify([require('shared').version, require('other').dep('shared').version]))"
      )
    ).toEqual(['2.0.0', '1.0.0']);
  });

  test('two versions of one addon that both need building are built and copied separately', async () => {
    const { storePackage } = await createStore();
    const nativeVersion = (version: string) =>
      storePackage({ id: `native@${version}`, name: 'native', version, manifest: { gypfile: true } });
    const native1 = await nativeVersion('1.0.0');
    const native2 = await nativeVersion('2.0.0');
    const old = await storePackage({ id: 'old@1', name: 'old', version: '1.0.0', dependencies: { native: native1 } });
    const next = await storePackage({
      id: 'next@1',
      name: 'next',
      version: '1.0.0',
      dependencies: { native: native2 }
    });
    const docker = createFakeDocker(async (nodeModulesPath, { dependencies }) => {
      await writePackage(
        join(nodeModulesPath, 'native'),
        { name: 'native', version: dependencies.native! },
        {
          'index.js': `exports.version = ${JSON.stringify(dependencies.native)}; exports.builtInImage = true;`
        }
      );
    });

    const { artifact } = await write({
      dependencies: [external(old, 'old'), external(next, 'next')],
      runDocker: docker.runDocker
    });

    expect(docker.installedManifests.map(({ dependencies }) => dependencies)).toEqual([
      { native: '1.0.0' },
      { native: '2.0.0' }
    ]);
    expect(
      runIn(
        artifact,
        "const native = (name) => require(name).dep('native'); console.log(JSON.stringify([native('old'), native('next')]))"
      )
    ).toEqual([
      { version: '1.0.0', builtInImage: true },
      { version: '2.0.0', builtInImage: true }
    ]);
  });
});

describe('source maps of installed packages', () => {
  const files = {
    'dist/main.cjs': 'module.exports = 1;\n//# sourceMappingURL=main.cjs.map',
    'dist/main.cjs.map': '{"version":3,"sources":[],"mappings":""}',
    'dist/types.d.ts': 'export {};\n//# sourceMappingURL=types.d.ts.map\n',
    'dist/types.d.ts.map': '{"version":3,"sources":[],"mappings":""}',
    'dist/style.css': '/*# sourceMappingURL=../maps/style.css.map */',
    'maps/style.css.map': '{"version":3,"sources":[],"mappings":""}',
    'theme/data.css': 'a { color: red; }',
    'theme/data.css.map': 'a data file the package reads',
    'data/world.map': 'a data file the package reads',
    // Code that names the map only in a string, as text it writes, then reads the "map" as data.
    'lib/annotate.js':
      "module.exports = require('fs').readFileSync(__filename + '.map', 'utf8');\nconst annotation = '//# sourceMappingURL=annotate.js.map';\n",
    'lib/annotate.js.map': 'a data file the package reads'
  };

  test('are left out of a function that runs without them, while other .map files stay', async () => {
    const { storePackage } = await createStore();
    const kept = await storePackage({ id: 'kept@1', name: 'kept', version: '1.0.0', files });

    const { artifact } = await write({ dependencies: [external(kept, 'kept')], withoutSourceMaps: true });
    const copied = join(artifact, 'node_modules', 'kept');

    expect(await pathExists(join(copied, 'dist', 'main.cjs'))).toBe(true);
    expect(await pathExists(join(copied, 'dist', 'main.cjs.map'))).toBe(false);
    expect(await pathExists(join(copied, 'dist', 'types.d.ts.map'))).toBe(false);
    // Only a map its sibling names goes: this one is named from elsewhere, and `data.css` names none.
    expect(await pathExists(join(copied, 'maps', 'style.css.map'))).toBe(true);
    expect(await pathExists(join(copied, 'theme', 'data.css.map'))).toBe(true);
    expect(await pathExists(join(copied, 'data', 'world.map'))).toBe(true);
    expect(runIn(artifact, "console.log(JSON.stringify(require('kept/dist/main.cjs')))")).toBe(1);
    // Only a comment on the last line names a map; the same text in a string is the package's own data.
    expect(runIn(artifact, "console.log(JSON.stringify(require('kept/lib/annotate.js')))")).toBe(
      'a data file the package reads'
    );
  });

  test('are copied when the function keeps its maps, and only then decide the identity', async () => {
    const { storePackage } = await createStore();
    const kept = await storePackage({ id: 'kept@1', name: 'kept', version: '1.0.0', files });
    const identity = async (withoutSourceMaps: boolean) =>
      getLambdaDependencyIdentity(
        await planLambdaDependencies({
          dependencies: [external(kept, 'kept')],
          productionDependencies: new Set(),
          architecture: 'x64',
          withoutSourceMaps
        })
      );

    const { artifact } = await write({ dependencies: [external(kept, 'kept')] });
    expect(await pathExists(join(artifact, 'node_modules', 'kept', 'dist', 'main.cjs.map'))).toBe(true);

    const [withMaps, withoutMaps] = [await identity(false), await identity(true)];
    expect(withoutMaps).not.toEqual(withMaps);
    await writeFile(join(kept, 'dist', 'main.cjs.map'), '{"version":3,"sources":["changed"],"mappings":""}');
    expect(await identity(true)).toEqual(withoutMaps);
    expect(await identity(false)).not.toEqual(withMaps);
  });
});

describe('what identifies the copied packages', () => {
  const identityOf = async (kept: string) =>
    getLambdaDependencyIdentity(
      await planLambdaDependencies({
        dependencies: [external(kept, 'kept')],
        productionDependencies: new Set(),
        architecture: 'x64'
      })
    );

  test('an installed file edited in place is a new artifact, also within one process; the same files elsewhere are not', async () => {
    const first = await createStore();
    const second = await createStore();
    const kept = await first.storePackage({ id: 'kept@1', name: 'kept', version: '1.0.0', files: { 'data.txt': 'a' } });
    const elsewhere = await second.storePackage({
      id: 'kept@1',
      name: 'kept',
      version: '1.0.0',
      files: { 'data.txt': 'a' }
    });

    const before = await identityOf(kept);
    expect(await identityOf(elsewhere)).toEqual(before);
    await writeFile(join(kept, 'data.txt'), 'b');
    expect(await identityOf(kept)).not.toEqual(before);
  });

  test('a renamed file or a directory reached under a second name is a new artifact, also within one process', async () => {
    const { storePackage } = await createStore();
    const kept = await storePackage({
      id: 'kept@1',
      name: 'kept',
      version: '1.0.0',
      files: { 'config/runtime.json': '{}' }
    });

    const original = await identityOf(kept);
    await rename(join(kept, 'config/runtime.json'), join(kept, 'config/runtime-v2.json'));
    const renamed = await identityOf(kept);
    await link(join(kept, 'config'), join(kept, 'z-alias'));
    const aliased = await identityOf(kept);

    expect(new Set([original.join(), renamed.join(), aliased.join()]).size).toBe(3);
  });

  test('which installation a package uses is part of the identity, and linked directories are hashed', async () => {
    const identityWith = async (pluginForOld: 'react18' | 'react19') => {
      const { storePackage } = await createStore();
      const react18 = await storePackage({ id: 'react@18', name: 'react', version: '18.0.0' });
      const react19 = await storePackage({ id: 'react@19', name: 'react', version: '19.0.0' });
      const plugins = {
        react18: await storePackage({
          id: 'plugin@1_a',
          name: 'plugin',
          version: '1.0.0',
          dependencies: { react: react18 }
        }),
        react19: await storePackage({
          id: 'plugin@1_b',
          name: 'plugin',
          version: '1.0.0',
          dependencies: { react: react19 }
        })
      };
      // A package that links one of its own directories, which copying follows.
      await link(join(plugins.react18, '..', '..', '..', '..', '.pnpm'), join(plugins.react18, 'linked-directory'));
      const old = await storePackage({
        id: 'old@1',
        name: 'old',
        version: '1.0.0',
        dependencies: { plugin: plugins[pluginForOld] }
      });
      const next = await storePackage({
        id: 'next@1',
        name: 'next',
        version: '1.0.0',
        dependencies: { plugin: plugins[pluginForOld === 'react18' ? 'react19' : 'react18'] }
      });
      return getLambdaDependencyIdentity(
        await planLambdaDependencies({
          dependencies: [external(old, 'old'), external(next, 'next')],
          productionDependencies: new Set(),
          architecture: 'x64'
        })
      );
    };

    expect(await identityWith('react18')).not.toEqual(await identityWith('react19'));
  });
});

describe('a native package installed again in the Lambda build image', () => {
  test('builds against the dependency versions installed here, keeps them, and gets only its platform packages', async () => {
    const { storePackage } = await createStore();
    const helper = await storePackage({ id: 'helper@1.0.1', name: 'helper', version: '1.0.1' });
    const react18 = await storePackage({ id: 'react@18', name: 'react', version: '18.0.0' });
    const react19 = await storePackage({ id: 'react@19', name: 'react', version: '19.0.0' });
    // The same native version, installed twice because its two consumers give it different peers.
    const nativeFor = (id: string, react: string) =>
      storePackage({
        id,
        name: 'native',
        version: '1.0.0',
        dependencies: { helper, react },
        manifest: { gypfile: true, optionalDependencies: { 'native-linux-x64-gnu': '1.0.0', extra: '1.0.0' } }
      });
    const native18 = await nativeFor('native@1_react@18', react18);
    const native19 = await nativeFor('native@1_react@19', react19);
    const old = await storePackage({ id: 'old@1', name: 'old', version: '1.0.0', dependencies: { native: native18 } });
    const next = await storePackage({
      id: 'next@1',
      name: 'next',
      version: '1.0.0',
      dependencies: { native: native19 }
    });
    // A fresh resolution in the image picks a newer helper and an optional JavaScript package nobody installed here.
    const docker = createFakeDocker(async (nodeModulesPath) => {
      await writePackage(
        join(nodeModulesPath, 'native'),
        {
          name: 'native',
          version: '1.0.0',
          dependencies: { helper: '^1.0.0' },
          optionalDependencies: { 'native-linux-x64-gnu': '1.0.0', extra: '1.0.0' }
        },
        {
          'index.js':
            "exports.helper = require('helper').version; exports.react = require('react').version; exports.binary = require('native-linux-x64-gnu').version; exports.dep = (name) => require(name);",
          'build/Release/native.node': 'built in the image'
        }
      );
      await writePackage(join(nodeModulesPath, 'helper'), { name: 'helper', version: '1.0.2' });
      await writePackage(join(nodeModulesPath, 'extra'), { name: 'extra', version: '1.0.0' });
      await writePackage(join(nodeModulesPath, 'native-linux-x64-gnu'), {
        name: 'native-linux-x64-gnu',
        version: '1.0.0',
        os: ['linux'],
        cpu: ['x64'],
        libc: ['glibc']
      });
    });

    const { artifact } = await write({
      dependencies: [external(old, 'old'), external(next, 'next')],
      runDocker: docker.runDocker
    });

    expect(docker.installedManifests).toEqual([
      { private: true, dependencies: { native: '1.0.0' }, overrides: { helper: '1.0.1' } }
    ] as unknown as typeof docker.installedManifests);
    expect(
      runIn(
        artifact,
        `const pick = (native) => ({ helper: native.helper, react: native.react, binary: native.binary, extra: (() => { try { native.dep('extra'); return 'present'; } catch { return 'absent'; } })() });
        console.log(JSON.stringify([pick(require('old').dep('native')), pick(require('next').dep('native'))]))`
      )
    ).toEqual([
      { helper: '1.0.1', react: '18.0.0', binary: '1.0.0', extra: 'absent' },
      { helper: '1.0.1', react: '19.0.0', binary: '1.0.0', extra: 'absent' }
    ]);
  });
});

describe('which installed packages are native', () => {
  test('an addon linked against musl, as Alpine installs it, is built again; a glibc one is not', async () => {
    const root = await createProject();
    const addon = async (name: string, library: string) => {
      const directory = await writePackage(join(root, 'node_modules', name), {
        name,
        version: '5.1.1',
        binary: { module_path: './lib/binding/napi-v3' }
      });
      await outputFile(
        join(directory, 'lib/binding/napi-v3/addon.node'),
        Buffer.concat([ELF_X64, Buffer.from(`\0${library}\0`)])
      );
      return directory;
    };
    const musl = await addon('bcrypt-musl', 'libc.musl-x86_64.so.1');
    const glibc = await addon('bcrypt-glibc', 'libc.so.6');

    expect(await isInstalledForLambda(musl, 'x64', createPackageAnalysisCache())).toBe(false);
    expect(await onHost('darwin', () => isInstalledForLambda(glibc, 'x64', createPackageAnalysisCache()))).toBe(true);
  });

  test('a pure JavaScript package with a postinstall message is bundled', async () => {
    const root = await createProject();
    const installed = await writePackage(join(root, 'node_modules/thanks'), {
      name: 'thanks',
      version: '1.0.0',
      scripts: { postinstall: 'echo thanks' }
    });
    expect(await getNativeReason(installed, createPackageAnalysisCache())).toBeUndefined();
  });

  test('a Linux build for Lambda runs on any machine; a macOS one is installed again wherever it came from', async () => {
    const root = await createProject();
    const linux = await writePackage(
      join(root, 'node_modules/linux-tool'),
      { name: 'linux-tool', version: '1.0.0', scripts: { install: 'node download.js' } },
      { ffmpeg: '' }
    );
    await writeFile(join(linux, 'ffmpeg'), ELF_X64);
    // A package for several systems whose install script downloaded the macOS library, under a versioned name.
    const macos = await writePackage(
      join(root, 'node_modules/macos-tool'),
      { name: 'macos-tool', version: '1.0.0', os: ['linux', 'darwin'], scripts: { install: 'node download.js' } },
      { 'lib/libtool.so.1': '' }
    );
    await writeFile(join(macos, 'lib/libtool.so.1'), MACH_O);

    expect(await getNativeReason(linux, createPackageAnalysisCache())).toBe('contains compiled programs');
    expect(await getNativeReason(macos, createPackageAnalysisCache())).toBe('built for one platform');
    expect(await onHost('darwin', () => isInstalledForLambda(linux, 'x64', createPackageAnalysisCache()))).toBe(true);
    expect(await onHost('darwin', () => isInstalledForLambda(macos, 'x64', createPackageAnalysisCache()))).toBe(false);
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
      plan: await planLambdaDependencies({ dependencies, productionDependencies: new Set(), architecture: 'x64' }),
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

    expect(docker.installedManifests).toHaveLength(2);
    expect(first.contentHash).toBe(second.contentHash);
    const addon = 'nodejs/node_modules/native-package/build/Release/binding.node';
    expect(await Promise.all([first, second].map((layer) => pathExists(join(layer.layerPath, addon))))).toEqual([
      true,
      true
    ]);
  });
});
