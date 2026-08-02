import type { PackagingProgressLogger as ProgressLogger, RunDocker, StpBuildpackInput } from '../../runtime-contracts';
import type { CreateBundleOutput } from '../../runtime-contracts';
import { join } from 'node:path';
import { buildJavaArtifactDockerfile } from '../../docker/dockerfiles';
import { transformToUnixPath } from '../../fs/files';
import { outputFile, remove } from 'fs-extra';
import { createTemporaryBuildFile } from '../../fs/temporary-file';
import objectHash from 'object-hash';
import { getBundleDigest, getSourceFiles } from './utils';
import type { JavaLanguageSpecificConfig, SupportedJavaVersion } from '@stacktape/config/deployment-artifacts';
import { DEFAULT_JAVA_VERSION } from '../constants';

type LanguageBundleOutput = Omit<CreateBundleOutput, 'distIndexFilePath'> &
  Partial<Pick<CreateBundleOutput, 'distIndexFilePath'>>;

export const buildJavaArtifact = async ({
  sourcePath,
  distFolderPath,
  javaVersion = DEFAULT_JAVA_VERSION,
  useMaven = false,
  rawEntryfilePath,
  cwd: _cwd,
  additionalDigestInput,
  distIndexFilePath,
  progressLogger,
  existingDigests,
  languageSpecificConfig,
  dockerBuildOutputArchitecture,
  requiresGlibcBinaries,
  runDocker
}: StpBuildpackInput & {
  sourcePath: string;
  javaVersion?: SupportedJavaVersion | undefined;
  useMaven?: boolean | undefined;
  rawEntryfilePath: string;
  distIndexFilePath?: string | undefined;
  progressLogger: ProgressLogger;
  languageSpecificConfig: JavaLanguageSpecificConfig;
  runDocker: RunDocker;
}): Promise<LanguageBundleOutput> => {
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
      ...(distIndexFilePath !== undefined ? { distIndexFilePath } : {}),
      sourceFiles,
      languageSpecificBundleOutput: {
        java: {
          useMaven,
          javaVersion
        }
      }
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: 'Building code' });
  const dockerfilePath = join(distFolderPath, 'Dockerfile');
  const { fileName: initScriptFileName, filePath: stpInitGradlePath } = await createTemporaryBuildFile({
    contents: gradleInitFileContent,
    directoryPath: sourcePath,
    prefix: 'stp-init-',
    suffix: '.gradle'
  });
  const dockerfileContents = buildJavaArtifactDockerfile({
    javaVersion,
    useMaven,
    alpine: !requiresGlibcBinaries,
    initScriptFileName
  });

  let buildResult: { succeeded: true } | { succeeded: false; error: unknown };
  try {
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
        sourcePath
      ],
      { cwd: process.cwd() }
    );
    buildResult = { succeeded: true };
  } catch (error) {
    buildResult = { succeeded: false, error };
  }
  try {
    await remove(stpInitGradlePath);
  } catch (cleanupError) {
    if (buildResult.succeeded) {
      throw cleanupError;
    }
  }
  if ('error' in buildResult) {
    throw buildResult.error;
  }
  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  return {
    ...(distIndexFilePath !== undefined ? { distIndexFilePath } : {}),
    distFolderPath,
    digest,
    outcome: 'bundled' as const,
    sourceFiles,
    languageSpecificBundleOutput: {
      java: {
        useMaven,
        javaVersion
      }
    }
  };
};

// init.gradle file used for gradle task definition used for building deployment artifact
const gradleInitFileContent = `allprojects {
  apply plugin: 'java'
  task stacktapeDist(type: Copy) {
    from compileJava
    from processResources
    into('lib') {
        from configurations.runtimeClasspath
    }
    into "dist"
  }
}
`;
