import { join } from 'node:path';
import { DEFAULT_CONTAINER_NODE_VERSION } from '@config';
import { buildDockerImage, checkDockerImageExists, getDockerImageDetails } from '@shared/utils/docker';
import { buildEsDevDockerfile, buildEsDockerfile } from '@shared/utils/dockerfiles';
import { getFolder } from '@shared/utils/fs-utils';
import { outputFile } from 'fs-extra';
import objectHash from 'object-hash';
import { createEsBundle } from './bundlers/es';

export const buildUsingStacktapeEsImageBuildpack = async ({
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
}: StpBuildpackInput & {
  requiresGlibcBinaries: boolean;
  nodeTarget: string;
  minify: boolean;
  cacheFromRef?: string;
  cacheToRef?: string;
  devMode?: boolean;
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

  if (outcome === 'skipped') {
    return { ...bundlingOutput, size: null, jobName: name };
  }

  const buildContextPath = getFolder(distIndexFilePath);

  // Dev mode: use cached base image with volume mounting
  if (devMode) {
    const { imageName, devBaseImageBuilt } = await buildDevBaseImage({
      buildContextPath,
      languageSpecificBundleOutput: bundlingOutput.languageSpecificBundleOutput,
      requiresGlibcBinaries,
      nodeVersion,
      progressLogger
    });

    // Get image size for display
    let imageSize: string | null = null;
    try {
      const imageDetails = await getDockerImageDetails(imageName);
      imageSize = `${imageDetails.size} MB`;
    } catch {
      // Ignore errors getting image size
    }

    // Set final message for dev mode (include image size if available)
    const baseMessage = devBaseImageBuilt ? 'Built new base dev image' : 'Using cached base dev image';
    const devFinalMessage = imageSize ? `${baseMessage} (${imageSize})` : baseMessage;
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
  await createEsDockerFile({
    buildContextPath,
    languageSpecificBundleOutput: bundlingOutput.languageSpecificBundleOutput,
    requiresGlibcBinaries,
    customDockerBuildCommands: otherProps.customDockerBuildCommands,
    nodeVersion
  });
  await progressLogger.finishEvent({ eventType: 'CREATE_DOCKERFILE' });

  await progressLogger.startEvent({ eventType: 'BUILD_IMAGE', description: 'Building docker image' });
  const { size, dockerOutput, duration, created } = await buildDockerImage({
    imageTag: name,
    buildContextPath,
    dockerBuildOutputArchitecture,
    cacheFromRef,
    cacheToRef
  });

  await progressLogger.finishEvent({
    eventType: 'BUILD_IMAGE',
    finalMessage: `Image size: ${size} MB.`
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

const buildDevBaseImage = async ({
  buildContextPath,
  languageSpecificBundleOutput,
  requiresGlibcBinaries,
  nodeVersion,
  progressLogger
}: {
  buildContextPath: string;
  languageSpecificBundleOutput: LanguageSpecificBundleOutput;
  requiresGlibcBinaries: boolean;
  nodeVersion: number;
  progressLogger: ProgressLogger;
}): Promise<{ imageName: string; devBaseImageBuilt: boolean }> => {
  const dependencies = languageSpecificBundleOutput.es?.dependenciesToInstallInDocker || [];
  const packageManager = languageSpecificBundleOutput.es?.packageManager;

  // Create hash for dev base image caching based on deps + config
  const devImageHash = objectHash({
    dependencies: dependencies.map((d) => ({ name: d.name, version: d.version })),
    packageManager,
    requiresGlibcBinaries,
    nodeVersion
  }).slice(0, 12);

  const devBaseImageTag = `stp-dev-base:${devImageHash}`;

  // Check if dev base image already exists locally
  const imageExists = await checkDockerImageExists(devBaseImageTag);

  if (imageExists) {
    return { imageName: devBaseImageTag, devBaseImageBuilt: false };
  }

  // Build the dev base image
  await progressLogger.startEvent({ eventType: 'BUILD_IMAGE', description: 'Building dev base image' });

  const dockerfileContents = buildEsDevDockerfile({
    dependencies,
    packageManager,
    requiresGlibcBinaries,
    nodeVersion
  });

  const dockerfilePath = join(buildContextPath, 'Dockerfile.dev');
  await outputFile(dockerfilePath, dockerfileContents);

  await buildDockerImage({
    imageTag: devBaseImageTag,
    buildContextPath,
    dockerfilePath: 'Dockerfile.dev'
  });

  await progressLogger.finishEvent({ eventType: 'BUILD_IMAGE', finalMessage: 'Dev base image built.' });

  return { imageName: devBaseImageTag, devBaseImageBuilt: true };
};

const createEsDockerFile = async ({
  buildContextPath,
  languageSpecificBundleOutput,
  requiresGlibcBinaries = false,
  customDockerBuildCommands,
  nodeVersion
}: {
  buildContextPath: string;
  languageSpecificBundleOutput: LanguageSpecificBundleOutput;
  requiresGlibcBinaries: boolean;
  customDockerBuildCommands?: string[];
  nodeVersion?: number;
}) => {
  const dockerfileContents = buildEsDockerfile({
    dependencies: languageSpecificBundleOutput.es.dependenciesToInstallInDocker,
    packageManager: languageSpecificBundleOutput.es.packageManager,
    requiresGlibcBinaries,
    customDockerBuildCommands,
    nodeVersion
  });
  const dockerfilePath = join(buildContextPath, 'Dockerfile');
  await outputFile(dockerfilePath, dockerfileContents);
  return { dockerfilePath };
};
