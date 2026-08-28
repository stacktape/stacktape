import { packagingMessages } from '../runtime-contracts';
import type { GetDockerImageDetails, PackagingProgressLogger as ProgressLogger, RunPack } from '../runtime-contracts';
import type { DockerBuildOutputArchitecture, PackagingOutput } from '../runtime-contracts';
import { join } from 'node:path';
import objectHash from 'object-hash';

import type {
  ExternalBuildpackBjImagePackagingProps,
  ExternalBuildpackCwImagePackagingProps
} from '@stacktape/config/deployment-artifacts';
import { mergeHashes } from '../artifact/hashing';
import { getDockerContextChecksum } from '../artifact/docker-context';

export const buildUsingExternalBuildpack = async ({
  builder = 'paketobuildpacks/builder-jammy-base',
  buildpacks,
  sourceDirectoryPath,
  name,
  progressLogger,
  existingDigests,
  cwd,
  dockerBuildOutputArchitecture,
  getDockerImageDetails,
  runPack
}: {
  name: string;
  progressLogger: ProgressLogger;
  cwd: string;
  existingDigests: string[];
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  getDockerImageDetails: GetDockerImageDetails;
  runPack: RunPack;
} & ExternalBuildpackCwImagePackagingProps &
  ExternalBuildpackBjImagePackagingProps): Promise<PackagingOutput> => {
  const absoluteSourceDirectoryPath = join(cwd, sourceDirectoryPath);
  const start = Date.now();

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const { checksum: sourceChecksum, includedFilePaths } = await getDockerContextChecksum({
    absoluteBuildContextPath: absoluteSourceDirectoryPath,
    includeDockerfile: false,
    applyDockerIgnore: false
  });
  const digest = mergeHashes(sourceChecksum, objectHash({ builder, buildpacks, dockerBuildOutputArchitecture }));
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

  await progressLogger.startEvent({
    eventType: 'BUILD_IMAGE',
    description: `Building docker image using ${builder} builder.`
  });

  const buildOutput = await runPack({
    cwd: absoluteSourceDirectoryPath,
    args: [
      'build',
      name,
      '--builder',
      builder,
      ...(buildpacks || []).flatMap((buildpack) => ['--buildpack', buildpack]),
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
    finalMessage: packagingMessages.containerImage(imageDetails.size)
  });

  return {
    outcome: 'bundled',
    size: imageDetails.size,
    digest,
    imageName: name,
    // @todo
    sourceFiles: includedFilePaths.map((path) => ({ path })),
    details: { duration: Date.now() - start, buildOutput, ...imageDetails },
    jobName: name
  };
};
