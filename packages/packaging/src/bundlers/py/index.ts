import type { CreatePackagingError, RunDocker, StpBuildpackInput } from '../../runtime-contracts';
import type { CreateBundleOutput } from '../../runtime-contracts';
import { relative } from 'node:path';
import { buildPythonArtifactDockerfile } from '../../docker/dockerfiles';
import { transformToUnixPath } from '../../fs/files';
import objectHash from 'object-hash';
import {
  getBundleDigest,
  getPythonDependencyFileType,
  getPythonDependencyRootPath,
  getPythonUvDependencySelectorBuildArgs,
  getSourceFiles,
  resolvePythonDependencyFile
} from './utils';
import type { PyLanguageSpecificConfig, SupportedPythonVersion } from '@stacktape/config/deployment-artifacts';
import {
  applyArtifactFileSelection,
  assertRequiredArtifactFile,
  mergeExplicitlyIncludedSourceFiles,
  resolveArtifactFileSelection
} from '../../artifact/file-selection';
import { runDockerArtifactBuild } from '../../artifact/docker-artifact-build';

type LanguageBundleOutput = Omit<CreateBundleOutput, 'distIndexFilePath'> &
  Partial<Pick<CreateBundleOutput, 'distIndexFilePath'>>;

export const buildPythonArtifact = async ({
  sourcePath,
  distFolderPath,
  pythonVersion,
  rawEntryfilePath,
  cwd,
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
  pythonVersion: SupportedPythonVersion;
  rawEntryfilePath: string;
  distIndexFilePath?: string | undefined;
  languageSpecificConfig: PyLanguageSpecificConfig;
  target?: 'container' | 'lambda' | undefined;
  createPackagingError: CreatePackagingError;
  runDocker: RunDocker;
}): Promise<LanguageBundleOutput> => {
  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  if (languageSpecificConfig?.packageManager && languageSpecificConfig.packageManager !== 'uv') {
    throw createPackagingError({
      type: 'PACKAGING',
      message: 'Only the "uv" package manager is supported for Python.'
    });
  }
  const artifactFileSelection = await resolveArtifactFileSelection({ cwd, includeFiles });
  const dependencyFilePath = await resolvePythonDependencyFile({
    cwd,
    sourcePath,
    packageManagerFile: languageSpecificConfig?.packageManagerFile
  });
  if (!dependencyFilePath && languageSpecificConfig?.packageManagerFile) {
    throw createPackagingError({
      type: 'PACKAGING',
      message:
        "Failed to resolve the python dependency file. Check 'languageSpecificConfig.packageManagerFile' and verify it exists."
    });
  }
  const dependencyRootPath = getPythonDependencyRootPath(dependencyFilePath, sourcePath);
  const dependencyFileType = getPythonDependencyFileType(dependencyFilePath);
  const uvDependencySelectorBuildArgs = getPythonUvDependencySelectorBuildArgs(
    languageSpecificConfig,
    createPackagingError
  );
  if (
    Object.values(uvDependencySelectorBuildArgs).some(Boolean) &&
    dependencyFileType !== 'pyproject' &&
    dependencyFileType !== 'uv-lock'
  ) {
    throw createPackagingError({
      type: 'PACKAGING',
      message:
        'Python uv dependency selectors (uvOptionalDependencies, uvWithGroups, uvWithoutGroups, uvOnlyGroups) require pyproject.toml or uv.lock as the packageManagerFile.'
    });
  }
  const dependencyFilePathRelative = dependencyFilePath
    ? transformToUnixPath(relative(dependencyRootPath, dependencyFilePath))
    : null;
  const digest = await getBundleDigest({
    externalDependencies: [],
    rootPath: dependencyRootPath,
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
    cwd,
    sourceFiles: await getSourceFiles({ rootPath: dependencyRootPath }),
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
      languageSpecificBundleOutput: {
        py: {
          packageManager: 'uv',
          pythonVersion
        }
      }
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: 'Building code' });
  const dockerfileContents = buildPythonArtifactDockerfile({
    pythonVersion,
    minify: languageSpecificConfig?.minify ?? false,
    alpine: !requiresGlibcBinaries,
    target
  });

  await runDockerArtifactBuild({
    dockerfileContents,
    sourcePath: dependencyRootPath,
    distFolderPath,
    dockerBuildOutputArchitecture,
    buildArgs: [
      '--build-arg',
      `STP_PY_DEP_FILE=${dependencyFilePathRelative || ''}`,
      '--build-arg',
      `STP_PY_DEP_TYPE=${dependencyFileType || ''}`,
      '--build-arg',
      `STP_PY_UV_OPTIONAL_DEPENDENCIES=${uvDependencySelectorBuildArgs.optionalDependencies}`,
      '--build-arg',
      `STP_PY_UV_WITH_GROUPS=${uvDependencySelectorBuildArgs.withGroups}`,
      '--build-arg',
      `STP_PY_UV_WITHOUT_GROUPS=${uvDependencySelectorBuildArgs.withoutGroups}`,
      '--build-arg',
      `STP_PY_UV_ONLY_GROUPS=${uvDependencySelectorBuildArgs.onlyGroups}`
    ],
    runDocker
  });
  await applyArtifactFileSelection({
    cwd,
    outputDirectory: distFolderPath,
    includeFiles,
    excludeFiles,
    explicitlyIncludedFiles: artifactFileSelection.explicitlyIncludedFiles,
    createPackagingError
  });
  await assertRequiredArtifactFile({
    outputDirectory: distFolderPath,
    relativePath: transformToUnixPath(relative(dependencyRootPath, rawEntryfilePath)),
    description: 'Python entrypoint',
    createPackagingError
  });
  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  return {
    ...(distIndexFilePath !== undefined ? { distIndexFilePath } : {}),
    distFolderPath,
    digest,
    outcome: 'bundled' as const,
    sourceFiles,
    languageSpecificBundleOutput: {
      py: {
        packageManager: 'uv',
        pythonVersion
      }
    }
  };
};
