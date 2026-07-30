import type {
  CreatePackagingError,
  PackagingProgressLogger as ProgressLogger,
  RunDocker,
  StpBuildpackInput
} from '../../runtime-contracts';
import type { CreateBundleOutput } from '../../runtime-contracts';
import { dirname, join, relative } from 'node:path';
import { buildDotnetArtifactDockerfile } from '../../docker/dockerfiles';
import { transformToUnixPath } from '../../fs/files';
import { outputFile } from 'fs-extra';
import objectHash from 'object-hash';

import { getBundleDigest, getDotnetAssemblyName, getSourceFiles, resolveDotnetProjectFile } from './utils';
import type { DotnetLanguageSpecificConfig, SupportedDotnetVersion } from '@stacktape/config/deployment-artifacts';
import { DEFAULT_DOTNET_VERSION } from '../constants';

type LanguageBundleOutput = Omit<CreateBundleOutput, 'distIndexFilePath'> &
  Partial<Pick<CreateBundleOutput, 'distIndexFilePath'>>;

export const buildDotnetArtifact = async ({
  sourcePath,
  distFolderPath,
  dotnetVersion = DEFAULT_DOTNET_VERSION,
  rawEntryfilePath,
  cwd: _cwd,
  additionalDigestInput,
  distIndexFilePath,
  progressLogger,
  existingDigests,
  languageSpecificConfig,
  dockerBuildOutputArchitecture,
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
}): Promise<LanguageBundleOutput & { assemblyName?: string }> => {
  const resolvedProjectFile = await resolveDotnetProjectFile({
    rootPath: sourcePath,
    entryfilePath: rawEntryfilePath,
    projectFile: languageSpecificConfig?.projectFile
  });
  if (!resolvedProjectFile) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: 'No .csproj file was found for the .NET workload.'
    });
  }

  const projectRootPath = dirname(resolvedProjectFile);
  const projectFileRelative = transformToUnixPath(relative(projectRootPath, resolvedProjectFile));
  const assemblyName = getDotnetAssemblyName(resolvedProjectFile);

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const digest = await getBundleDigest({
    externalDependencies: [],
    rootPath: projectRootPath,
    additionalDigestInput: objectHash({ additionalDigestInput, dockerBuildOutputArchitecture }),
    languageSpecificConfig: {
      ...languageSpecificConfig,
      projectFile: projectFileRelative,
      dotnetVersion
    },
    rawEntryfilePath
  });
  const sourceFiles = await getSourceFiles({ rootPath: projectRootPath });
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
      languageSpecificBundleOutput: { dotnet: { dotnetVersion } },
      assemblyName
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: 'Building code' });
  const dockerfileContents = buildDotnetArtifactDockerfile({
    dotnetVersion,
    projectFilePath: projectFileRelative
  });
  const dockerfilePath = join(distFolderPath, 'Dockerfile');
  await outputFile(dockerfilePath, dockerfileContents);
  await runDocker(
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
      projectRootPath
    ],
    { cwd: process.cwd() }
  );
  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  return {
    ...(distIndexFilePath !== undefined ? { distIndexFilePath } : {}),
    distFolderPath,
    digest,
    outcome: 'bundled' as const,
    sourceFiles,
    languageSpecificBundleOutput: { dotnet: { dotnetVersion } },
    assemblyName
  };
};
