import { packagingMessages } from '../../runtime-contracts';
import type {
  CreatePackagingError,
  PackagingProgressLogger as ProgressLogger,
  RunDocker,
  StpBuildpackInput
} from '../../runtime-contracts';
import type { CreateBundleOutput } from '../../runtime-contracts';
import { relative } from 'node:path';
import { buildGoArtifactDockerfile } from '../../docker/dockerfiles';
import { transformToUnixPath } from '../../fs/files';
import objectHash from 'object-hash';
import { getBundleDigest, getSourceFiles } from './utils';
import type { GoLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import {
  applyArtifactFileSelection,
  assertRequiredArtifactFile,
  mergeExplicitlyIncludedSourceFiles,
  resolveArtifactFileSelection
} from '../../artifact/file-selection';
import { runDockerArtifactBuild } from '../../artifact/docker-artifact-build';

type LanguageBundleOutput = Omit<CreateBundleOutput, 'distIndexFilePath'> &
  Partial<Pick<CreateBundleOutput, 'distIndexFilePath'>>;

export const buildGoArtifact = async ({
  sourcePath,
  artifactSourcePath = sourcePath,
  distFolderPath,
  cwd: _cwd,
  additionalDigestInput,
  distIndexFilePath,
  progressLogger,
  existingDigests,
  rawEntryfilePath,
  languageSpecificConfig,
  requiresGlibcBinaries,
  dockerBuildOutputArchitecture,
  includeFiles,
  excludeFiles,
  createPackagingError,
  runDocker
}: StpBuildpackInput & {
  sourcePath: string;
  artifactSourcePath?: string | undefined;
  distIndexFilePath?: string | undefined;
  progressLogger: ProgressLogger;
  rawEntryfilePath: string;
  languageSpecificConfig?: GoLanguageSpecificConfig | undefined;
  createPackagingError: CreatePackagingError;
  runDocker: RunDocker;
}): Promise<LanguageBundleOutput> => {
  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const artifactFileSelection = await resolveArtifactFileSelection({ cwd: _cwd, includeFiles });
  const digest = await getBundleDigest({
    externalDependencies: [],
    rootPath: sourcePath,
    additionalDigestInput: objectHash({
      additionalDigestInput,
      dockerBuildOutputArchitecture,
      includeFiles,
      excludeFiles,
      explicitlyIncludedFilesDigest: artifactFileSelection.digest
    }),
    languageSpecificConfig,
    rawEntryfilePath
  });
  const sourceFiles = mergeExplicitlyIncludedSourceFiles({
    cwd: _cwd,
    sourceFiles: await getSourceFiles({ rootPath: sourcePath }),
    explicitlyIncludedFiles: artifactFileSelection.explicitlyIncludedFiles
  });
  if (existingDigests.includes(digest)) {
    await progressLogger.finishEvent({
      eventType: 'CALCULATE_CHECKSUM',
      finalMessage: packagingMessages.unchanged
    });
    return {
      digest,
      outcome: 'skipped' as const,
      distFolderPath,
      ...(distIndexFilePath !== undefined ? { distIndexFilePath } : {}),
      sourceFiles,
      languageSpecificBundleOutput: {}
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: 'Building code' });
  const entryfilePathRelative = transformToUnixPath(relative(sourcePath, rawEntryfilePath));
  const artifactSourcePathRelative = transformToUnixPath(relative(sourcePath, artifactSourcePath)) || '.';
  const dockerfileContents = buildGoArtifactDockerfile({
    alpine: !requiresGlibcBinaries,
    entryfilePath: entryfilePathRelative,
    artifactSourcePath: artifactSourcePathRelative
  });
  await runDockerArtifactBuild({
    dockerfileContents,
    sourcePath,
    distFolderPath,
    dockerBuildOutputArchitecture,
    runDocker
  });
  await applyArtifactFileSelection({
    cwd: _cwd,
    outputDirectory: distFolderPath,
    includeFiles,
    excludeFiles,
    explicitlyIncludedFiles: artifactFileSelection.explicitlyIncludedFiles,
    createPackagingError
  });
  await assertRequiredArtifactFile({
    outputDirectory: distFolderPath,
    relativePath: 'bootstrap',
    description: 'Go bootstrap executable',
    createPackagingError
  });
  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  return {
    ...(distIndexFilePath !== undefined ? { distIndexFilePath } : {}),
    distFolderPath,
    digest,
    outcome: 'bundled' as const,
    sourceFiles,
    languageSpecificBundleOutput: {}
  };
};
