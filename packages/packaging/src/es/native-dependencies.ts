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
import {
  addRuntimeDependencies,
  copyPackageGraph,
  findInstalledPackage,
  isInside,
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
  /** The packages the bundle itself loads. */
  topLevelPackages: Set<string>;
  /** Native packages whose installed files do not run on Lambda; the Lambda build image installs them again. */
  packagesToInstallForLambda: InstalledPackage[];
};

/** Leaves out the binaries of other platforms, such as the macOS build of a napi-rs package. */
const acceptFor = (architecture: LambdaArchitecture) => (manifest: PackageManifest) =>
  runsOnLambda(manifest, architecture);

export const planLambdaDependencies = async ({
  dependencies,
  architecture
}: {
  dependencies: ResolvedPackageDependency[];
  architecture: LambdaArchitecture;
}): Promise<LambdaDependencyPlan> => {
  const topLevelPackages = new Set(dependencies.map(({ path }) => path));
  const packages = new Map<string, InstalledPackage>();
  await addRuntimeDependencies({ packages, start: [...topLevelPackages], accept: acceptFor(architecture) });

  const needsInstall = async ({ root }: InstalledPackage) =>
    Boolean(await getNativeReason(root)) && !(await isInstalledForLambda(root, architecture));
  const installedPackages = [...packages.values()];
  const decisions = await Promise.all(installedPackages.map(needsInstall));
  const packagesToInstallForLambda = installedPackages.filter((_, index) => decisions[index]);
  return { architecture, packages, topLevelPackages, packagesToInstallForLambda };
};

/**
 * What the plan copies, for the artifact digest: every package's name and version. Locally patched packages change the
 * lockfile or `patches/`, which the digest reads as files.
 */
export const getLambdaDependencyIdentity = (plan: LambdaDependencyPlan) =>
  [...plan.packages.values()].map(({ name, version }) => `${name}@${version}`).toSorted();

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
  const replacements = new Map<string, string>();
  for (const { root, name } of plan.packagesToInstallForLambda) {
    // oxlint-disable-next-line no-await-in-loop -- one lookup per reinstalled package.
    const reinstalledRoot = await findInstalledPackage({
      name,
      fromDirectory: installationPath,
      stopAt: installationPath
    });
    if (!reinstalledRoot) {
      throw new Error(`The Lambda build image did not install ${name}, which this function needs.`);
    }
    replacements.set(root, reinstalledRoot);
  }

  // The graph is read again, so the reinstalled packages bring the dependencies they were installed with.
  const replace = (root: string) => replacements.get(root) ?? root;
  const packages = new Map<string, InstalledPackage>();
  await addRuntimeDependencies({
    packages,
    start: [...plan.topLevelPackages],
    accept: acceptFor(plan.architecture),
    replace,
    stopAt: (root) => (isInside(installationPath, root) ? installationPath : undefined)
  });
  await copyPackageGraph({
    packages,
    topLevelPackages: new Set([...plan.topLevelPackages].map(replace)),
    nodeModulesPath
  });
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
