import { join } from 'node:path';
import { execDocker } from '@shared/utils/docker';
import { buildPythonArtifactDockerfile } from '@shared/utils/dockerfiles';
import { transformToUnixPath } from '@shared/utils/fs-utils';
import { raiseError } from '@shared/utils/misc';
import { outputFile } from 'fs-extra';
import objectHash from 'object-hash';
import { detectPackageManager, getBundleDigest } from './utils';

export const buildPythonArtifact = async ({
  sourcePath,
  distFolderPath,
  pythonVersion,
  rawEntryfilePath,
  cwd,
  additionalDigestInput,
  distIndexFilePath,
  packageManager,
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
  packageManager?: SupportedPythonPackageManager;
  languageSpecificConfig: PyLanguageSpecificConfig;
}): Promise<CreateBundleOutput> => {
  const packageManagerToUse = packageManager || (await detectPackageManager(sourcePath));
  if (!packageManagerToUse) {
    raiseError({
      type: 'PACKAGING',
      message:
        "Failed to detect python package manager to use. Use 'languageSpecificConfig' to set 'packageManager' property. If your project doesn't use standard dependency configuration file name or location, specify 'packageManagerFile' property as well"
    });
  }
  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: 'Building code' });
  const dockerfileContents = buildPythonArtifactDockerfile({
    pythonVersion,
    packageManager: packageManagerToUse,
    minify: languageSpecificConfig?.minify ?? true,
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

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });

  const digest = await getBundleDigest({
    externalDependencies: [],
    cwd,
    additionalDigestInput: objectHash({ additionalDigestInput, dockerBuildOutputArchitecture }),
    languageSpecificConfig,
    rawEntryfilePath
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
      distIndexFilePath,
      sourceFiles: [],
      languageSpecificBundleOutput: {
        py: {
          packageManager: packageManagerToUse,
          pythonVersion
        }
      }
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  return {
    distIndexFilePath,
    distFolderPath,
    digest,
    outcome: 'bundled' as const,
    sourceFiles: [],
    languageSpecificBundleOutput: {
      py: {
        packageManager: packageManagerToUse,
        pythonVersion
      }
    }
  };
};
