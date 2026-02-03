import { join, relative } from 'node:path';
import { execDocker } from '@shared/utils/docker';
import { buildGoArtifactDockerfile } from '@shared/utils/dockerfiles';
import { transformToUnixPath } from '@shared/utils/fs-utils';
import { outputFile } from 'fs-extra';
import objectHash from 'object-hash';
import { getBundleDigest, getSourceFiles } from './utils';

export const buildGoArtifact = async ({
  sourcePath,
  distFolderPath,
  cwd: _cwd,
  additionalDigestInput,
  distIndexFilePath,
  progressLogger,
  existingDigests,
  rawEntryfilePath,
  languageSpecificConfig,
  requiresGlibcBinaries,
  dockerBuildOutputArchitecture
}: StpBuildpackInput & {
  sourcePath: string;
  distIndexFilePath?: string;
  progressLogger: ProgressLogger;
  rawEntryfilePath: string;
  languageSpecificConfig?: GoLanguageSpecificConfig;
}): Promise<CreateBundleOutput> => {
  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const digest = await getBundleDigest({
    externalDependencies: [],
    rootPath: sourcePath,
    additionalDigestInput: objectHash({ additionalDigestInput, dockerBuildOutputArchitecture }),
    languageSpecificConfig,
    rawEntryfilePath
  });
  const sourceFiles = await getSourceFiles({ rootPath: sourcePath });
  if (existingDigests.includes(digest)) {
    await progressLogger.finishEvent({
      eventType: 'CALCULATE_CHECKSUM',
      finalMessage: 'Same artifact is already deployed, skipping.'
    });
    return {
      digest,
      outcome: 'skipped' as const,
      distFolderPath,
      distIndexFilePath,
      sourceFiles,
      languageSpecificBundleOutput: {}
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: 'Building code' });
  const entryfilePathRelative = transformToUnixPath(relative(sourcePath, rawEntryfilePath));
  const dockerfileContents = buildGoArtifactDockerfile({
    alpine: !requiresGlibcBinaries,
    entryfilePath: entryfilePathRelative
  });
  const dockerfilePath = join(distFolderPath, 'Dockerfile');
  await outputFile(dockerfilePath, dockerfileContents);
  await execDocker(
    [
      'image',
      'build',
      ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : []),
      '--target',
      'artifact',
      '--file',
      dockerfilePath,
      '--output',
      `type=local,dest=${transformToUnixPath(distFolderPath)}`,
      sourcePath
    ],
    { cwd: process.cwd() }
  );
  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  return {
    distIndexFilePath,
    distFolderPath,
    digest,
    outcome: 'bundled' as const,
    sourceFiles,
    languageSpecificBundleOutput: {}
  };
};
