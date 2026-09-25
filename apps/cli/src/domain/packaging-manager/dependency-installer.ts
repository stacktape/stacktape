import type { DeploymentPhase, ProgressReporter as ProgressLogger } from '@application-services/operation-manager';
import type { Result } from 'execa';
import { getLockFileData } from '@stacktape/packaging/bundlers/es/utils';
import ci from 'ci-info';
import { pathExists, readFile, remove, stat, writeFile } from 'fs-extra';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { readPackageUp } from 'read-package-up';
import { checkExecutableInPath } from '@utils/bin-executable';
import { declaredPnpmVersion, getProjectDependencyInstallScript } from './es-install-scripts';
import { parseYaml } from '@utils/yaml';
import { exec } from '@utils/exec';
import { CliError } from '@utils/errors';
import { findProjectRoot } from '@stacktape/packaging/es/project-root';
import { localStatePaths } from 'src/config/local-state-paths';
import { startTiming } from '@utils/timings';

const wait = async ({ ms }: { ms: number }) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const computeLockfileHash = async ({
  installDir,
  lockfilePath
}: {
  installDir: string;
  lockfilePath: string | null;
}) => {
  const hashTarget = lockfilePath || join(installDir, 'package.json');
  try {
    const content = await readFile(hashTarget);
    return createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
};

const MANIFEST_DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;
/** Project configuration that changes what an install produces without changing the lockfile. */
const INSTALL_CONFIG_FILES = [
  '.npmrc',
  'pnpm-workspace.yaml',
  '.pnpmfile.cjs',
  '.pnpmfile.mjs',
  'bunfig.toml',
  '.yarnrc.yml'
];
const INSTALL_MARKER_VERSION = 3;

const sha256 = (content: string | Buffer) => createHash('sha256').update(content).digest('hex');

/** A configuration file's content, or null when it does not exist. Any other read error propagates. */
const readOptionalConfig = (path: string) =>
  readFile(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });

/**
 * What the marker vouches for, besides the lockfile: the complete root `package.json` (any edit, scripts included, can
 * change what an install produces), the configuration files, and the manifest's direct dependencies. Null when any of
 * them cannot be read, so the install runs.
 */
const readInstallInputs = async ({ installDir }: { installDir: string }) => {
  try {
    const manifestBytes = await readFile(join(installDir, 'package.json'));
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    const config = Object.fromEntries(
      (
        await Promise.all(
          INSTALL_CONFIG_FILES.map(async (file) => [file, await readOptionalConfig(join(installDir, file))] as const)
        )
      ).flatMap(([file, content]) => (content === null ? [] : [[file, sha256(content)]]))
    );
    const directDependencies = [
      ...new Set(MANIFEST_DEPENDENCY_FIELDS.flatMap((field) => Object.keys(manifest[field] ?? {})))
    ].toSorted();
    return {
      inputsSha256: sha256(JSON.stringify({ manifestSha256: sha256(manifestBytes), config })),
      directDependencies
    };
  } catch {
    return null;
  }
};

const directPackagePresent = ({ installDir, name }: { installDir: string; name: string }) =>
  pathExists(join(installDir, 'node_modules', name, 'package.json'));

/**
 * Whether Stacktape's marker no longer vouches for the tree. A version 3 marker records the lockfile hash, the complete
 * root manifest and configuration, and the direct dependencies present after the successful install.
 * Any change to those, a recorded direct package that has since disappeared, or an older marker format needs the
 * install. Dependencies absent after a successful install (skipped optional or omitted dev packages) are not required.
 */
const isDepsInstallNeeded = async ({
  installDir,
  lockfilePath
}: {
  installDir: string;
  lockfilePath: string | null;
}) => {
  if (!(await pathExists(join(installDir, 'node_modules')))) return true;
  try {
    const [lockfileSha256, inputs, stored] = await Promise.all([
      computeLockfileHash({ installDir, lockfilePath }),
      readInstallInputs({ installDir }),
      readFile(localStatePaths.dependencyInstallHashFile({ installDirectory: installDir }), 'utf-8').then(JSON.parse)
    ]);
    if (
      !lockfileSha256 ||
      !inputs ||
      stored?.version !== INSTALL_MARKER_VERSION ||
      stored.lockfileSha256 !== lockfileSha256 ||
      stored.inputsSha256 !== inputs.inputsSha256 ||
      !Array.isArray(stored.installedDirectDependencies)
    ) {
      return true;
    }
    const present = await Promise.all(
      stored.installedDirectDependencies.map((name: string) => directPackagePresent({ installDir, name }))
    );
    return !present.every(Boolean);
  } catch {
    return true;
  }
};

