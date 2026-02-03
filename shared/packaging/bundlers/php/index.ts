import { join } from 'node:path';
import { execDocker } from '@shared/utils/docker';
import { buildPhpArtifactDockerfile } from '@shared/utils/dockerfiles';
import { transformToUnixPath } from '@shared/utils/fs-utils';
import { outputFile } from 'fs-extra';
import objectHash from 'object-hash';
import { DEFAULT_PHP_VERSION } from '../constants';
import { getBundleDigest, getSourceFiles } from './utils';

export const buildPhpArtifact = async ({
  sourcePath,
  distFolderPath,
  phpVersion = DEFAULT_PHP_VERSION,
  rawEntryfilePath,
  cwd: _cwd,
  additionalDigestInput,
  distIndexFilePath,
  progressLogger,
  existingDigests,
  languageSpecificConfig,
  requiresGlibcBinaries,
  dockerBuildOutputArchitecture
}: StpBuildpackInput & {
  sourcePath: string;
  phpVersion?: SupportedPhpVersion;
  rawEntryfilePath: string;
  distIndexFilePath?: string;
  progressLogger: ProgressLogger;
  languageSpecificConfig?: PhpLanguageSpecificConfig;
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
      languageSpecificBundleOutput: { php: { phpVersion } }
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: 'Building code' });
  const dockerfileContents = buildPhpArtifactDockerfile({
    phpVersion,
    alpine: !requiresGlibcBinaries
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
    languageSpecificBundleOutput: { php: { phpVersion } }
  };
};
