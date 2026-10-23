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
import { realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve as resolvePath, sep } from 'node:path';
import { copy, emptyDir, ensureDir, outputJSON, pathExists, remove, writeFile } from 'fs-extra';
import objectHash from 'object-hash';
import { LAMBDA_ARCHIVE_FORMAT, listArchiveEntries } from '../artifact/archive-entries';
import { getArchiveInventoryChecksum } from '../artifact/hashing';
import { getFolderSizeBytes } from '../fs/files';
import { IGNORED_MODULES } from './config';
import {
  addRuntimeDependencies,
  createPackageAnalysisCache,
  findInstalledPackage,
  getPackageFingerprint,
  getRuntimeDependencyNames,
  planPackageLayout,
  readPackageManifest,
  writePackageLayout,
  type InstalledPackage,
  type PackageAnalysisCache,
  type PackageFileSelection,
  type PackageLayout,
  type PackageManifest,
  type PackageSource
} from './installed-packages';
import {
  declaresPlatform,
  getNativeReason,
  isInstalledForLambda,
  runsOnLambda,
  type LambdaArchitecture
} from './native-packages';

export type RunDocker = (commands: string[]) => Promise<unknown>;

export const getLambdaArchitecture = (dockerBuildOutputArchitecture: DockerBuildOutputArchitecture | undefined) =>
  dockerBuildOutputArchitecture === 'linux/arm64' ? 'arm64' : 'x64';

/** What a function or layer gets beside its bundle, decided before anything is copied. */
export type LambdaDependencyPlan = {
  architecture: LambdaArchitecture;
  /** The packages the bundle leaves out and everything they load, by real directory. */
  packages: Map<string, InstalledPackage>;
  /** Where those packages and the links to them go in the artifact. */
  layout: PackageLayout;
  /** Native packages whose installed files do not run on Lambda; the Lambda build image installs them again. */
  packagesToInstallForLambda: InstalledPackage[];
  /** Names left out wherever they are required, as `excludeDependencies` asks. */
  excludedNames: Set<string>;
  /** Which files of each package the artifact gets. */
  selection: PackageFileSelection;
};

/** Leaves out excluded packages and the binaries of other platforms, such as the macOS build of a napi-rs package. */
const acceptFor =
  ({ architecture, excludedNames }: Pick<LambdaDependencyPlan, 'architecture' | 'excludedNames'>) =>
  (name: string, manifest: PackageManifest) =>
    !excludedNames.has(name) && runsOnLambda(manifest, architecture);

export const planLambdaDependencies = async ({
  dependencies,
  productionDependencies,
  architecture,
  excludedNames = [],
  withoutSourceMaps = false,
  cache = createPackageAnalysisCache()
}: {
  dependencies: ResolvedPackageDependency[];
  /** What a production install of the project contains (`getProductionDependencies`); it decides optional peers. */
  productionDependencies: ReadonlySet<string>;
  architecture: LambdaArchitecture;
  /** Packages that must not be in the artifact, wherever they are required; `IGNORED_MODULES` always. */
  excludedNames?: string[] | undefined;
  /**
   * Leave out the packages' own source maps: the functions run without `--enable-source-maps`, so nothing reads them.
   * Stacktape maps errors with the bundle's maps, which never describe installed packages.
   */
  withoutSourceMaps?: boolean | undefined;
  /** The build's cache when other functions are planned in the same build; a new one otherwise. */
  cache?: PackageAnalysisCache | undefined;
}): Promise<LambdaDependencyPlan> => {
  const excluded = new Set([...IGNORED_MODULES, ...excludedNames]);
  // The real directory, which is what every lookup below returns; on Windows a temporary path may be a short alias.
  const topLevelPackages = new Map(
    await Promise.all(
      dependencies
        .filter(({ name }) => !excluded.has(name))
        .map(async ({ name, path }) => [name, await realpath(path)] as const)
    )
  );
  const accept = acceptFor({ architecture, excludedNames: excluded });
  const packages = new Map<string, InstalledPackage>();
  await addRuntimeDependencies({ packages, start: [...topLevelPackages.values()], productionDependencies, accept });

  const needsInstall = async ({ root }: InstalledPackage) =>
    Boolean(await getNativeReason(root, cache)) && !(await isInstalledForLambda(root, architecture, cache));
  const installedPackages = [...packages.values()];
  const decisions = await Promise.all(installedPackages.map(needsInstall));
  return {
    architecture,
    packages,
    layout: await planPackageLayout({ packages, topLevelPackages }),
    packagesToInstallForLambda: installedPackages.filter((_, index) => decisions[index]),
    excludedNames: excluded,
    selection: { withoutSourceMaps }
  };
};

