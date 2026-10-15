/**
 * The packages a Lambda function or dependency layer gets beside its bundle.
 *
 * Every package the bundle leaves out is copied from the project's installed `node_modules` together with everything
 * it loads, whichever package manager installed them. Only a native package whose installed files do not run on
 * Lambda (it was built for another platform, or compiled on this machine) is installed again, at the same version, in
 * the Lambda build image. On a Linux build machine that is rare, so most builds never start Docker.
 */
import type { DockerBuildOutputArchitecture, ResolvedPackageDependency } from '../runtime-contracts';
import { createHash } from 'node:crypto';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { copy, emptyDir, ensureDir, outputJSON, pathExists, remove, writeFile } from 'fs-extra';
import objectHash from 'object-hash';
import { LAMBDA_ARCHIVE_FORMAT, listArchiveEntries } from '../artifact/archive-entries';
import { getArchiveInventoryChecksum } from '../artifact/hashing';
import { getFolderSizeBytes } from '../fs/files';
import { IGNORED_MODULES } from './config';
import {
  addRuntimeDependencies,
  copyPackageGraph,
  findInstalledPackage,
  getPackageFingerprint,
  readPackageManifest,
  type InstalledPackage,
  type PackageManifest
} from './installed-packages';
import { getNativeReason, isInstalledForLambda, runsOnLambda, type LambdaArchitecture } from './native-packages';

export type RunDocker = (commands: string[]) => Promise<unknown>;

export const getLambdaArchitecture = (dockerBuildOutputArchitecture: DockerBuildOutputArchitecture | undefined) =>
  dockerBuildOutputArchitecture === 'linux/arm64' ? 'arm64' : 'x64';

/** What a function or layer gets beside its bundle, decided before anything is copied. */
export type LambdaDependencyPlan = {
  architecture: LambdaArchitecture;
  /** The packages the bundle leaves out and everything they load, by real directory. */
  packages: Map<string, InstalledPackage>;
  /** The packages the bundle itself loads: the name it requires each by, and its real directory. */
  topLevelPackages: Map<string, string>;
  /** Native packages whose installed files do not run on Lambda; the Lambda build image installs them again. */
  packagesToInstallForLambda: InstalledPackage[];
  /** Names left out wherever they are required, as `excludeDependencies` asks. */
  excludedNames: Set<string>;
};

/** Leaves out excluded packages and the binaries of other platforms, such as the macOS build of a napi-rs package. */
const acceptFor =
  ({ architecture, excludedNames }: Pick<LambdaDependencyPlan, 'architecture' | 'excludedNames'>) =>
  (name: string, manifest: PackageManifest) =>
    !excludedNames.has(name) && runsOnLambda(manifest, architecture);

export const planLambdaDependencies = async ({
  dependencies,
  architecture,
  excludedNames = []
}: {
  dependencies: ResolvedPackageDependency[];
  architecture: LambdaArchitecture;
  /** Packages that must not be in the artifact even when a copied package depends on them; `IGNORED_MODULES` always. */
  excludedNames?: string[] | undefined;
}): Promise<LambdaDependencyPlan> => {
  const topLevelPackages = new Map(dependencies.map(({ name, path }) => [name, path]));
  const excluded = new Set([...IGNORED_MODULES, ...excludedNames]);
  const accept = acceptFor({ architecture, excludedNames: excluded });
  const packages = new Map<string, InstalledPackage>();
  await addRuntimeDependencies({ packages, start: [...topLevelPackages.values()], accept });

  const needsInstall = async ({ root }: InstalledPackage) =>
    Boolean(await getNativeReason(root)) && !(await isInstalledForLambda(root, architecture));
  const installedPackages = [...packages.values()];
  const decisions = await Promise.all(installedPackages.map(needsInstall));
  const packagesToInstallForLambda = installedPackages.filter((_, index) => decisions[index]);
  return {
    architecture,
    packages,
    topLevelPackages,
    packagesToInstallForLambda,
    excludedNames: excluded
  };
};

/**
 * What the plan copies, for the artifact digest: every package's name, version and file fingerprint, and the names
 * and fingerprints of what it depends on. Nothing in it depends on where the project is on this machine.
 */
export const getLambdaDependencyIdentity = async (plan: LambdaDependencyPlan) => {
  const fingerprints = new Map(
    await Promise.all([...plan.packages.keys()].map(async (root) => [root, await getPackageFingerprint(root)] as const))
  );
  const packages = [...plan.packages.values()].map(({ name, version, root, dependencies }) => {
    const edges = [...dependencies].map(([dependencyName, dependencyRoot]) => {
      return `${dependencyName}=${fingerprints.get(dependencyRoot)}`;
    });
    return `${name}@${version} ${fingerprints.get(root)} -> ${edges.toSorted().join(',')}`;
  });
  const topLevel = [...plan.topLevelPackages].map(([name, root]) => `${name}=${fingerprints.get(root)}`);
  return [...topLevel.toSorted(), ...packages.toSorted()];
};

