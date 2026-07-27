import { join } from 'node:path';
import { getDockerImageDetails } from '@shared/utils/docker';
import { getAllFilesInDir } from '@shared/utils/fs-utils';
import { getDirectoryChecksum, mergeHashes } from '@shared/utils/hashing';
import { execPack } from '@shared/utils/pack-exec';
import objectHash from 'object-hash';
import { EXCLUDE_FROM_CHECKSUM_GLOBS } from './_shared';

export const buildUsingExternalBuildpack = async ({
  builder = 'paketobuildpacks/builder-jammy-base',
  buildpacks,
  sourceDirectoryPath,
  name,
  progressLogger,
  existingDigests,
  cwd,
  dockerBuildOutputArchitecture
}: {
  name: string;
  progressLogger: ProgressLogger;
  cwd: string;
  existingDigests: string[];
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
} & ExternalBuildpackCwImagePackagingProps &
  ExternalBuildpackBjImagePackagingProps): Promise<PackagingOutput> => {
  const absoluteSourceDirectoryPath = join(cwd, sourceDirectoryPath);
  const start = Date.now();

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const dirChecksum = await getDirectoryChecksum({
    absoluteDirectoryPath: absoluteSourceDirectoryPath,
    excludeGlobs: EXCLUDE_FROM_CHECKSUM_GLOBS
  });
  const digest = mergeHashes(
    dirChecksum,
    objectHash({ EXCLUDE_FROM_CHECKSUM_GLOBS, buildpacks, dockerBuildOutputArchitecture })
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

  await progressLogger.startEvent({
    eventType: 'BUILD_IMAGE',
    description: `Building docker image using ${builder} builder.`
  });

  const buildOutput = await execPack({
    cwd: absoluteSourceDirectoryPath,
    args: [
      'build',
      name,
      '--builder',
      builder,
      ...(buildpacks || []).map((buildpack) => ['--buildpack', buildpack]).flat(),
      // JAVA TOOL OPTIONS argument is added to override default JVM metaspace memory limitation calculated by paketo
      // however paketo JVM memory calculator does not work in fargate anyways because it is not able to determine the available memory correctly
      // therefore we are setting this to 512MB which should be good fit in most cases
      // JAVA devs can always override this env variable however they like
      // this should not affect NON-Java images
      '--env',
      'BPE_JAVA_TOOL_OPTIONS=-XX:MaxMetaspaceSize=512M',
      ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : [])
    ]
    // version: '0.22.0'
  });
  const imageDetails = await getDockerImageDetails(name);

  await progressLogger.finishEvent({
    eventType: 'BUILD_IMAGE',
    finalMessage: `Image size: ${imageDetails.size} MB.`
  });

  const allFilesInSourceDir = await getAllFilesInDir(absoluteSourceDirectoryPath, false);

  return {
    outcome: 'bundled',
    size: imageDetails.size,
    digest,
    imageName: name,
    // @todo
    sourceFiles: allFilesInSourceDir.map((path) => ({ path })),
    details: { duration: Date.now() - start, buildOutput, ...imageDetails },
    jobName: name
  };
};