/**
 * The packages to install again, as installations that each hold one version of a name: two versions of one addon
 * cannot share a `node_modules`. Installations of the same version, such as pnpm's copies with different peers, share
 * one build.
 */
const groupInstallations = (plan: LambdaDependencyPlan): InstalledPackage[][] => {
  const versionsByName = new Map<string, Map<string, InstalledPackage[]>>();
  for (const installedPackage of plan.packagesToInstallForLambda) {
    const versions = versionsByName.get(installedPackage.name) ?? new Map<string, InstalledPackage[]>();
    versions.set(installedPackage.version, [...(versions.get(installedPackage.version) ?? []), installedPackage]);
    versionsByName.set(installedPackage.name, versions);
  }
  const groups: InstalledPackage[][] = [];
  for (const versions of versionsByName.values()) {
    [...versions.keys()].toSorted().forEach((version, index) => {
      groups[index] = [...(groups[index] ?? []), ...versions.get(version)!];
    });
  }
  return groups;
};

/**
 * The `package.json` the Lambda build image installs one group from: its packages at their versions, with every other
 * package they load pinned to the version installed here, so their install scripts build against the same
 * dependencies the artifact gets. A name installed here in two versions is left to npm.
 */
const getInstallationManifest = (plan: LambdaDependencyPlan, group: InstalledPackage[]) => {
  const groupNames = new Set(group.map(({ name }) => name));
  const versionsByName = new Map<string, Set<string>>();
  const pending = group.map(({ root }) => root);
  const visited = new Set<string>();
  while (pending.length > 0) {
    const root = pending.pop()!;
    if (visited.has(root)) continue;
    visited.add(root);
    for (const [name, dependencyRoot] of plan.packages.get(root)?.dependencies ?? []) {
      const dependency = plan.packages.get(dependencyRoot);
      // An npm alias cannot be pinned by its name.
      if (!dependency || dependency.name !== name || groupNames.has(name)) continue;
      versionsByName.set(name, (versionsByName.get(name) ?? new Set()).add(dependency.version));
      pending.push(dependencyRoot);
    }
  }
  const overrides = [...versionsByName]
    .filter(([, versions]) => versions.size === 1)
    .map(([name, [version]]) => [name, version!] as const)
    .toSorted(([left], [right]) => (left < right ? -1 : 1));
  return {
    private: true,
    dependencies: Object.fromEntries(group.map(({ name, version }) => [name, version] as const).toSorted()),
    overrides: Object.fromEntries(overrides)
  };
};

/**
 * What the plan puts in the artifact, for its digest: each package directory's path and file fingerprint, each link,
 * and for packages installed again in the Lambda build image, what the image is asked to install. Nothing in it
 * depends on where the project is on this machine.
 */
export const getLambdaDependencyIdentity = async (plan: LambdaDependencyPlan) => {
  const directories = await Promise.all(
    plan.layout.directories.map(
      async ({ path, root }) => `${path} ${await getPackageFingerprint(root, plan.selection)}`
    )
  );
  return [
    ...(plan.selection.withoutSourceMaps ? ['without-source-maps'] : []),
    ...directories,
    ...plan.layout.links.map(({ path, target }) => `${path} -> ${target}`),
    ...groupInstallations(plan).map((group) => JSON.stringify(getInstallationManifest(plan, group)))
  ];
};