const inProgressInstallations = new Map<string, Promise<string>>();

/**
 * Installs exact package versions in the Lambda build image and returns the `node_modules` directory it produced.
 * Concurrent requests for the same installation share one Docker build, and a finished installation is reused.
 */
const installInLambdaBuildImage = async ({
  packages,
  installationRootPath,
  lambdaRuntimeVersion,
  architecture,
  runDocker
}: {
  packages: { name: string; version: string }[];
  installationRootPath: string;
  lambdaRuntimeVersion: number;
  architecture: LambdaArchitecture;
  runDocker: RunDocker;
}): Promise<string> => {
  const packageSpecs = packages.map(({ name, version }) => `${name}@${version}`).toSorted();
  const platform = architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64';
  // npm runs the packages' install scripts, which build or download each addon for the image's platform.
  const dockerfile = `FROM public.ecr.aws/sam/build-nodejs${lambdaRuntimeVersion}.x AS build
WORKDIR /installation
RUN npm install --no-audit --no-fund ${packageSpecs.join(' ')}

FROM scratch AS artifact
COPY --from=build /installation/node_modules /node_modules`;
  const installationPath = join(resolvePath(installationRootPath), objectHash({ dockerfile, platform }));
  const nodeModulesPath = join(installationPath, 'node_modules');

  const existing = inProgressInstallations.get(installationPath);
  if (existing) {
    try {
      if (await pathExists(await existing)) return nodeModulesPath;
    } catch {
      // A failed installation is retried below.
    }
  }

  const installation = (async () => {
    await remove(installationPath);
    await ensureDir(installationPath);
    await writeFile(join(installationPath, 'Dockerfile'), dockerfile);
    await runDocker([
      'image',
      'build',
      '--platform',
      platform,
      '--target',
      'artifact',
      '--output',
      `type=local,dest=${installationPath.replace(/\\/g, '/')}`,
      installationPath
    ]);
    return nodeModulesPath;
  })();
  inProgressInstallations.set(installationPath, installation);
  try {
    return await installation;
  } catch (error) {
    if (inProgressInstallations.get(installationPath) === installation)
      inProgressInstallations.delete(installationPath);
    throw error;
  }
};

/**
 * Writes the plan's packages to `nodeModulesPath`. Packages the plan marks are taken from a Lambda build image
 * installation, together with what that installation gives them, such as the platform package of a napi-rs addon.
 */
export const writeLambdaDependencies = async ({
  plan,
  nodeModulesPath,
  installationRootPath,
  lambdaRuntimeVersion,
  runDocker
}: {
  plan: LambdaDependencyPlan;
  nodeModulesPath: string;
  installationRootPath: string;
  lambdaRuntimeVersion: number;
  runDocker: RunDocker;
}) => {
  if (plan.packagesToInstallForLambda.length === 0) {
    await copyPackageGraph({ packages: plan.packages, topLevelPackages: plan.topLevelPackages, nodeModulesPath });
    return;
  }

  const installedNodeModulesPath = await installInLambdaBuildImage({
    packages: plan.packagesToInstallForLambda,
    installationRootPath,
    lambdaRuntimeVersion,
    architecture: plan.architecture,
    runDocker
  });
  const installationPath = dirname(installedNodeModulesPath);
  const packages = new Map(
    [...plan.packages].map(([root, installedPackage]) => [
      root,
      { ...installedPackage, dependencies: new Map(installedPackage.dependencies) }
    ])
  );
  const topLevelPackages = new Map(plan.topLevelPackages);
  for (const reinstalled of plan.packagesToInstallForLambda) {
    // oxlint-disable-next-line no-await-in-loop -- one lookup per reinstalled package.
    await useReinstalledPackage({ packages, topLevelPackages, reinstalled, installationPath, plan });
  }
  await copyPackageGraph({ packages, topLevelPackages, nodeModulesPath });
};

/**
 * Puts the Lambda build image's installation of a native package in place of the one installed here. It keeps the
 * dependencies installed here, at their versions and with any patches; only the binaries the image installed for Lambda,
 * such as a napi-rs platform package, come from the image with what they need.
 */
