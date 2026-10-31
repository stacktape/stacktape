import { packagingMessages } from '../runtime-contracts';
import type { BuildDockerImage, PackagingProgressLogger as ProgressLogger } from '../runtime-contracts';
import type { DockerBuildOutputArchitecture, PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';

import objectHash from 'object-hash';

import type {
  DockerfileBjImagePackagingProps,
  DockerfileCwImagePackagingProps
} from '@stacktape/config/deployment-artifacts';
import { mergeHashes } from '../artifact/hashing';
import { getDockerContextChecksum } from '../artifact/docker-context';

export const buildUsingDockerfile = async ({
  name,
  localImageName = name,
  cwd,
  buildContextPath,
  dockerfilePath,
  progressLogger,
  buildArgs,
  existingDigests,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef,
  buildDockerImage,
  reportSourceFiles
}: {
  /** Receives the files of the build context before the build runs, so a caller can watch them when it fails. */
  reportSourceFiles?: ((sourceFiles: { path: string }[]) => void) | undefined;
  /** The local image tag the build produces; the job name `name` when not given. */
  localImageName?: string | undefined;
  name: string;
  cwd: string;
  progressLogger: ProgressLogger;
  existingDigests: string[];
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  cacheFromRef?: string | undefined;
  cacheToRef?: string | undefined;
  buildDockerImage: BuildDockerImage;
} & DockerfileCwImagePackagingProps &
  DockerfileBjImagePackagingProps): Promise<PackagingOutput> => {
  const buildArgsObject: Record<string, string> = {};
  (buildArgs || []).forEach(({ argName, value }) => {
    buildArgsObject[argName] = value;
  });
  const start = Date.now();
  const absoluteBuildContextPath = isAbsolute(buildContextPath) ? buildContextPath : join(cwd, buildContextPath);

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const effectiveDockerfilePath = dockerfilePath || 'Dockerfile';
  const { checksum: contextChecksum, includedFilePaths } = await getDockerContextChecksum({
    absoluteBuildContextPath,
    dockerfilePath: effectiveDockerfilePath
  });
  reportSourceFiles?.(includedFilePaths.map((path) => ({ path })));
  const digest = mergeHashes(
    contextChecksum,
    objectHash({
      buildArgs: buildArgsObject,
      dockerBuildOutputArchitecture,
      dockerfilePath: effectiveDockerfilePath.replaceAll('\\', '/')
    })
  );
  if (existingDigests.includes(digest)) {
    await progressLogger.finishEvent({
      eventType: 'CALCULATE_CHECKSUM',
      finalMessage: packagingMessages.unchanged
    });
    return {
      digest,
      outcome: 'skipped' as const,
      details: { duration: Date.now() - start },
      sourceFiles: [],
      size: null,
      jobName: name
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({ eventType: 'BUILD_IMAGE', description: 'Building docker image' });
  const imageDetails = await buildDockerImage({
    imageTag: localImageName,
    buildContextPath: absoluteBuildContextPath,
    dockerfilePath,
    buildArgs: buildArgsObject,
    dockerBuildOutputArchitecture,
    cacheFromRef,
    cacheToRef
  });
  await progressLogger.finishEvent({
    eventType: 'BUILD_IMAGE',
    finalMessage: packagingMessages.containerImage(imageDetails.size)
  });

  return {
    outcome: 'bundled',
    size: imageDetails.size,
    digest,
    imageName: localImageName,
    imageId: imageDetails.id,
    sourceFiles: includedFilePaths.map((path) => ({ path })),
    details: { duration: Date.now() - start },
    jobName: name
  };
};