const inProgressInstallations = new Map<string, Promise<string>>();

/**
 * Installs a `package.json` in the Lambda build image and returns the `node_modules` directory it produced. npm runs
 * the packages' install scripts there, which build or download each addon for Lambda's platform. Concurrent requests
 * for the same installation share one Docker build, and a finished installation is reused.
 */
const installInLambdaBuildImage = async ({
  manifest,
  installationRootPath,
  lambdaRuntimeVersion,
  architecture,
  runDocker
}: {
  manifest: Record<string, unknown>;
  installationRootPath: string;
  lambdaRuntimeVersion: number;
  architecture: LambdaArchitecture;
  runDocker: RunDocker;
}): Promise<string> => {
  const platform = architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64';
  const packageJson = `${JSON.stringify(manifest, null, 2)}\n`;
  const dockerfile = `FROM public.ecr.aws/sam/build-nodejs${lambdaRuntimeVersion}.x AS build
WORKDIR /installation
COPY package.json ./
RUN npm install --no-audit --no-fund --no-package-lock

FROM scratch AS artifact
COPY --from=build /installation/node_modules /node_modules`;
  const installationPath = join(resolvePath(installationRootPath), objectHash({ dockerfile, packageJson, platform }));
  const nodeModulesPath = join(installationPath, 'node_modules');

  const existing = inProgressInstallations.get(installationPath);
  if (existing) {
    // A failed installation is evicted below; one whose output was deleted since is run again.
    const finished = await existing.then(
      (path) => pathExists(path),
      () => false
    );
    if (finished) return nodeModulesPath;
  }

  const installation = (async () => {
    await remove(installationPath);
    await ensureDir(installationPath);
    await writeFile(join(installationPath, 'Dockerfile'), dockerfile);
    await writeFile(join(installationPath, 'package.json'), packageJson);
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
    if (inProgressInstallations.get(installationPath) === installation) {
      inProgressInstallations.delete(installationPath);
    }
    throw error;
  }
};

/**
 * The platform packages a reinstalled package gets from the Lambda build image, such as the Linux build of a napi-rs
 * addon and the library it loads: its optional dependencies, and theirs, that are builds for Lambda's platform. Its
 * other dependencies stay the ones installed here.
 */
const findLambdaPlatformPackages = async ({
  installedRoot,
  installationPath,
  plan
}: {
  installedRoot: string;
  installationPath: string;
  plan: LambdaDependencyPlan;
}) => {
  const platformPackages = new Map<string, string>();
  const pending = [installedRoot];
  while (pending.length > 0) {
    const root = pending.pop()!;
    // oxlint-disable-next-line no-await-in-loop -- the walk follows what each package declares, a handful at most.
    for (const name of Object.keys((await readPackageManifest(root)).optionalDependencies ?? {})) {
      if (platformPackages.has(name)) continue;
      // oxlint-disable-next-line no-await-in-loop -- see above.
      const platformRoot = await findInstalledPackage({ name, fromDirectory: root, stopAt: installationPath });
      // oxlint-disable-next-line no-await-in-loop -- see above.
      const manifest = platformRoot && (await readPackageManifest(platformRoot));
      if (!manifest || !declaresPlatform(manifest) || !acceptFor(plan)(name, manifest)) continue;
      platformPackages.set(name, platformRoot);
      pending.push(platformRoot);
    }
  }
  return platformPackages;
};

/**
 * Links the dependencies of each package at the artifact's top level to the installation that package loads, under
 * every name the top level does not hold yet. A framework bundle that inlines a package's JavaScript, as Astro's does
 * with sharp, requires that package's dependencies from the bundle's own directory: sharp asks for its platform build
 * (`@img/sharp-linux-x64`) by a name computed at run time, which only the artifact's top level can answer.
 */
const linkTopLevelPackageDependencies = async ({
  plan,
  artifactRoot
}: {
  plan: LambdaDependencyPlan;
  artifactRoot: string;
}) => {
  const realArtifactRoot = await realpath(artifactRoot);
  // Package names never start with a dot; `.bin` commands and the repeated layout under `.installed` do.
  const topLevelLinks = plan.layout.links.filter(({ path }) => /^node_modules\/[^.]/.test(path));
  const taken = new Set(topLevelLinks.map(({ path }) => path));
  const links: PackageLayout['links'] = [];
  for (const { target } of topLevelLinks) {
    // The written directory: a package installed again in the Lambda build image has its platform builds inside it.
    const packageRoot = join(realArtifactRoot, target);
    // oxlint-disable-next-line no-await-in-loop -- one or two framework runtime packages.
    for (const name of getRuntimeDependencyNames(await readPackageManifest(packageRoot))) {
      const path = `node_modules/${name}`;
      if (taken.has(path)) continue;
      // oxlint-disable-next-line no-await-in-loop -- see above.
      const dependencyRoot = await findInstalledPackage({ name, fromDirectory: packageRoot, stopAt: realArtifactRoot });
      if (!dependencyRoot) continue;
      taken.add(path);
      links.push({ path, target: relative(realArtifactRoot, dependencyRoot).split(sep).join('/') });
    }
  }
  await writePackageLayout({ layout: { directories: [], links }, packages: plan.packages, artifactRoot });
};

/**
 * Writes the plan's packages into the artifact whose `node_modules` is `nodeModulesPath`. A package the plan marks is
 * installed again in the Lambda build image; its files come from there, in the place of each installation of it here,
 * so each keeps its own peers.
 */
export const writeLambdaDependencies = async ({
  plan,
  nodeModulesPath,
  installationRootPath,
  lambdaRuntimeVersion,
  runDocker,
  linkDependenciesAtTopLevel = false
}: {
  plan: LambdaDependencyPlan;
  nodeModulesPath: string;
  installationRootPath: string;
  lambdaRuntimeVersion: number;
  runDocker: RunDocker;
  /** Also link the top-level packages' dependencies at the top level (`linkTopLevelPackageDependencies`). */
  linkDependenciesAtTopLevel?: boolean | undefined;
}) => {
  const sources = new Map<string, PackageSource>();
  for (const group of groupInstallations(plan)) {
    // oxlint-disable-next-line no-await-in-loop -- one Docker build at a time; a group rarely has a second one.
    const installedNodeModulesPath = await installInLambdaBuildImage({
      manifest: getInstallationManifest(plan, group),
      installationRootPath,
      lambdaRuntimeVersion,
      architecture: plan.architecture,
      runDocker
    });
    // oxlint-disable-next-line no-await-in-loop -- see above.
    await Promise.all(
      group.map(async ({ root, name }) => {
        const copyFrom = join(installedNodeModulesPath, ...name.split('/'));
        if (!(await pathExists(join(copyFrom, 'package.json')))) {
          throw new Error(`The Lambda build image did not install ${name}, which this function needs.`);
        }
        const nestedPackages = await findLambdaPlatformPackages({
          installedRoot: copyFrom,
          installationPath: dirname(installedNodeModulesPath),
          plan
        });
        sources.set(root, { copyFrom, nestedPackages });
      })
    );
  }
  await writePackageLayout({
    layout: plan.layout,
    packages: plan.packages,
    artifactRoot: dirname(nodeModulesPath),
    sources,
    selection: plan.selection
  });
  if (linkDependenciesAtTopLevel)
    await linkTopLevelPackageDependencies({ plan, artifactRoot: dirname(nodeModulesPath) });
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
    manifest: {
      private: true,
      dependencies: Object.fromEntries(dependencies.map(({ name, version }) => [name, version]))
    },
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