const useReinstalledPackage = async ({
  packages,
  topLevelPackages,
  reinstalled,
  installationPath,
  plan
}: {
  packages: Map<string, InstalledPackage>;
  topLevelPackages: Map<string, string>;
  reinstalled: InstalledPackage;
  installationPath: string;
  plan: LambdaDependencyPlan;
}) => {
  const root = await findInstalledPackage({
    name: reinstalled.name,
    fromDirectory: installationPath,
    stopAt: installationPath
  });
  if (!root) throw new Error(`The Lambda build image did not install ${reinstalled.name}, which this function needs.`);

  const replacement: InstalledPackage = { ...reinstalled, root, dependencies: new Map(reinstalled.dependencies) };
  const accept = acceptFor(plan);
  for (const name of Object.keys((await readPackageManifest(root)).optionalDependencies ?? {})) {
    if (replacement.dependencies.has(name)) continue;
    // oxlint-disable-next-line no-await-in-loop -- a package has a handful of optional dependencies.
    const binaryRoot = await findInstalledPackage({ name, fromDirectory: root, stopAt: installationPath });
    // oxlint-disable-next-line no-await-in-loop -- see above.
    if (!binaryRoot || !accept(name, await readPackageManifest(binaryRoot))) continue;
    replacement.dependencies.set(name, binaryRoot);
    // oxlint-disable-next-line no-await-in-loop -- see above.
    await addRuntimeDependencies({ packages, start: [binaryRoot], accept, stopAt: () => installationPath });
  }

  packages.delete(reinstalled.root);
  packages.set(root, replacement);
  for (const installedPackage of packages.values()) {
    for (const [name, dependencyRoot] of installedPackage.dependencies) {
      if (dependencyRoot === reinstalled.root) installedPackage.dependencies.set(name, root);
    }
  }
  for (const [name, topLevelRoot] of topLevelPackages) {
    if (topLevelRoot === reinstalled.root) topLevelPackages.set(name, root);
  }
};

/**
 * Installs packages in the Lambda build image and copies the whole installation into `distFolderPath/node_modules`.
 * Framework builds use it for packages their bundler left installed without their native binaries.
 */
export const copyDockerInstalledModulesForLambda = async ({
  dependencies,
  installationRootPath,
  distFolderPath,
  lambdaRuntimeVersion,
  dockerBuildOutputArchitecture,
  runDocker
}: {
  dependencies: { name: string; version: string }[];
  installationRootPath: string;
  distFolderPath: string;
  lambdaRuntimeVersion: number;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  runDocker: RunDocker;
}) => {
  if (!dependencies.length) return;
  const nodeModulesPath = await installInLambdaBuildImage({
    packages: dependencies,
    installationRootPath,
    lambdaRuntimeVersion,
    architecture: getLambdaArchitecture(dockerBuildOutputArchitecture),
    runDocker
  });
  await copy(nodeModulesPath, join(distFolderPath, 'node_modules'));
};

/**
 * The layer's content identity, which also names its S3 object: every entry the layer ZIP will contain, as the
 * archive policy lists it, under the current archive format.
 */
const getLayerContentHash = async (layerPath: string): Promise<string> => {
  const { entries } = await listArchiveEntries({ sourcePath: layerPath });
  return createHash('sha256')
    .update(`${LAMBDA_ARCHIVE_FORMAT}\n${await getArchiveInventoryChecksum(entries)}`)
    .digest('hex')
    .slice(0, 12);
};

export type NativeBinaryLayerResult = {
  layerPath: string;
  contentHash: string;
  sizeBytes: number;
  usedByLambdas: string[];
  dependencies: ResolvedPackageDependency[];
};

/** Writes a split build's dependency layer: the plan's packages under `nodejs/node_modules`. */
export const buildNativeBinaryLayer = async ({
  dependencies,
  plan,
  installationRootPath,
  layerBasePath,
  lambdaRuntimeVersion,
  usedByLambdas,
  layerName = 'layer-native',
  runDocker
}: {
  dependencies: ResolvedPackageDependency[];
  plan: LambdaDependencyPlan;
  installationRootPath: string;
  layerBasePath: string;
  lambdaRuntimeVersion: number;
  usedByLambdas: string[];
  layerName?: string | undefined;
  runDocker: RunDocker;
}): Promise<NativeBinaryLayerResult> => {
  const layerPath = join(layerBasePath, layerName);
  const layerNodejsPath = join(layerPath, 'nodejs');
  // The stable layer path is reused by dev/repackage flows. Never merge a new dependency set into the previous one.
  await emptyDir(layerPath);
  await writeLambdaDependencies({
    plan,
    nodeModulesPath: join(layerNodejsPath, 'node_modules'),
    installationRootPath,
    lambdaRuntimeVersion,
    runDocker
  });
  await outputJSON(join(layerNodejsPath, 'package.json'), { type: 'module' });
  const contentHash = await getLayerContentHash(layerPath);

  return {
    layerPath,
    contentHash,
    sizeBytes: await getFolderSizeBytes(layerPath),
    usedByLambdas,
    dependencies
  };
};
