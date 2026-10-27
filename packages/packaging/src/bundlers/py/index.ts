import { packagingMessages } from '../../runtime-contracts';
import type { CreatePackagingError, PinLocalBaseImage, RunDocker, StpBuildpackInput } from '../../runtime-contracts';
import type { CreateBundleOutput } from '../../runtime-contracts';
import { join, relative } from 'node:path';
import { buildPythonArtifactDockerfile, getPythonArtifactBaseImage } from '../../docker/dockerfiles';
import { transformToUnixPath } from '../../fs/files';
import objectHash from 'object-hash';
import {
  canInstallRequirementsWithoutSource,
  getBundleDigest,
  getPythonDependencyFileType,
  getPythonDependencyRootPath,
  getPythonUvDependencySelectorBuildArgs,
  getSourceFiles,
  resolvePythonDependencyFile
} from './utils';
import type { PythonBuildpackConfig, SupportedPythonVersion } from '@stacktape/config/deployment-artifacts';
import {
  applyArtifactFileSelection,
  assertRequiredArtifactFile,
  mergeExplicitlyIncludedSourceFiles,
  resolveArtifactFileSelection
} from '../../artifact/file-selection';
import { runDockerArtifactBuild } from '../../artifact/docker-artifact-build';
import { pathExists } from 'fs-extra';
import { classifyPythonCompileErrors, describePythonCompileError, takePythonCompileReport } from './compile-check';

type LanguageBundleOutput = Omit<CreateBundleOutput, 'distIndexFilePath'> &
  Partial<Pick<CreateBundleOutput, 'distIndexFilePath'>>;

export const buildPythonArtifact = async ({
  sourcePath,
  distFolderPath,
  pythonVersion,
  rawEntryfilePath,
  cwd,
  additionalDigestInput,
  lambdaZip,
  distIndexFilePath,
  progressLogger,
  existingDigests,
  languageSpecificConfig,
  requiresGlibcBinaries,
  dockerBuildOutputArchitecture,
  includeFiles,
  excludeFiles,
  target = 'lambda',
  createPackagingError,
  runDocker,
  pinLocalBaseImage,
  warn,
  reportSourceFiles
}: StpBuildpackInput & {
  sourcePath: string;
  pythonVersion: SupportedPythonVersion;
  rawEntryfilePath: string;
  distIndexFilePath?: string | undefined;
  languageSpecificConfig?: PythonBuildpackConfig | undefined;
  target?: 'container' | 'lambda' | undefined;
  createPackagingError: CreatePackagingError;
  runDocker: RunDocker;
  pinLocalBaseImage?: PinLocalBaseImage | undefined;
  warn?: ((message: string) => void) | undefined;
}): Promise<LanguageBundleOutput> => {
  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const artifactFileSelection = await resolveArtifactFileSelection({ cwd, includeFiles, lambdaZip });
  const dependencyFilePath = resolvePythonDependencyFile({
    cwd,
    sourcePath,
    packageManagerFile: languageSpecificConfig?.packageManagerFile
  });
  if (!dependencyFilePath && languageSpecificConfig?.packageManagerFile) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: "Failed to resolve the python dependency file. Check 'python.packageManagerFile' and verify it exists."
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
    lambdaZip,
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
  reportSourceFiles?.(sourceFiles);
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
  const alpine = !requiresGlibcBinaries;
  const baseImage = getPythonArtifactBaseImage({ pythonVersion, alpine, target });
  const entryPathInArtifact = transformToUnixPath(relative(dependencyRootPath, rawEntryfilePath));
  const dockerfileContents = buildPythonArtifactDockerfile({
    pythonVersion,
    alpine,
    target,
    baseImage: pinLocalBaseImage
      ? await pinLocalBaseImage({ reference: baseImage, platform: dockerBuildOutputArchitecture })
      : baseImage,
    requirementsWithoutSource: await canInstallRequirementsWithoutSource(dependencyFilePath)
  });

  await runDockerArtifactBuild({
    dockerfileContents,
    sourcePath: dependencyRootPath,
    distFolderPath,
    dockerBuildOutputArchitecture,
    buildArgs: [
      '--build-arg',
      `STP_PY_ENTRY=${entryPathInArtifact}`,
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
  // Taken before the file selection, which could match it; judged after it, which decides what the artifact keeps.
  const compileReport = await takePythonCompileReport(distFolderPath);
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
    relativePath: entryPathInArtifact,
    description: 'Python entrypoint',
    createPackagingError
  });
  if (compileReport) {
    const { blocking, other } = await classifyPythonCompileErrors({
      report: compileReport,
      isPackaged: (file) => pathExists(join(distFolderPath, file))
    });
    const displayPath = (file: string) => transformToUnixPath(relative(cwd, join(dependencyRootPath, file)));
    if (blocking.length) {
      throw createPackagingError({
        type: 'BUILD_CODE',
        message: blocking.map((error) => describePythonCompileError(error, displayPath(error.file))).join('\n'),
        hint: `Python ${pythonVersion} cannot compile these files, which ${transformToUnixPath(relative(cwd, rawEntryfilePath))} imports. Fix them and build again.`
      });
    }
    if (other.length) {
      const listed = other
        .slice(0, 5)
        .map((error) => describePythonCompileError(error, displayPath(error.file), { withCode: false }));
      warn?.(
        `Python ${pythonVersion} cannot compile ${other.length} packaged file${other.length === 1 ? '' : 's'} that ${transformToUnixPath(relative(cwd, rawEntryfilePath))} does not import. The function fails if it loads one; leave such files out with excludeFiles if it never does. ${[...listed, ...(other.length > 5 ? [`and ${other.length - 5} more`] : [])].join('; ')}`
      );
    }
  }
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
