import { packagingMessages } from '../runtime-contracts';
import type {
  BuildDockerImage,
  CheckDockerImageExists,
  DockerImageInspectionActions,
  EsBuildActions,
  ImageBuildActions,
  PackagingProgressLogger as ProgressLogger,
  StpBuildpackInput
} from '../runtime-contracts';
import type { LanguageSpecificBundleOutput, PackagingOutput } from '../runtime-contracts';

import { readdir, readFile } from 'node:fs/promises';
import { basename, join, sep } from 'node:path';
import { buildEsDevDockerfile, buildEsDockerfile } from '../docker/dockerfiles';
import { getFolder } from '../fs/files';
import objectHash from 'object-hash';
import { createEsBundle } from '../bundlers/es';
import type { EsLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import { DEFAULT_CONTAINER_NODE_VERSION } from '../bundlers/constants';
import { getFolderSize } from '../fs/files';
import { buildGeneratedDockerImage } from '../artifact/generated-image-build';

export const buildUsingStacktapeEsImageBuildpack = async ({
  buildDockerImage,
  checkDockerImageExists,
  getDockerImageDetails,
  progressLogger,
  name,
  additionalDigestInput,
  languageSpecificConfig,
  minify,
  nodeTarget,
  requiresGlibcBinaries,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef,
  devMode,
  ...otherProps
}: StpBuildpackInput &
  ImageBuildActions &
  DockerImageInspectionActions &
  EsBuildActions & {
    requiresGlibcBinaries: boolean;
    nodeTarget: string;
    minify: boolean;
    cacheFromRef?: string | undefined;
    cacheToRef?: string | undefined;
    devMode?: boolean | undefined;
  }): Promise<PackagingOutput> => {
  const nodeVersion =
    (languageSpecificConfig as EsLanguageSpecificConfig)?.nodeVersion || DEFAULT_CONTAINER_NODE_VERSION;

  const bundlingOutput = await createEsBundle({
    ...otherProps,
    ...languageSpecificConfig,
    ...((languageSpecificConfig as EsLanguageSpecificConfig)?.disableSourceMaps && { sourceMaps: 'disabled' }),
    externals: [],
    installNonStaticallyBuiltDepsInDocker: false,
    dockerBuildOutputArchitecture,
    name,
    progressLogger,
    additionalDigestInput: objectHash({ languageSpecificConfig, additionalDigestInput }),
    minify: devMode ? false : minify,
    nodeTarget,
    skipDigestCalculation: devMode
  });

  const { outcome, distIndexFilePath, digest, sourceFiles, distFolderPath, ...otherOutputProps } = bundlingOutput;
  const languageSpecificBundleOutput = normalizeLanguageSpecificBundleOutput(
    bundlingOutput.languageSpecificBundleOutput
  );

  if (outcome === 'skipped') {
    return { ...bundlingOutput, size: null, jobName: name };
  }

  const buildContextPath = getFolder(distIndexFilePath);

  // Dev mode: use cached base image with volume mounting
  if (devMode) {
    const { imageName, devBaseImageBuilt } = await buildDevBaseImage({
      buildContextPath,
      languageSpecificBundleOutput,
      requiresGlibcBinaries,
      nodeVersion,
      progressLogger,
      buildDockerImage,
      checkDockerImageExists
    });

    // Get image size for display
    let imageSize: string | null = null;
    try {
      const imageDetails = await getDockerImageDetails(imageName);
      imageSize = `${imageDetails.size} MB`;
    } catch {
      // Ignore errors getting image size
    }

    // Get mounted code size for display
    let mountedCodeSize: string | null = null;
    try {
      if (distFolderPath) {
        const size = await getFolderSize(distFolderPath, 'MB', 2);
        mountedCodeSize = `${size} MB`;
      }
    } catch {
      // Ignore errors getting folder size
    }

    // Set final message for dev mode (include image size if available)
    const baseMessage = devBaseImageBuilt ? 'Built new base dev image' : 'Using cached base dev image';
    const codeMessage = mountedCodeSize ? ` + mounted bundled code (${mountedCodeSize})` : '';
    const devFinalMessage = imageSize ? `${baseMessage} (${imageSize})${codeMessage}` : `${baseMessage}${codeMessage}`;
    await progressLogger.finishEvent({ eventType: 'BUILD_IMAGE', finalMessage: devFinalMessage });

    return {
      outcome: 'bundled',
      imageName,
      size: null,
      digest: 'dev-mode',
      sourceFiles,
      distFolderPath,
      details: { devBaseImageBuilt, imageSize },
      jobName: name
    };
  }

  // Production mode: full Docker build with code baked in
  await progressLogger.startEvent({ eventType: 'CREATE_DOCKERFILE', description: 'Creating Dockerfile' });
  const dockerfileContents = await createEsDockerFile({
    languageSpecificBundleOutput,
    requiresGlibcBinaries,
    customDockerBuildCommands: otherProps.customDockerBuildCommands,
    nodeVersion,
    buildContextPath
  });
  await progressLogger.finishEvent({ eventType: 'CREATE_DOCKERFILE' });

  await progressLogger.startEvent({ eventType: 'BUILD_IMAGE', description: 'Building docker image' });
  const { size, dockerOutput, duration, created } = await buildGeneratedDockerImage({
    dockerfileContents,
    buildDockerImage,
    imageTag: name,
    buildContextPath,
    dockerBuildOutputArchitecture,
    cacheFromRef,
    cacheToRef
  });

  await progressLogger.finishEvent({
    eventType: 'BUILD_IMAGE',
    finalMessage: packagingMessages.containerImage(size)
  });

  return {
    outcome,
    imageName: name,
    size,
    digest,
    sourceFiles,
    details: { ...otherOutputProps, dockerOutput, duration, imageCreated: created },
    jobName: name
  };
};

// Deduplicates concurrent builds of the same dev base image tag.
// When multiple workloads share the same hash, only one docker build runs.
const devBaseImageBuildLocks = new Map<string, Promise<{ imageName: string; devBaseImageBuilt: boolean }>>();

const buildDevBaseImage = async ({
  buildContextPath,
  languageSpecificBundleOutput,
  requiresGlibcBinaries,
  nodeVersion,
  progressLogger,
  buildDockerImage,
  checkDockerImageExists
}: {
  buildContextPath: string;
  languageSpecificBundleOutput: LanguageSpecificBundleOutput;
  requiresGlibcBinaries: boolean;
  nodeVersion: number;
  progressLogger: ProgressLogger;
  buildDockerImage: BuildDockerImage;
  checkDockerImageExists: CheckDockerImageExists;
}): Promise<{ imageName: string; devBaseImageBuilt: boolean }> => {
  const dependencies = languageSpecificBundleOutput.es?.dependenciesToInstallInDocker || [];
  const packageManager = languageSpecificBundleOutput.es?.packageManager ?? 'npm';

  // Create hash for dev base image caching based on deps + config. `layout` names the generated
  // Dockerfile's filesystem contract (2 = dependencies at /, below the /app bind mount); bump it
  // whenever that contract changes so cached base images from the old layout are not reused.
  const devImageHash = objectHash({
    dependencies: dependencies.map((d) => ({ name: d.name, version: d.version })),
    packageManager,
    requiresGlibcBinaries,
    nodeVersion,
    layout: 2
  }).slice(0, 12);

  const devBaseImageTag = `stp-dev-base:${devImageHash}`;

  // Check if dev base image already exists locally
  const imageExists = await checkDockerImageExists(devBaseImageTag);

  if (imageExists) {
    return { imageName: devBaseImageTag, devBaseImageBuilt: false };
  }

  // If another workload is already building this exact image, wait for it
  const existingBuild = devBaseImageBuildLocks.get(devBaseImageTag);
  if (existingBuild) {
    return existingBuild;
  }

  const buildPromise = (async () => {
    await progressLogger.startEvent({ eventType: 'BUILD_IMAGE', description: 'Building dev base image' });

    const dockerfileContents = buildEsDevDockerfile({
      dependencies,
      packageManager,
      requiresGlibcBinaries,
      nodeVersion
    });

    await buildGeneratedDockerImage({
      dockerfileContents,
      buildDockerImage,
      imageTag: devBaseImageTag,
      buildContextPath
    });

    await progressLogger.finishEvent({ eventType: 'BUILD_IMAGE', finalMessage: 'Dev base image built.' });

    return { imageName: devBaseImageTag, devBaseImageBuilt: true };
  })();

  devBaseImageBuildLocks.set(devBaseImageTag, buildPromise);

  try {
    return await buildPromise;
  } finally {
    devBaseImageBuildLocks.delete(devBaseImageTag);
  }
};

/**
 * What each package manager reads in the directory it installs into, besides the dependencies it is told to install:
 * manifests, lockfiles, configuration, hooks and installed modules. Prisma's client install script also reads the
 * schema there. The lifecycle policy replaces a bundled `pnpm-workspace.yaml` before the install, but copying the
 * bundle after the install would put it back over the policy. Bun migrates npm, Yarn and pnpm lockfiles.
 */
const INSTALL_INPUTS = {
  npm: new Set(['.npmrc', 'package-lock.json', 'npm-shrinkwrap.json', 'node_modules', 'schema.prisma', 'prisma']),
  pnpm: new Set([
    '.npmrc',
    '.pnpmfile.cjs',
    '.pnpmfile.mjs',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'package.json5',
    'package.yaml',
    'node_modules',
    'schema.prisma',
    'prisma'
  ]),
  bun: new Set([
    '.npmrc',
    'bunfig.toml',
    'bun.lock',
    'bun.lockb',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'node_modules',
    'schema.prisma',
    'prisma'
  ])
};
const PNPM_MANIFESTS = new Set(['package.json', 'package.json5', 'package.yaml']);
/** The environment files Bun loads for an install, which can set its registry and its install scripts' environment. */
const BUN_ENV_FILE = /^\.env(\..+)?$/;

/**
 * Whether the bundle has a manifest below its root. Before each lifecycle script, pnpm treats every manifest below the
 * project as a workspace project, and installs again when one is new.
 */
const hasNestedManifest = async (buildContextPath: string) =>
  (await readdir(buildContextPath, { recursive: true })).some(
    (path) => path.includes(sep) && PNPM_MANIFESTS.has(basename(path))
  );

/**
 * How the image's install can run without the bundle's source: from the bundle's generated `package.json`, which the
 * package manager extends into the runtime manifest, or from nothing when there is none. `undefined` when the bundle
 * holds anything else the install reads, such as a user manifest brought in with `includeFiles`; that install keeps
 * running beside the whole bundle.
 */
const getIndependentInstall = async (buildContextPath: string, packageManager: keyof typeof INSTALL_INPUTS) => {
  const entries = await readdir(buildContextPath);
  if (entries.some((entry) => INSTALL_INPUTS[packageManager].has(entry))) return undefined;
  if (packageManager === 'pnpm' && (await hasNestedManifest(buildContextPath))) return undefined;
  if (packageManager === 'bun' && entries.some((entry) => BUN_ENV_FILE.test(entry))) return undefined;
  if (!entries.includes('package.json')) return { manifest: false };
  try {
    const manifest = JSON.parse(await readFile(join(buildContextPath, 'package.json'), 'utf8'));
    return JSON.stringify(manifest) === JSON.stringify({ type: 'module' }) ? { manifest: true } : undefined;
  } catch {
    return undefined;
  }
};

const createEsDockerFile = async ({
  languageSpecificBundleOutput,
  requiresGlibcBinaries = false,
  customDockerBuildCommands,
  nodeVersion,
  buildContextPath
}: {
  languageSpecificBundleOutput: LanguageSpecificBundleOutput;
  requiresGlibcBinaries: boolean;
  customDockerBuildCommands?: string[] | undefined;
  nodeVersion: number;
  buildContextPath: string;
}) => {
  const dependencies = languageSpecificBundleOutput.es?.dependenciesToInstallInDocker ?? [];
  const packageManager = languageSpecificBundleOutput.es?.packageManager ?? 'npm';
  return buildEsDockerfile({
    dependencies,
    packageManager,
    requiresGlibcBinaries,
    customDockerBuildCommands,
    nodeVersion,
    // Only an npm, pnpm or Bun install of external dependencies can run without the source; others ignore the bundle.
    installBeforeSource:
      (packageManager === 'npm' || packageManager === 'pnpm' || packageManager === 'bun') && dependencies.length > 0
        ? await getIndependentInstall(buildContextPath, packageManager)
        : undefined
  });
};

const normalizeLanguageSpecificBundleOutput = ({
  es
}: {
  es: {
    dependenciesToInstallInDocker?: NonNullable<LanguageSpecificBundleOutput['es']>['dependenciesToInstallInDocker'];
    packageManager?: NonNullable<LanguageSpecificBundleOutput['es']>['packageManager'] | null;
    dynamicallyImportedModules?: NonNullable<LanguageSpecificBundleOutput['es']>['dynamicallyImportedModules'];
  };
}): LanguageSpecificBundleOutput => ({
  es: {
    ...(es.dependenciesToInstallInDocker !== undefined
      ? { dependenciesToInstallInDocker: es.dependenciesToInstallInDocker }
      : {}),
    ...(es.dynamicallyImportedModules !== undefined
      ? { dynamicallyImportedModules: es.dynamicallyImportedModules }
      : {}),
    ...(es.packageManager !== null && es.packageManager !== undefined ? { packageManager: es.packageManager } : {})
  }
});
