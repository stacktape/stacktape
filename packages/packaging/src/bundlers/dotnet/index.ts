import { packagingMessages } from '../../runtime-contracts';
import type {
  CreatePackagingError,
  PackagingProgressLogger as ProgressLogger,
  RunDocker,
  StpBuildpackInput
} from '../../runtime-contracts';
import type { CreateBundleOutput } from '../../runtime-contracts';
import { isAbsolute, join, relative } from 'node:path';
import { buildDotnetArtifactDockerfile, DOTNET_ASSEMBLY_NAME_FILE } from '../../docker/dockerfiles';
import { transformToUnixPath } from '../../fs/files';
import objectHash from 'object-hash';

import { getBundleDigest, getDotnetAssemblyName, getSourceFiles, resolveDotnetProjectFile } from './utils';
import type { DotnetLanguageSpecificConfig, SupportedDotnetVersion } from '@stacktape/config/deployment-artifacts';
import { DEFAULT_DOTNET_VERSION } from '../constants';
import {
  applyArtifactFileSelection,
  assertRequiredArtifactFile,
  mergeExplicitlyIncludedSourceFiles,
  resolveArtifactFileSelection
} from '../../artifact/file-selection';
import { runDockerArtifactBuild } from '../../artifact/docker-artifact-build';
import { findDotnetBuildRoot } from '../../buildpacks/project-root';
import { pathExists, readFile, remove } from 'fs-extra';

type LanguageBundleOutput = Omit<CreateBundleOutput, 'distIndexFilePath'> &
  Partial<Pick<CreateBundleOutput, 'distIndexFilePath'>>;

export const buildDotnetArtifact = async ({
  sourcePath,
  distFolderPath,
  dotnetVersion = DEFAULT_DOTNET_VERSION,
  rawEntryfilePath,
  cwd,
  additionalDigestInput,
  distIndexFilePath,
  progressLogger,
  existingDigests,
  languageSpecificConfig,
  dockerBuildOutputArchitecture,
  includeFiles,
  excludeFiles,
  target = 'container',
  createPackagingError,
  runDocker
}: StpBuildpackInput & {
  sourcePath: string;
  dotnetVersion?: SupportedDotnetVersion | undefined;
  rawEntryfilePath: string;
  distIndexFilePath?: string | undefined;
  progressLogger: ProgressLogger;
  languageSpecificConfig?: DotnetLanguageSpecificConfig | undefined;
  createPackagingError: CreatePackagingError;
  runDocker: RunDocker;
  target?: 'container' | 'lambda' | undefined;
}): Promise<LanguageBundleOutput & { assemblyName?: string }> => {
  const resolvedProjectFile = await resolveDotnetProjectFile({
    rootPath: sourcePath,
    entryfilePath: rawEntryfilePath,
    projectFile: languageSpecificConfig?.projectFile
      ? isAbsolute(languageSpecificConfig.projectFile)
        ? languageSpecificConfig.projectFile
        : join(cwd, languageSpecificConfig.projectFile)
      : undefined
  });
  if (!resolvedProjectFile) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: 'No .csproj file was found for the .NET workload.'
    });
  }

  const buildRootPath = findDotnetBuildRoot({
    cwd,
    projectFile: resolvedProjectFile
  });
  const projectFileRelative = transformToUnixPath(relative(buildRootPath, resolvedProjectFile));
  const fallbackAssemblyName = getDotnetAssemblyName(resolvedProjectFile);

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const artifactFileSelection = await resolveArtifactFileSelection({
    cwd,
    includeFiles
  });
  const digest = await getBundleDigest({
    externalDependencies: [],
    rootPath: buildRootPath,
    additionalDigestInput: objectHash({
      additionalDigestInput,
      dockerBuildOutputArchitecture,
      includeFiles,
      excludeFiles,
      explicitlyIncludedFilesDigest: artifactFileSelection.digest,
      target
    }),
    languageSpecificConfig: {
      ...languageSpecificConfig,
      projectFile: projectFileRelative,
      dotnetVersion
    },
    rawEntryfilePath
  });
  const sourceFiles = mergeExplicitlyIncludedSourceFiles({
    cwd,
    sourceFiles: await getSourceFiles({ rootPath: buildRootPath }),
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
      languageSpecificBundleOutput: { dotnet: { dotnetVersion } },
      assemblyName: fallbackAssemblyName
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({
    eventType: 'BUILD_CODE',
    description: 'Building code'
  });
  const dockerfileContents = buildDotnetArtifactDockerfile({
    dotnetVersion,
    projectFilePath: projectFileRelative,
    target
  });
  await runDockerArtifactBuild({
    dockerfileContents,
    sourcePath: buildRootPath,
    distFolderPath,
    dockerBuildOutputArchitecture,
    runDocker
  });
  const assemblyNameMarkerPath = join(distFolderPath, DOTNET_ASSEMBLY_NAME_FILE);
  const evaluatedAssemblyName = (await pathExists(assemblyNameMarkerPath))
    ? (await readFile(assemblyNameMarkerPath, 'utf8')).trim()
    : fallbackAssemblyName;
  await remove(assemblyNameMarkerPath);
  if (!evaluatedAssemblyName || evaluatedAssemblyName.includes('/') || evaluatedAssemblyName.includes('\\')) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `The .NET project produced an invalid AssemblyName: ${JSON.stringify(evaluatedAssemblyName)}.`
    });
  }
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
    relativePath: `${evaluatedAssemblyName}.dll`,
    description: '.NET assembly',
    createPackagingError
  });
  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  return {
    ...(distIndexFilePath !== undefined ? { distIndexFilePath } : {}),
    distFolderPath,
    digest,
    outcome: 'bundled' as const,
    sourceFiles,
    languageSpecificBundleOutput: { dotnet: { dotnetVersion } },
    assemblyName: evaluatedAssemblyName
  };
};