const LOCKFILE_KEYS = new Set(['lockfileVersion', 'settings', 'importers', 'packages', 'snapshots']);
type PnpmImporterDependencies = Record<string, { specifier?: unknown }> | undefined;

/** pnpm's virtual-store directory for a lockfile snapshot key, or null where pnpm would shorten it with a hash. */
const pnpmVirtualStoreDirectory = (snapshotKey: string) => {
  let directory = snapshotKey.replace(/[\\/:*?"<>|#]/g, '+');
  if (directory.includes('(')) directory = directory.replace(/\)$/, '').replace(/\)\(|\(|\)/g, '_');
  return directory.length > 120 || (directory !== directory.toLowerCase() && !directory.startsWith('file+'))
    ? null
    : directory;
};

/**
 * Makes this process's bundler see what an install just wrote. Bun keeps each directory's entries for the life of the
 * process and reads the working directory at startup, so a `node_modules` the install created stays invisible to a
 * later build in this process: a fresh checkout's first `package` fails to resolve its dependencies. A relative lookup
 * that misses makes Bun read the directory again. The lookup itself finds no module and is discarded. This is Bun
 * 1.4.1's behavior, not a documented API; the fresh-project package E2E fails if it changes.
 */
const refreshResolverView = (directories: string[]) => {
  for (const directory of new Set(directories)) {
    try {
      Bun.resolveSync('./node_modules', directory);
    } catch {
      // Expected: `node_modules` is a directory, not a module.
    }
  }
};

/** The root project's scripts `npm ci` runs. npm records nothing showing they ran, e.g. after `--ignore-scripts`. */
const NPM_CI_ROOT_LIFECYCLE_SCRIPTS = [
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'preprepare',
  'prepare',
  'postprepare',
  'dependencies'
];
/**
 * The root project's scripts a pnpm install runs: npm's set (the extra npm names are harmless) plus
 * `pnpm:devPreinstall`, as a local pnpm 11.17.0 probe showed. A completed tree does not show that an added one ran.
 */
const PNPM_INSTALL_ROOT_LIFECYCLE_SCRIPTS = [...NPM_CI_ROOT_LIFECYCLE_SCRIPTS, 'pnpm:devPreinstall'];

/**
 * Whether a markerless pnpm tree is a completed frozen install of exactly this project, so that repeating the install
 * would change nothing. Every condition is read from content, and anything unexpected keeps the install:
 * - `package.json` declares an exact pnpm version, which `.modules.yaml` records as the installer, with the default
 *   isolated layout, every dependency type included, and no pending build or skipped package;
 * - pnpm's current lockfile, which it writes only after a completed install and its builds, is byte-identical to
 *   `pnpm-lock.yaml`;
 * - the lockfile has one importer and nothing a frozen install re-checks beyond the manifest (patches, overrides,
 *   catalogs, pnpmfile), and no pnpmfile exists;
 * - the importer's specifiers equal `package.json`'s, so a changed manifest still reaches the installer's error;
 * - every direct dependency resolves and every locked package's directory holds its manifest;
 * - `package.json` declares no root script pnpm runs during install, since nothing records whether it ran after an
 *   edit.
 */
const isCompletedPnpmInstall = async ({ installDir, lockfilePath }: { installDir: string; lockfilePath: string }) => {
  try {
    const nodeModules = join(installDir, 'node_modules');
    const [manifestText, modulesText, wantedLockfile, currentLockfile] = await Promise.all([
      readFile(join(installDir, 'package.json'), 'utf8'),
      readFile(join(nodeModules, '.modules.yaml'), 'utf8'),
      readFile(lockfilePath),
      readFile(join(nodeModules, '.pnpm', 'lock.yaml'))
    ]);
    const manifest = JSON.parse(manifestText);
    const version = declaredPnpmVersion(manifest.packageManager);
    const modules = JSON.parse(modulesText);
    if (
      !version ||
      modules.packageManager !== `pnpm@${version}` ||
      modules.layoutVersion !== 5 ||
      modules.nodeLinker !== 'isolated' ||
      modules.virtualStoreDir !== '.pnpm' ||
      MANIFEST_DEPENDENCY_FIELDS.some((field) => modules.included?.[field] !== true) ||
      modules.pendingBuilds?.length !== 0 ||
      modules.skipped?.length !== 0 ||
      PNPM_INSTALL_ROOT_LIFECYCLE_SCRIPTS.some((script) => manifest.scripts?.[script] !== undefined) ||
      !wantedLockfile.equals(currentLockfile) ||
      (await pathExists(join(installDir, '.pnpmfile.cjs'))) ||
      (await pathExists(join(installDir, '.pnpmfile.mjs')))
    ) {
      return false;
    }
    const lockfile = parseYaml(wantedLockfile.toString('utf8'));
    const importers = Object.keys(lockfile?.importers ?? {});
    if (
      String(lockfile?.lockfileVersion) !== '9.0' ||
      Object.keys(lockfile).some((key) => !LOCKFILE_KEYS.has(key)) ||
      importers.length !== 1 ||
      importers[0] !== '.'
    ) {
      return false;
    }
    const importer = lockfile.importers['.'];
    const directDependencies: string[] = [];
    for (const field of MANIFEST_DEPENDENCY_FIELDS) {
      const declared: Record<string, unknown> = manifest[field] ?? {};
      const locked: PnpmImporterDependencies = importer?.[field];
      const lockedNames = Object.keys(locked ?? {});
      if (
        lockedNames.length !== Object.keys(declared).length ||
        lockedNames.some((name) => locked![name]?.specifier !== declared[name])
      ) {
        return false;
      }
      directDependencies.push(...lockedNames);
    }
    const lockedPackages = Object.keys(lockfile.snapshots ?? {}).map((key) => {
      const withoutPeers = key.split('(')[0]!;
      return { directory: pnpmVirtualStoreDirectory(key), name: withoutPeers.slice(0, withoutPeers.lastIndexOf('@')) };
    });
    if (lockedPackages.some(({ directory, name }) => !directory || !name)) return false;
    const present = await Promise.all([
      ...directDependencies.map((name) => pathExists(join(nodeModules, name, 'package.json'))),
      ...lockedPackages.map(({ directory, name }) =>
        pathExists(join(nodeModules, '.pnpm', directory!, 'node_modules', name, 'package.json'))
      )
    ]);
    return present.every(Boolean);
  } catch {
    return false;
  }
};

const NPM_ROOT_DEPENDENCY_FIELDS = [...MANIFEST_DEPENDENCY_FIELDS, 'peerDependencies'] as const;
/** Workspaces in object form, or as a non-empty array; `workspaces: []` declares none. */
const declaresWorkspaces = (workspaces: unknown) =>
  workspaces !== undefined && !(Array.isArray(workspaces) && workspaces.length === 0);

/**
 * Whether a markerless npm tree is a completed `npm ci` of exactly this lockfile, so that repeating it would change
 * nothing. Every condition is read from content, never from mtimes, and anything unexpected keeps `npm ci`:
 * - the lockfile is `package-lock.json` (version 2 or 3) with no `npm-shrinkwrap.json`, workspace or linked package;
 * - `package.json` declares no root lifecycle script that `npm ci` runs, since a pipeline may have skipped them;
 * - its root entry declares exactly `package.json`'s dependencies, so a changed manifest still reaches `npm ci`;
 * - npm's hidden lockfile `node_modules/.package-lock.json`, which records what npm installed, holds exactly the
 *   lockfile's packages, so an interrupted, stale or `--omit` install is refused;
 * - no locked package has an install script, since npm does not record whether scripts ran;
 * - every locked package's installed `package.json` names its locked package and version.
 */
const isCompletedNpmInstall = async ({ installDir, lockfilePath }: { installDir: string; lockfilePath: string }) => {
  try {
    if (!lockfilePath.endsWith('package-lock.json') || (await pathExists(join(installDir, 'npm-shrinkwrap.json')))) {
      return false;
    }
    const [manifestText, lockfileText, hiddenText] = await Promise.all([
      readFile(join(installDir, 'package.json'), 'utf8'),
      readFile(lockfilePath, 'utf8'),
      readFile(join(installDir, 'node_modules', '.package-lock.json'), 'utf8')
    ]);
    const manifest = JSON.parse(manifestText);
    const lockfile = JSON.parse(lockfileText);
    const hidden = JSON.parse(hiddenText);
    const { '': root, ...lockedPackages } = lockfile.packages ?? {};
    const entries = Object.entries(lockedPackages) as [
      string,
      { name?: string; version?: string; link?: boolean; hasInstallScript?: boolean }
    ][];
    if (
      ![2, 3].includes(lockfile.lockfileVersion) ||
      hidden.lockfileVersion !== lockfile.lockfileVersion ||
      !root ||
      declaresWorkspaces(root.workspaces) ||
      declaresWorkspaces(manifest.workspaces) ||
      NPM_CI_ROOT_LIFECYCLE_SCRIPTS.some((script) => manifest.scripts?.[script] !== undefined) ||
      NPM_ROOT_DEPENDENCY_FIELDS.some((field) => !isDeepStrictEqual(root[field] ?? {}, manifest[field] ?? {})) ||
      !isDeepStrictEqual(hidden.packages, lockedPackages) ||
      entries.some(([, entry]) => entry.link || entry.hasInstallScript)
    ) {
      return false;
    }
    // `npm install --package-lock-only` rewrites the hidden lockfile without installing, so each installed manifest must
    // still name the locked package and version.
    const installed = await Promise.all(
      entries.map(async ([path, entry]) => {
        const { name, version } = JSON.parse(await readFile(join(installDir, path, 'package.json'), 'utf8'));
        const lockedName = entry.name ?? path.slice(path.lastIndexOf('node_modules/') + 13);
        return name === lockedName && version === entry.version;
      })
    );
    return installed.every(Boolean);
  } catch {
    return false;
  }
};

const saveInstallHash = async ({ installDir, lockfilePath }: { installDir: string; lockfilePath: string | null }) => {
  const [lockfileSha256, inputs] = await Promise.all([
    computeLockfileHash({ installDir, lockfilePath }),
    readInstallInputs({ installDir })
  ]);
  if (!lockfileSha256 || !inputs) return;
  const present = await Promise.all(
    inputs.directDependencies.map((name) => directPackagePresent({ installDir, name }))
  );
  const marker = {
    version: INSTALL_MARKER_VERSION,
    lockfileSha256,
    inputsSha256: inputs.inputsSha256,
    installedDirectDependencies: inputs.directDependencies.filter((_, index) => present[index])
  };
  await writeFile(
    localStatePaths.dependencyInstallHashFile({ installDirectory: installDir }),
    JSON.stringify(marker)
  ).catch(() => {});
};

/**
 * Acquires a filesystem-level lock, then runs `installFn` only if deps are still needed.
 * This prevents redundant installs when multiple Stacktape processes target the same directory:
 * process B waits for A's lock, then re-checks the hash — if A already installed, B skips.
 */
const withInstallLock = async ({
  installDir,
  lockfilePath,
  installFn
}: {
  installDir: string;
  lockfilePath: string | null;
  installFn: () => Promise<Result>;
}): Promise<Result | null> => {
  const lockPath = localStatePaths.dependencyInstallLockFile({ installDirectory: installDir });
  const startedAt = Date.now();
  const staleLockAfterMs = 5 * 60 * 1000;
  const maxWaitMs = 10 * 60 * 1000;

  while (true) {
    try {
      await writeFile(lockPath, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }), {
        flag: 'wx'
      });
      break;
    } catch (err) {
      const error = err as { code?: string };
      if (error.code !== 'EEXIST') {
        throw err;
      }

      if (Date.now() - startedAt > maxWaitMs) {
        throw new CliError({
          category: 'PACKAGING',
          code: 'PACKAGING_INSTALL_LOCK_TIMEOUT',
          message: `Timed out waiting for the dependency install lock in \`${installDir}\`.`,
          hints: 'Another Stacktape process may be stuck. Remove `.stacktape-install.lock` and retry.'
        });
      }

      try {
        const lockFileStat = await stat(lockPath);
        if (Date.now() - lockFileStat.mtimeMs > staleLockAfterMs) {
          await remove(lockPath);
          continue;
        }
      } catch {
        // Lock can disappear between stat/remove attempts.
      }

      await wait({ ms: 300 });
    }
  }

  try {
    // Re-check after acquiring lock — another process may have already installed
    if (!(await isDepsInstallNeeded({ installDir, lockfilePath }))) {
      return null;
    }
    const result = await installFn();
    await saveInstallHash({ installDir, lockfilePath });
    return result;
  } finally {
    await remove(lockPath).catch(() => {});
  }
};

