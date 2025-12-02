import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { buildDockerImage } from '@shared/utils/docker';
import { getAllFilesInDir } from '@shared/utils/fs-utils';
import { getDirectoryChecksum, mergeHashes } from '@shared/utils/hashing';
import objectHash from 'object-hash';
import { EXCLUDE_FROM_CHECKSUM_GLOBS } from './_shared';

export const buildUsingCustomDockerfile = async ({
  name,
  buildContextPath,
  dockerfilePath,
  progressLogger,
  buildArgs,
  existingDigests,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef
}: {
  name: string;
  progressLogger: ProgressLogger;
  existingDigests: string[];
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
  cacheFromRef?: string;
  cacheToRef?: string;
} & CustomDockerfileCwImagePackagingProps &
  CustomDockerfileBjImagePackagingProps): Promise<PackagingOutput> => {
  const buildArgsObject = {};
  (buildArgs || []).forEach(({ argName, value }) => {
    buildArgsObject[argName] = value;
  });
  const start = Date.now();
  const absoluteBuildContextPath = isAbsolute(buildContextPath)
    ? buildContextPath
    : join(globalStateManager.workingDir, buildContextPath);

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const dirChecksum = await getDirectoryChecksum({
    absoluteDirectoryPath: absoluteBuildContextPath,
    excludeGlobs: EXCLUDE_FROM_CHECKSUM_GLOBS
  });
  const digest = mergeHashes(
    dirChecksum,
    objectHash({ EXCLUDE_FROM_CHECKSUM_GLOBS, buildArgs, dockerBuildOutputArchitecture })
  );
  if (existingDigests.includes(digest)) {
    await progressLogger.finishEvent({
      eventType: 'CALCULATE_CHECKSUM',
      finalMessage: 'Same artifact is already deployed, skipping.'
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
    imageTag: name,
    buildContextPath: absoluteBuildContextPath,
    dockerfilePath,
    buildArgs: buildArgsObject,
    dockerBuildOutputArchitecture,
    cacheFromRef,
    cacheToRef
  });
  await progressLogger.finishEvent({
    eventType: 'BUILD_IMAGE',
    finalMessage: `Image size: ${imageDetails.size} MB.`
  });

  const allFilesInContextPath = await getAllFilesInDir(absoluteBuildContextPath, false);

  return {
    outcome: 'bundled',
    size: imageDetails.size,
    digest,
    imageName: name,
    sourceFiles: allFilesInContextPath.map((path) => ({ path })),
    details: { duration: Date.now() - start },
    jobName: name
  };
};
