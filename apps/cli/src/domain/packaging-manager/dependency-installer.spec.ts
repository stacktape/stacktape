import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localStatePaths } from 'src/config/local-state-paths';
import { dependencyInstaller, isCompletedNpmInstall, isRunnerCompletedInstall } from './dependency-installer';

let root: string;
/** A completed `npm ci` of an npm workspace, kept read-only; each test works on a copy. */
let seed: string;

const writeJson = (path: string, value: unknown) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);

const npm = (cwd: string, ...args: string[]) => {
  const result = spawnSync('npm', [...args, '--no-audit', '--no-fund', '--offline'], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, npm_config_cache: join(root, 'npm-cache') }
  });
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed:\n${result.stderr}`);
};

/** A local tarball, so the fixture installs without a registry. */
const packDependency = async (name: string, manifest: Record<string, unknown> = {}) => {
  const directory = join(root, 'packages-src', name);
  await mkdir(directory, { recursive: true });
  await writeJson(join(directory, 'package.json'), { name, version: '1.0.0', ...manifest });
  await writeFile(join(directory, 'index.js'), `module.exports = '${name}';\n`);
  npm(directory, 'pack', '--pack-destination', join(root, 'vendor'));
  return `file:../vendor/${name}-1.0.0.tgz`;
};

const copySeed = async (name: string) => {
  const directory = join(root, name);
  await cp(seed, directory, { recursive: true, verbatimSymlinks: true });
  return directory;
};

const verify = (installDir: string) =>
  isCompletedNpmInstall({ installDir, lockfilePath: join(installDir, 'package-lock.json') });

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-dependency-installer-'));
  await mkdir(join(root, 'vendor'));
  const plain = await packDependency('fixture-plain');
  // npm skips an optional package built for another platform; esbuild's platform packages are installed this way.
  const otherPlatform = await packDependency('fixture-other-platform', {
    os: [process.platform === 'darwin' ? 'win32' : 'darwin']
  });
  seed = join(root, 'seed');
  await mkdir(join(seed, 'packages', 'util'), { recursive: true });
  await mkdir(join(seed, 'packages', 'functions'), { recursive: true });
  await writeJson(join(seed, 'package.json'), {
    name: 'shop',
    private: true,
    workspaces: ['packages/*'],
    dependencies: { 'fixture-plain': plain },
    optionalDependencies: { 'fixture-other-platform': otherPlatform }
  });
  await writeJson(join(seed, 'packages', 'util', 'package.json'), { name: '@shop/util', version: '1.0.0' });
  await writeJson(join(seed, 'packages', 'functions', 'package.json'), {
    name: '@shop/functions',
    version: '1.0.0',
    dependencies: { '@shop/util': '1.0.0' }
  });
  npm(seed, 'install');
  await rm(join(seed, 'node_modules'), { recursive: true });
  npm(seed, 'ci');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('a completed npm ci in an npm workspace', () => {
  test('is recognised, with the workspace links and a skipped package for another platform', async () => {
    const lockfile = JSON.parse(await readFile(join(seed, 'package-lock.json'), 'utf8'));
    expect(lockfile.packages['node_modules/@shop/util']).toMatchObject({ link: true, resolved: 'packages/util' });
    expect(lockfile.packages['node_modules/fixture-other-platform']).toMatchObject({ optional: true });
    expect(await verify(await copySeed('complete'))).toBe(true);
  });

  test('is refused when a workspace manifest changed its dependencies', async () => {
    const directory = await copySeed('changed-workspace');
    const manifestPath = join(directory, 'packages', 'functions', 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    await writeJson(manifestPath, {
      ...manifest,
      dependencies: { ...manifest.dependencies, 'fixture-plain': '1.0.0' }
    });
    expect(await verify(directory)).toBe(false);
  });

  test('is refused when a workspace declares a lifecycle script npm ci runs', async () => {
    const directory = await copySeed('workspace-script');
    const manifestPath = join(directory, 'packages', 'util', 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    await writeJson(manifestPath, { ...manifest, scripts: { prepare: 'node build.js' } });
    expect(await verify(directory)).toBe(false);
  });

  test('is refused when the workspace patterns changed', async () => {
    const directory = await copySeed('changed-patterns');
    const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    await writeJson(join(directory, 'package.json'), { ...manifest, workspaces: ['packages/*', 'apps/*'] });
    expect(await verify(directory)).toBe(false);
  });

  test('is refused when a workspace link points somewhere else', async () => {
    const directory = await copySeed('moved-link');
    await rm(join(directory, 'node_modules', '@shop', 'util'));
    await symlink('../../packages/functions', join(directory, 'node_modules', '@shop', 'util'));
    expect(await verify(directory)).toBe(false);
  });

  test('is refused when a package that is not optional is missing from what npm installed', async () => {
    const directory = await copySeed('interrupted');
    const hiddenPath = join(directory, 'node_modules', '.package-lock.json');
    const hidden = JSON.parse(await readFile(hiddenPath, 'utf8'));
    delete hidden.packages['node_modules/fixture-plain'];
    await writeJson(hiddenPath, hidden);
    expect(await verify(directory)).toBe(false);
  });
});

describe("the runner's completed install", () => {
  const previous = process.env.STP_RUNNER_INSTALLED_DEPENDENCIES;
  afterEach(() => {
    if (previous === undefined) delete process.env.STP_RUNNER_INSTALLED_DEPENDENCIES;
    else process.env.STP_RUNNER_INSTALLED_DEPENDENCIES = previous;
  });

  test('counts only for the directory the runner names, and only with node_modules', async () => {
    const installed = await copySeed('runner-installed');
    const other = await copySeed('runner-other');
    delete process.env.STP_RUNNER_INSTALLED_DEPENDENCIES;
    expect(await isRunnerCompletedInstall({ installDir: installed })).toBe(false);
    process.env.STP_RUNNER_INSTALLED_DEPENDENCIES = installed;
    expect(await isRunnerCompletedInstall({ installDir: installed })).toBe(true);
    expect(await isRunnerCompletedInstall({ installDir: join(installed, 'packages', '..') })).toBe(true);
    expect(await isRunnerCompletedInstall({ installDir: other })).toBe(false);
    await rm(join(installed, 'node_modules'), { recursive: true });
    expect(await isRunnerCompletedInstall({ installDir: installed })).toBe(false);
  });

  test('is kept as it is: no package manager runs, and the marker vouches for it afterwards', async () => {
    const directory = await copySeed('runner-kept');
    // npm ci would delete this file with the rest of node_modules.
    await writeFile(join(directory, 'node_modules', 'sentinel'), 'installed by the runner');
    process.env.STP_RUNNER_INSTALLED_DEPENDENCIES = directory;
    const noop = async () => {};
    await dependencyInstaller.install({
      rootProjectDirPath: join(directory, 'packages', 'functions'),
      progressLogger: { eventContext: {}, startEvent: noop, updateEvent: noop, finishEvent: noop } as never
    });
    expect(await readFile(join(directory, 'node_modules', 'sentinel'), 'utf8')).toBe('installed by the runner');
    const marker = JSON.parse(
      await readFile(localStatePaths.dependencyInstallHashFile({ installDirectory: directory }), 'utf8')
    );
    expect(marker.installedDirectDependencies).toEqual(['fixture-plain']);
  });
});