class DependencyInstaller {
  pendingInstalls: Record<string, Promise<Result | void>> = {};

  install = async ({
    rootProjectDirPath,
    progressLogger,
    phase = 'BUILD_AND_PACKAGE'
  }: {
    rootProjectDirPath: string;
    progressLogger: ProgressLogger;
    phase?: DeploymentPhase;
  }) => {
    const endTiming = startTiming('dependencies:install');
    const readPkgResult = await readPackageUp({ cwd: rootProjectDirPath }).catch(() => ({ path: null }));
    const packagePath = readPkgResult?.path || null;
    if (!packagePath) {
      endTiming({ decision: 'no-package-json' });
      return;
    }

    // Determine the actual directory where we should install dependencies
    const installDir = await findProjectRoot(packagePath);

    const lockFileInfo = await getLockFileData(installDir);
    const packageManager = lockFileInfo.packageManager || 'npm';
    const useCiInstall = !!(ci.isCI && lockFileInfo.lockfilePath);
    const installKey = `${installDir}:${packageManager}`;

    if (this.pendingInstalls[installKey]) {
      endTiming({ decision: 'joined-earlier-call', packageManager });
      return this.pendingInstalls[installKey];
    }

    // Skip install if lockfile/package.json hasn't changed since last install
    if (!(await isDepsInstallNeeded({ installDir, lockfilePath: lockFileInfo.lockfilePath }))) {
      this.pendingInstalls[installKey] = Promise.resolve();
      endTiming({ decision: 'marker-matches', packageManager, ciDetected: ci.isCI });
      return;
    }

    // A pipeline's own completed frozen pnpm or npm install has no marker. Proving it from the manager's recorded state
    // avoids repeating it; the proof writes nothing, so the next run proves it again.
    const isCompletedInstall =
      packageManager === 'pnpm' ? isCompletedPnpmInstall : packageManager === 'npm' ? isCompletedNpmInstall : null;
    if (
      useCiInstall &&
      isCompletedInstall &&
      (await isCompletedInstall({ installDir, lockfilePath: lockFileInfo.lockfilePath! }))
    ) {
      this.pendingInstalls[installKey] = Promise.resolve();
      endTiming({ decision: `${packageManager}-install-verified`, packageManager, ciDetected: ci.isCI });
      return;
    }

    const isNodeInstalled = checkExecutableInPath('node') || checkExecutableInPath('nodejs');
    if (!isNodeInstalled) {
      throw new CliError({
        category: 'PACKAGING',
        code: 'PACKAGING_NODE_MISSING',
        message:
          'NodeJS missing: This project seems to be using NodeJS (node), but it is not installed on your system.',
        hints: 'Install Node.js by following https://nodejs.org/en/download/package-manager.'
      });
    }

    const packageManagerDeclaration =
      readPkgResult && 'packageJson' in readPkgResult ? readPkgResult.packageJson.packageManager : undefined;
    const lockfile = lockFileInfo.lockfilePath ? await readFile(lockFileInfo.lockfilePath, 'utf8') : undefined;
    const installScript = getProjectDependencyInstallScript({
      packageManager,
      installType: useCiInstall ? 'CI' : 'normal',
      ...(typeof packageManagerDeclaration === 'string' ? { packageManagerDeclaration } : {}),
      ...(lockfile === undefined ? {} : { lockfile })
    });
    // The install command comes from Stacktape's own table and the declared package manager version.
    const timingDetail = { packageManager, ciDetected: ci.isCI, command: installScript.join(' ') };
    this.pendingInstalls[installKey] = (async () => {
      await progressLogger.startEvent({
        eventType: 'INSTALL_DEPENDENCIES',
        description: 'Installing dependencies',
        phase
      });

      try {
        const result = await withInstallLock({
          installDir,
          lockfilePath: lockFileInfo.lockfilePath,
          installFn: async () =>
            exec(installScript[0], installScript.slice(1), {
              inheritEnvVarsExcept: [],
              disableStderr: true,
              disableStdout: true,
              cwd: installDir
            })
        });
        refreshResolverView([installDir, process.cwd()]);
        endTiming({ ...timingDetail, decision: result === null ? 'installed-by-another-process' : 'installed' });
      } catch (err) {
        endTiming({ ...timingDetail, decision: 'install-failed' });
        throw new CliError({
          category: 'PACKAGING',
          code: 'PACKAGING_DEPENDENCY_INSTALL_FAILED',
          message: `Failed to install dependencies.\n${err.message}`,
          cause: err
        });
      }

      await progressLogger.finishEvent({ eventType: 'INSTALL_DEPENDENCIES', phase });
    })();

    return this.pendingInstalls[installKey];
  };
}

export const dependencyInstaller = new DependencyInstaller();
