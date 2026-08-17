import type {
  CreatePackagingError,
  PackagingProgressLogger as ProgressLogger,
  RunDocker,
  StpBuildpackInput
} from '../../runtime-contracts';
import type { CreateBundleOutput } from '../../runtime-contracts';
import { buildRubyArtifactDockerfile } from '../../docker/dockerfiles';
import objectHash from 'object-hash';
import { relative } from 'node:path';

import { getBundleDigest, getSourceFiles } from './utils';
import type { RubyLanguageSpecificConfig, SupportedRubyVersion } from '@stacktape/config/deployment-artifacts';
import { DEFAULT_RUBY_VERSION } from '../constants';
import {
  applyArtifactFileSelection,
  assertRequiredArtifactFile,
  mergeExplicitlyIncludedSourceFiles,
  resolveArtifactFileSelection
} from '../../artifact/file-selection';
import { runDockerArtifactBuild } from '../../artifact/docker-artifact-build';

type LanguageBundleOutput = Omit<CreateBundleOutput, 'distIndexFilePath'> &
  Partial<Pick<CreateBundleOutput, 'distIndexFilePath'>>;

export const buildRubyArtifact = async ({
  sourcePath,
  distFolderPath,
  rubyVersion = DEFAULT_RUBY_VERSION,
  rawEntryfilePath,
  cwd: _cwd,
  additionalDigestInput,
  distIndexFilePath,
  progressLogger,
  existingDigests,
  languageSpecificConfig,
  requiresGlibcBinaries,
  dockerBuildOutputArchitecture,
  includeFiles,
  excludeFiles,
  target = 'container',
  createPackagingError,
  runDocker
}: StpBuildpackInput & {
  sourcePath: string;
  rubyVersion?: SupportedRubyVersion | undefined;
  rawEntryfilePath: string;
  distIndexFilePath?: string | undefined;
  progressLogger: ProgressLogger;
  languageSpecificConfig?: RubyLanguageSpecificConfig | undefined;
  target?: 'container' | 'lambda' | undefined;
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
      target,
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
      finalMessage: 'Same artifact is already deployed, skipping.'
    });
    return {
      digest,
      outcome: 'skipped' as const,
      distFolderPath,
      ...(distIndexFilePath !== undefined ? { distIndexFilePath } : {}),
      sourceFiles,
      languageSpecificBundleOutput: { ruby: { rubyVersion } }
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: 'Building code' });
  const dockerfileContents = buildRubyArtifactDockerfile({
    rubyVersion,
    alpine: !requiresGlibcBinaries,
    target
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
    relativePath: relative(sourcePath, rawEntryfilePath),
    description: 'Ruby entrypoint',
    createPackagingError
  });
  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  return {
    ...(distIndexFilePath !== undefined ? { distIndexFilePath } : {}),
    distFolderPath,
    digest,
    outcome: 'bundled' as const,
    sourceFiles,
    languageSpecificBundleOutput: { ruby: { rubyVersion } }
  };
};
