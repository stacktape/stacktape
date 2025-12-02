import { join } from 'node:path';
import { DEFAULT_CONTAINER_NODE_VERSION } from '@config';
import { buildDockerImage } from '@shared/utils/docker';
import { buildEsDockerfile } from '@shared/utils/dockerfiles';
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
  ...otherProps
}: StpBuildpackInput & {
  requiresGlibcBinaries: boolean;
  nodeTarget: string;
  minify: boolean;
  cacheFromRef?: string;
  cacheToRef?: string;
}): Promise<PackagingOutput> => {
  const bundlingOutput = await createEsBundle({
    ...otherProps,
    ...languageSpecificConfig,
    ...((languageSpecificConfig as EsLanguageSpecificConfig)?.disableSourceMaps && { sourceMaps: 'disabled' }),
    externals: [],
    installNonStaticallyBuiltDepsInDocker: false,
    // probably not necessary since dependencies will not be built using docker (thanks to "installNonStaticallyBuiltDepsInDocker" above)
    // passing just in case
    dockerBuildOutputArchitecture,
    name,
    progressLogger,
    additionalDigestInput: objectHash({ languageSpecificConfig, additionalDigestInput }),
    minify,
    nodeTarget
  });

  const { outcome, distIndexFilePath, digest, sourceFiles, ...otherOutputProps } = bundlingOutput;

  if (outcome === 'skipped') {
    return { ...bundlingOutput, size: null, jobName: name };
  }

  const buildContextPath = getFolder(distIndexFilePath);
  await progressLogger.startEvent({ eventType: 'CREATE_DOCKERFILE', description: 'Creating Dockerfile' });
  await createEsDockerFile({
    buildContextPath,
    languageSpecificBundleOutput: bundlingOutput.languageSpecificBundleOutput,
    requiresGlibcBinaries,
    customDockerBuildCommands: otherProps.customDockerBuildCommands,
    nodeVersion: (languageSpecificConfig as EsLanguageSpecificConfig)?.nodeVersion || DEFAULT_CONTAINER_NODE_VERSION
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
