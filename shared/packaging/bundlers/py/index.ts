import { join, relative } from 'node:path';
import { execDocker } from '@shared/utils/docker';
import { buildPythonArtifactDockerfile } from '@shared/utils/dockerfiles';
import { transformToUnixPath } from '@shared/utils/fs-utils';
import { raiseError } from '@shared/utils/misc';
import { outputFile } from 'fs-extra';
import objectHash from 'object-hash';
import {
  getBundleDigest,
  getPythonDependencyFileType,
  getPythonDependencyRootPath,
  getSourceFiles,
  resolvePythonDependencyFile
} from './utils';

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
  dockerBuildOutputArchitecture
}: StpBuildpackInput & {
  sourcePath: string;
  pythonVersion: SupportedPythonVersion;
  rawEntryfilePath: string;
  distIndexFilePath?: string;
  languageSpecificConfig: PyLanguageSpecificConfig;
}): Promise<CreateBundleOutput> => {
  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  if (languageSpecificConfig?.packageManager && languageSpecificConfig.packageManager !== 'uv') {
    raiseError({
      type: 'PACKAGING',
      message: 'Only the "uv" package manager is supported for Python.'
    });
  }
  const dependencyFilePath = await resolvePythonDependencyFile({
    cwd,
    sourcePath,
    packageManagerFile: languageSpecificConfig?.packageManagerFile
  });
  if (!dependencyFilePath && languageSpecificConfig?.packageManagerFile) {
    raiseError({
      type: 'PACKAGING',
      message:
        "Failed to resolve the python dependency file. Check 'languageSpecificConfig.packageManagerFile' and verify it exists."
    });
  }
  const dependencyRootPath = getPythonDependencyRootPath(dependencyFilePath, sourcePath);
  const dependencyFileType = getPythonDependencyFileType(dependencyFilePath);
  if (dependencyFileType === 'uv-lock') {
    raiseError({
      type: 'PACKAGING',
      message: 'uv.lock is not supported as a dependency input. Use pyproject.toml or requirements.txt instead.'
    });
  }
  const dependencyFilePathRelative = dependencyFilePath
    ? transformToUnixPath(relative(dependencyRootPath, dependencyFilePath))
    : null;
  const digest = await getBundleDigest({
    externalDependencies: [],
    rootPath: dependencyRootPath,
    additionalDigestInput: objectHash({ additionalDigestInput, dockerBuildOutputArchitecture }),
    languageSpecificConfig,
    rawEntryfilePath
  });
  const sourceFiles = await getSourceFiles({ rootPath: dependencyRootPath });
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
    alpine: !requiresGlibcBinaries
  });

  const dockerfilePath = join(distFolderPath, 'Dockerfile');
  await outputFile(dockerfilePath, dockerfileContents);
  await execDocker(
    [
      'image',
      'build',
      ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : []),
      '--build-arg',
      `STP_PY_DEP_FILE=${dependencyFilePathRelative || ''}`,
      '--build-arg',
      `STP_PY_DEP_TYPE=${dependencyFileType || ''}`,
      '--target',
      'artifact',
      '--file',
      dockerfilePath,
      '--output',
      `type=local,dest=${transformToUnixPath(distFolderPath)}`,
      dependencyRootPath
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
    languageSpecificBundleOutput: {
      py: {
        packageManager: 'uv',
        pythonVersion
      }
    }
  };
};
